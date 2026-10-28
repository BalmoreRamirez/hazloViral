// One-time legacy correction, based on audited storage origins. Default: dry run.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const migration = '2026-10-27-legacy-utc-to-el-salvador-v1';
const zone = 'America/El_Salvador';
const cutoff = '2026-10-27T19:16:20.834Z';
const apply = process.argv.includes('--apply');
const local = expression => `((${expression} AT TIME ZONE 'UTC') AT TIME ZONE '${zone}')`;

async function main() {
  const client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_DATABASE, user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD });
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await client.query("SET LOCAL timezone='America/El_Salvador'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [migration]);
    const ledger = await client.query("SELECT to_regclass('public.app_maintenance_runs') AS name");
    if (ledger.rows[0].name) {
      const prior = await client.query('SELECT report FROM app_maintenance_runs WHERE name=$1', [migration]);
      if (prior.rowCount) { await client.query('ROLLBACK'); console.log(JSON.stringify({ alreadyApplied: true, report: prior.rows[0].report })); return; }
    }
    const plans = [
      { table: 'messages', column: 'read_at', where: `read_at IS NOT NULL AND read_at::date < ($1::timestamptz AT TIME ZONE '${zone}')::date AND ${local('read_at')} >= created_at` },
      { table: 'influencer_metrics', column: 'verified_at', where: `verified_at IS NOT NULL AND updated_at < ($1::timestamptz AT TIME ZONE '${zone}') AND ABS(EXTRACT(EPOCH FROM (${local('verified_at')} - updated_at))) < 300` },
      ...[['email_verification_tokens', 24], ['password_reset_tokens', 1]].map(([table, hours]) => ({ table, column: 'expires_at',
        where: `created_at < ($1::timestamptz AT TIME ZONE '${zone}') AND ABS(EXTRACT(EPOCH FROM (expires_at-created_at)) - ${(hours + 6) * 3600}) < 60` })),
    ];
    const snapshots = [];
    const changes = [];
    for (const plan of plans) {
      const result = await client.query(`SELECT *, ${plan.column}::text AS previous_value, ${local(plan.column)}::text AS corrected_value FROM ${plan.table} WHERE ${plan.where} ORDER BY id FOR UPDATE`, [cutoff]);
      snapshots.push({ table: plan.table, column: plan.column, rows: result.rows });
      changes.push({ table: plan.table, column: plan.column, count: result.rowCount });
    }
    // DTE control number embeds Date.now(); corroborate it against DB-local created_at.
    const dte = await client.query(`SELECT *, to_char(created_at,'YYYY-MM-DD') AS correct_date, to_char(created_at,'HH24:MI:SS') AS correct_time
      FROM dte_documents WHERE ambiente='00' AND estado='BORRADOR' AND numero_control ~ '^DTE-DEV-[0-9]+-[0-9]+$'
      AND ABS(EXTRACT(EPOCH FROM (created_at - (to_timestamp(split_part(numero_control,'-',3)::numeric/1000) AT TIME ZONE '${zone}')))) < 60
      AND (json_original->>'fecha' IS DISTINCT FROM to_char(created_at,'YYYY-MM-DD') OR json_original->>'hora' IS DISTINCT FROM to_char(created_at,'HH24:MI:SS')) FOR UPDATE`);
    snapshots.push({ table: 'dte_documents', column: 'json_original', rows: dte.rows });
    changes.push({ table: 'dte_documents', column: 'json_original.fecha/hora', count: dte.rowCount });
    const inventory = await client.query(`SELECT c.table_name,c.column_name,c.data_type,c.column_default
      FROM information_schema.columns c WHERE table_schema='public' AND data_type LIKE 'timestamp%' ORDER BY table_name,column_name`);
    const report = { migration, zone, cutoff, changes, affected: changes.reduce((sum, item) => sum + item.count, 0),
      preserved: 'DB-generated local timestamps, timestamptz instants, calendar dates and offset-qualified JSON instants remain unchanged.' };
    if (!apply) { await client.query('ROLLBACK'); console.log(JSON.stringify(report, null, 2)); return; }
    const backupDir = path.join(process.cwd(), 'uploads', 'maintenance', `historical-timezone-${randomUUID()}`);
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(backupDir, 'before.json'), JSON.stringify({ report, inventory: inventory.rows, snapshots }, null, 2), { mode: 0o600 });
    for (const plan of plans) {
      const result = await client.query(`UPDATE ${plan.table} SET ${plan.column}=${local(plan.column)} WHERE ${plan.where}`, [cutoff]);
      const expected = changes.find(item => item.table === plan.table).count;
      if (result.rowCount !== expected) throw new Error(`Cambio concurrente: ${plan.table}`);
    }
    for (const document of dte.rows) {
      await client.query(`UPDATE dte_documents SET json_original=json_original || jsonb_build_object('fecha',$1::text,'hora',$2::text) WHERE id=$3`, [document.correct_date, document.correct_time, document.id]);
    }
    // Postconditions: old known-UTC timestamps were converted exactly once.
    for (const snapshot of snapshots.filter(item => item.column !== 'json_original')) {
      for (const previous of snapshot.rows) {
        const result = await client.query(`SELECT ${snapshot.column}::text AS value FROM ${snapshot.table} WHERE id=$1`, [previous.id]);
        if (result.rows[0].value !== previous.corrected_value) throw new Error('Verificación de hora fallida');
      }
    }
    await client.query(`CREATE TABLE IF NOT EXISTS app_maintenance_runs (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now(), backup_path text NOT NULL, report jsonb NOT NULL)`);
    await client.query('INSERT INTO app_maintenance_runs(name,backup_path,report) VALUES ($1,$2,$3)', [migration, backupDir, report]);
    await client.query('COMMIT');
    console.log(JSON.stringify({ ...report, backupDir, applied: true }, null, 2));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

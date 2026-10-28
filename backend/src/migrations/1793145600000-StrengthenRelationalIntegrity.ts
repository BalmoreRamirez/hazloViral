import {
  MigrationInterface,
  QueryRunner,
  TableCheck,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class StrengthenRelationalIntegrity1793145600000 implements MigrationInterface {
  name = 'StrengthenRelationalIntegrity1793145600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM password_reset_tokens t LEFT JOIN users u ON u.id = t.user_id WHERE u.id IS NULL
        ) OR EXISTS (
          SELECT 1 FROM email_verification_tokens t LEFT JOIN users u ON u.id = t.user_id WHERE u.id IS NULL
        ) THEN RAISE EXCEPTION 'Cannot add token user foreign keys: orphan token rows exist'; END IF;

        IF EXISTS (SELECT 1 FROM password_reset_tokens GROUP BY token_hash HAVING COUNT(*) > 1)
          OR EXISTS (SELECT 1 FROM email_verification_tokens GROUP BY token_hash HAVING COUNT(*) > 1)
        THEN RAISE EXCEPTION 'Cannot make token hashes unique: duplicate hashes exist'; END IF;

        IF EXISTS (
          SELECT 1 FROM contratos_escrow c
          WHERE NOT EXISTS (
            SELECT 1 FROM chats h
            WHERE h.id = c.chat_id AND h.empresa_id = c.empresa_id AND h.influencer_id = c.influencer_id
          )
        ) THEN RAISE EXCEPTION 'Cannot enforce contract/chat participants: mismatched contract rows exist'; END IF;

        IF EXISTS (
          SELECT 1 FROM payment_receipts r
          WHERE r.amount_usd < 0
            OR NOT (
              (r.operation_type = 'credits_top_up' AND r.empresa_id IS NOT NULL AND r.influencer_id IS NULL AND r.contrato_id IS NULL)
              OR (r.operation_type IN ('escrow_funding', 'platform_commission', 'influencer_payout')
                  AND r.empresa_id IS NOT NULL AND r.influencer_id IS NOT NULL AND r.contrato_id IS NOT NULL)
            )
        ) THEN RAISE EXCEPTION 'Cannot enforce payment receipt invariants: invalid operation owner or amount rows exist'; END IF;

        IF EXISTS (
          SELECT 1 FROM payment_receipts r LEFT JOIN empresas_profiles e ON e.id = r.empresa_id
          WHERE r.empresa_id IS NOT NULL AND e.id IS NULL
        ) OR EXISTS (
          SELECT 1 FROM payment_receipts r LEFT JOIN influencers_profiles i ON i.id = r.influencer_id
          WHERE r.influencer_id IS NOT NULL AND i.id IS NULL
        ) OR EXISTS (
          SELECT 1 FROM payment_receipts r LEFT JOIN contratos_escrow c
            ON c.id = r.contrato_id AND c.empresa_id = r.empresa_id AND c.influencer_id = r.influencer_id
          WHERE r.contrato_id IS NOT NULL AND c.id IS NULL
        ) THEN RAISE EXCEPTION 'Cannot add payment receipt foreign keys: orphan or mismatched receipt rows exist'; END IF;

        IF EXISTS (
          SELECT 1 FROM dte_documents d LEFT JOIN payment_receipts r ON r.id = d.payment_receipt_id
          WHERE d.payment_receipt_id IS NOT NULL AND r.id IS NULL
        ) THEN RAISE EXCEPTION 'Cannot add DTE receipt foreign key: orphan DTE rows exist'; END IF;
        IF EXISTS (
          SELECT 1 FROM dte_documents WHERE payment_receipt_id IS NOT NULL
          GROUP BY payment_receipt_id HAVING COUNT(*) > 1
        ) THEN RAISE EXCEPTION 'Cannot make DTE receipt relation one-to-one: duplicate receipt references exist'; END IF;
        IF EXISTS (
          SELECT 1 FROM dte_details d LEFT JOIN dte_documents i ON i.id = d.dte_id WHERE i.id IS NULL
        ) THEN RAISE EXCEPTION 'Cannot add DTE detail foreign key: orphan detail rows exist'; END IF;
        IF EXISTS (
          SELECT 1 FROM dte_details GROUP BY dte_id, num_item HAVING COUNT(*) > 1
        ) THEN RAISE EXCEPTION 'Cannot make DTE item numbers unique per document: duplicates exist'; END IF;

        IF EXISTS (
          SELECT 1 FROM contrato_revision_rounds GROUP BY contrato_id, round_number HAVING COUNT(*) > 1
        ) OR EXISTS (SELECT 1 FROM contrato_revision_rounds WHERE round_number <= 0)
        THEN RAISE EXCEPTION 'Cannot enforce revision round uniqueness and positivity: invalid rows exist'; END IF;
        IF EXISTS (SELECT 1 FROM empresa_ratings WHERE estrellas NOT BETWEEN 1 AND 5)
          OR EXISTS (SELECT 1 FROM influencer_ratings WHERE estrellas NOT BETWEEN 1 AND 5)
        THEN RAISE EXCEPTION 'Cannot enforce rating bounds: ratings outside 1..5 exist'; END IF;
        IF EXISTS (SELECT 1 FROM contratos_escrow WHERE monto_total < 0 OR comision_plataforma < 0)
        THEN RAISE EXCEPTION 'Cannot enforce contract amount bounds: negative amounts exist'; END IF;
        IF EXISTS (
          SELECT 1 FROM campaign_briefs
          WHERE presupuesto_min < 0 OR presupuesto_max < 0
            OR (presupuesto_min IS NOT NULL AND presupuesto_max IS NOT NULL AND presupuesto_min > presupuesto_max)
            OR (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_inicio > fecha_fin)
            OR exclusividad_dias < 0
        ) THEN RAISE EXCEPTION 'Cannot enforce campaign brief bounds: invalid budget, date, or exclusivity rows exist'; END IF;
      END $$;
    `);

    await this.ensureUnique(queryRunner, 'chats', 'uq_chat_id_parties', [
      'id',
      'empresa_id',
      'influencer_id',
    ]);
    await this.ensureUnique(
      queryRunner,
      'contratos_escrow',
      'uq_contract_id_parties',
      ['id', 'empresa_id', 'influencer_id'],
    );
    await this.ensureUnique(
      queryRunner,
      'contrato_revision_rounds',
      'uq_contract_revision_round_number',
      ['contrato_id', 'round_number'],
    );
    await this.ensureUnique(
      queryRunner,
      'dte_details',
      'uq_dte_detail_document_item',
      ['dte_id', 'num_item'],
    );
    await queryRunner.query('DROP INDEX IF EXISTS idx_dte_details_document');
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_password_reset_token_hash ON password_reset_tokens (token_hash)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_email_verification_token_hash ON email_verification_tokens (token_hash)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens (user_id)',
    );
    await this.ensureUniqueIndex(
      queryRunner,
      'dte_documents',
      'uq_dte_payment_receipt_id',
      ['payment_receipt_id'],
    );

    await this.ensureCheck(
      queryRunner,
      'contratos_escrow',
      'chk_contract_amount_nonnegative',
      'monto_total >= 0 AND comision_plataforma >= 0',
    );
    await this.ensureCheck(
      queryRunner,
      'payment_receipts',
      'chk_payment_receipt_operation_owner',
      "(operation_type = 'credits_top_up' AND empresa_id IS NOT NULL AND influencer_id IS NULL AND contrato_id IS NULL) OR (operation_type IN ('escrow_funding', 'platform_commission', 'influencer_payout') AND empresa_id IS NOT NULL AND influencer_id IS NOT NULL AND contrato_id IS NOT NULL)",
    );
    await this.ensureCheck(
      queryRunner,
      'payment_receipts',
      'chk_payment_receipt_amount_nonnegative',
      'amount_usd >= 0',
    );
    await this.ensureCheck(
      queryRunner,
      'contrato_revision_rounds',
      'chk_contract_revision_round_positive',
      'round_number > 0',
    );
    await this.ensureCheck(
      queryRunner,
      'empresa_ratings',
      'chk_company_rating_stars',
      'estrellas BETWEEN 1 AND 5',
    );
    await this.ensureCheck(
      queryRunner,
      'influencer_ratings',
      'chk_influencer_rating_stars',
      'estrellas BETWEEN 1 AND 5',
    );
    await this.ensureCheck(
      queryRunner,
      'campaign_briefs',
      'chk_campaign_budget_nonnegative',
      '(presupuesto_min IS NULL OR presupuesto_min >= 0) AND (presupuesto_max IS NULL OR presupuesto_max >= 0)',
    );
    await this.ensureCheck(
      queryRunner,
      'campaign_briefs',
      'chk_campaign_budget_range',
      'presupuesto_min IS NULL OR presupuesto_max IS NULL OR presupuesto_min <= presupuesto_max',
    );
    await this.ensureCheck(
      queryRunner,
      'campaign_briefs',
      'chk_campaign_date_range',
      'fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_inicio <= fecha_fin',
    );
    await this.ensureCheck(
      queryRunner,
      'campaign_briefs',
      'chk_campaign_exclusivity_nonnegative',
      'exclusividad_dias IS NULL OR exclusividad_dias >= 0',
    );

    await this.setForeignKey(
      queryRunner,
      'password_reset_tokens',
      'fk_password_reset_token_user',
      ['user_id'],
      'users',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'email_verification_tokens',
      'fk_email_verification_token_user',
      ['user_id'],
      'users',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'empresas_profiles',
      'fk_company_profile_user',
      ['user_id'],
      'users',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'influencers_profiles',
      'fk_influencer_profile_user',
      ['user_id'],
      'users',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'contratos_escrow',
      'fk_contract_chat_participants',
      ['chat_id', 'empresa_id', 'influencer_id'],
      'chats',
      ['id', 'empresa_id', 'influencer_id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'contrato_revision_rounds',
      'fk_revision_round_contract',
      ['contrato_id'],
      'contratos_escrow',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'contrato_audit_log',
      'fk_contract_audit_log_contract',
      ['contrato_id'],
      'contratos_escrow',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'empresa_ratings',
      'fk_company_rating_company',
      ['empresa_id'],
      'empresas_profiles',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'empresa_ratings',
      'fk_company_rating_influencer',
      ['influencer_id'],
      'influencers_profiles',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'influencer_ratings',
      'fk_influencer_rating_influencer',
      ['influencer_id'],
      'influencers_profiles',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'influencer_ratings',
      'fk_influencer_rating_company',
      ['empresa_id'],
      'empresas_profiles',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'payment_receipts',
      'fk_payment_receipt_company',
      ['empresa_id'],
      'empresas_profiles',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'payment_receipts',
      'fk_payment_receipt_influencer',
      ['influencer_id'],
      'influencers_profiles',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'payment_receipts',
      'fk_payment_receipt_contract_participants',
      ['contrato_id', 'empresa_id', 'influencer_id'],
      'contratos_escrow',
      ['id', 'empresa_id', 'influencer_id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'dte_documents',
      'fk_dte_payment_receipt',
      ['payment_receipt_id'],
      'payment_receipts',
      ['id'],
      'RESTRICT',
    );
    await this.setForeignKey(
      queryRunner,
      'dte_details',
      'fk_dte_detail_document',
      ['dte_id'],
      'dte_documents',
      ['id'],
      'CASCADE',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE campaign_briefs DROP CONSTRAINT IF EXISTS chk_campaign_exclusivity_nonnegative',
    );
    await queryRunner.query(
      'ALTER TABLE campaign_briefs DROP CONSTRAINT IF EXISTS chk_campaign_date_range',
    );
    await queryRunner.query(
      'ALTER TABLE campaign_briefs DROP CONSTRAINT IF EXISTS chk_campaign_budget_range',
    );
    await queryRunner.query(
      'ALTER TABLE campaign_briefs DROP CONSTRAINT IF EXISTS chk_campaign_budget_nonnegative',
    );
    await queryRunner.query(
      'ALTER TABLE influencer_ratings DROP CONSTRAINT IF EXISTS chk_influencer_rating_stars',
    );
    await queryRunner.query(
      'ALTER TABLE empresa_ratings DROP CONSTRAINT IF EXISTS chk_company_rating_stars',
    );
    await queryRunner.query(
      'ALTER TABLE contrato_revision_rounds DROP CONSTRAINT IF EXISTS chk_contract_revision_round_positive',
    );
    await queryRunner.query(
      'ALTER TABLE payment_receipts DROP CONSTRAINT IF EXISTS chk_payment_receipt_amount_nonnegative',
    );
    await queryRunner.query(
      'ALTER TABLE payment_receipts DROP CONSTRAINT IF EXISTS chk_payment_receipt_operation_owner',
    );
    await queryRunner.query(
      'ALTER TABLE contratos_escrow DROP CONSTRAINT IF EXISTS chk_contract_amount_nonnegative',
    );
    await queryRunner.query(
      'ALTER TABLE dte_details DROP CONSTRAINT IF EXISTS uq_dte_detail_document_item',
    );
    await queryRunner.query(
      'ALTER TABLE contrato_revision_rounds DROP CONSTRAINT IF EXISTS uq_contract_revision_round_number',
    );
    await queryRunner.query(
      'ALTER TABLE contratos_escrow DROP CONSTRAINT IF EXISTS uq_contract_id_parties',
    );
    await queryRunner.query(
      'ALTER TABLE chats DROP CONSTRAINT IF EXISTS uq_chat_id_parties',
    );
    await queryRunner.query('DROP INDEX IF EXISTS uq_dte_payment_receipt_id');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_email_verification_tokens_user_id',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_password_reset_tokens_user_id',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_email_verification_token_hash',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_password_reset_token_hash',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_dte_details_document ON dte_details (dte_id, num_item)',
    );

    for (const [table, name] of [
      ['dte_details', 'fk_dte_detail_document'],
      ['dte_documents', 'fk_dte_payment_receipt'],
      ['payment_receipts', 'fk_payment_receipt_contract_participants'],
      ['payment_receipts', 'fk_payment_receipt_influencer'],
      ['payment_receipts', 'fk_payment_receipt_company'],
      ['influencer_ratings', 'fk_influencer_rating_company'],
      ['influencer_ratings', 'fk_influencer_rating_influencer'],
      ['empresa_ratings', 'fk_company_rating_influencer'],
      ['empresa_ratings', 'fk_company_rating_company'],
      ['contrato_audit_log', 'fk_contract_audit_log_contract'],
      ['contrato_revision_rounds', 'fk_revision_round_contract'],
      ['contratos_escrow', 'fk_contract_chat_participants'],
      ['influencers_profiles', 'fk_influencer_profile_user'],
      ['empresas_profiles', 'fk_company_profile_user'],
      ['email_verification_tokens', 'fk_email_verification_token_user'],
      ['password_reset_tokens', 'fk_password_reset_token_user'],
    ] as const) {
      await queryRunner.query(
        `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`,
      );
    }

    await this.setForeignKey(
      queryRunner,
      'contrato_revision_rounds',
      'fk_revision_round_contract',
      ['contrato_id'],
      'contratos_escrow',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'contrato_audit_log',
      'fk_contract_audit_log_contract',
      ['contrato_id'],
      'contratos_escrow',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'empresa_ratings',
      'fk_company_rating_company',
      ['empresa_id'],
      'empresas_profiles',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'empresa_ratings',
      'fk_company_rating_influencer',
      ['influencer_id'],
      'influencers_profiles',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'influencer_ratings',
      'fk_influencer_rating_influencer',
      ['influencer_id'],
      'influencers_profiles',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'influencer_ratings',
      'fk_influencer_rating_company',
      ['empresa_id'],
      'empresas_profiles',
      ['id'],
      'CASCADE',
    );
    await this.setForeignKey(
      queryRunner,
      'empresas_profiles',
      'fk_company_profile_user',
      ['user_id'],
      'users',
      ['id'],
      'NO ACTION',
    );
    await this.setForeignKey(
      queryRunner,
      'influencers_profiles',
      'fk_influencer_profile_user',
      ['user_id'],
      'users',
      ['id'],
      'NO ACTION',
    );
  }

  private async ensureUnique(
    queryRunner: QueryRunner,
    tableName: string,
    name: string,
    columnNames: string[],
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) throw new Error(`Missing table ${tableName}`);
    const exists = table.uniques.some(
      (unique) =>
        unique.name === name ||
        this.sameColumns(unique.columnNames, columnNames),
    );
    if (!exists) {
      await queryRunner.createUniqueConstraint(
        table,
        new TableUnique({ name, columnNames }),
      );
    }
  }

  private async ensureCheck(
    queryRunner: QueryRunner,
    tableName: string,
    name: string,
    expression: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) throw new Error(`Missing table ${tableName}`);
    if (!table.checks.some((check) => check.name === name)) {
      await queryRunner.createCheckConstraint(
        table,
        new TableCheck({ name, expression }),
      );
    }
  }

  private async ensureUniqueIndex(
    queryRunner: QueryRunner,
    tableName: string,
    name: string,
    columnNames: string[],
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) throw new Error(`Missing table ${tableName}`);
    const exists =
      table.indices.some(
        (index) =>
          index.isUnique && this.sameColumns(index.columnNames, columnNames),
      ) ||
      table.uniques.some((unique) =>
        this.sameColumns(unique.columnNames, columnNames),
      );
    if (!exists) {
      await queryRunner.createIndex(
        table,
        new TableIndex({ name, columnNames, isUnique: true }),
      );
    }
  }

  private async setForeignKey(
    queryRunner: QueryRunner,
    tableName: string,
    name: string,
    columnNames: string[],
    referencedTableName: string,
    referencedColumnNames: string[],
    onDelete: string,
  ): Promise<void> {
    let table = await queryRunner.getTable(tableName);
    if (!table) throw new Error(`Missing table ${tableName}`);
    const matching = table.foreignKeys.filter(
      (foreignKey) =>
        this.sameColumns(foreignKey.columnNames, columnNames) &&
        foreignKey.referencedTableName.split('.').at(-1) ===
          referencedTableName &&
        this.sameColumns(
          foreignKey.referencedColumnNames,
          referencedColumnNames,
        ),
    );
    if (
      matching.length === 1 &&
      matching[0].name === name &&
      matching[0].onDelete?.toUpperCase() === onDelete
    )
      return;
    for (const foreignKey of matching)
      await queryRunner.dropForeignKey(table, foreignKey);
    table = (await queryRunner.getTable(tableName))!;
    await queryRunner.createForeignKey(
      table,
      new TableForeignKey({
        name,
        columnNames,
        referencedTableName,
        referencedColumnNames,
        onDelete,
      }),
    );
  }

  private sameColumns(left: string[], right: string[]): boolean {
    return (
      left.length === right.length &&
      left.every((column, index) => column === right[index])
    );
  }
}

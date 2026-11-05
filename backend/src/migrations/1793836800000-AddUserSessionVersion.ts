import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSessionVersion1793836800000 implements MigrationInterface {
  name = 'AddUserSessionVersion1793836800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "session_version"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "last_activity_at"');
  }
}

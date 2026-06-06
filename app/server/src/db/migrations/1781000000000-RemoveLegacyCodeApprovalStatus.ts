import { MigrationInterface, QueryRunner } from 'typeorm';

const LEGACY_CODE_APPROVAL_STATUS = ['awaiting', 'code', 'approval'].join('_');

export class RemoveLegacyCodeApprovalStatus1781000000000 implements MigrationInterface {
  name = 'RemoveLegacyCodeApprovalStatus1781000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "runs"
      SET
        "status" = 'awaiting_final_approval',
        "currentStep" = CASE
          WHEN "currentStep" = '${LEGACY_CODE_APPROVAL_STATUS}'
            THEN 'awaiting_final_approval'
          ELSE "currentStep"
        END
      WHERE "status" = '${LEGACY_CODE_APPROVAL_STATUS}'
    `);

    await queryRunner.query(`
      ALTER TABLE "runs"
      ALTER COLUMN "status" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."runs_status_enum"
      RENAME TO "runs_status_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."runs_status_enum" AS ENUM(
        'queued',
        'running',
        'reference_failed',
        'build_failed',
        'visual_failed',
        'needs_manual_review',
        'completed',
        'failed',
        'awaiting_style_selection',
        'awaiting_reference_approval',
        'awaiting_final_approval'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "runs"
      ALTER COLUMN "status"
      TYPE "public"."runs_status_enum"
      USING "status"::text::"public"."runs_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "runs"
      ALTER COLUMN "status" SET DEFAULT 'queued'
    `);

    await queryRunner.query(`
      DROP TYPE "public"."runs_status_enum_old"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "runs"
      ALTER COLUMN "status" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."runs_status_enum"
      RENAME TO "runs_status_enum_new"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."runs_status_enum" AS ENUM(
        'queued',
        'running',
        'reference_failed',
        'build_failed',
        'visual_failed',
        'needs_manual_review',
        'completed',
        'failed',
        'awaiting_style_selection',
        'awaiting_reference_approval',
        '${LEGACY_CODE_APPROVAL_STATUS}',
        'awaiting_final_approval'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "runs"
      ALTER COLUMN "status"
      TYPE "public"."runs_status_enum"
      USING "status"::text::"public"."runs_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "runs"
      ALTER COLUMN "status" SET DEFAULT 'queued'
    `);

    await queryRunner.query(`
      DROP TYPE "public"."runs_status_enum_new"
    `);
  }
}

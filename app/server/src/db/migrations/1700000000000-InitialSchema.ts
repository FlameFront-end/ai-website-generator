import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ---------- enums ----------

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
        'awaiting_code_approval',
        'awaiting_final_approval'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."run_artifacts_type_enum" AS ENUM(
        'reference_image',
        'reference_block',
        'reference_context_summary',
        'style_variants',
        'style_variant_image',
        'selected_style',
        'code_plan',
        'code_content_module',
        'code_layout_module',
        'code_sections_module',
        'frontend_project',
        'desktop_screenshot',
        'mobile_screenshot',
        'visual_report',
        'diff_image',
        'build_error',
        'build_log',
        'reference_validation'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."run_logs_level_enum" AS ENUM(
        'info',
        'warning',
        'error'
      )
    `);

    // ---------- tables ----------

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "email"         character varying(255)    NOT NULL,
        "password_hash" character varying(255)    NOT NULL,
        "avatar_url"    text,
        "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "runs" (
        "id"           uuid                        NOT NULL DEFAULT uuid_generate_v4(),
        "runNumber"    integer                      NOT NULL,
        "slug"         character varying(32)         NOT NULL,
        "displayName"  character varying(160),
        "isPinned"     boolean                      NOT NULL DEFAULT false,
        "brief"        text                         NOT NULL,
        "status"       "public"."runs_status_enum"  NOT NULL DEFAULT 'queued',
        "currentStep"  character varying(160),
        "score"        integer,
        "errorMessage" text,
        "user_id"      uuid,
        "createdAt"    TIMESTAMP WITH TIME ZONE     NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP WITH TIME ZONE     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_runs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_runs_runNumber" UNIQUE ("runNumber"),
        CONSTRAINT "UQ_runs_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "run_artifacts" (
        "id"        uuid                                NOT NULL DEFAULT uuid_generate_v4(),
        "runId"     uuid                                NOT NULL,
        "type"      "public"."run_artifacts_type_enum"  NOT NULL,
        "path"      text                                NOT NULL,
        "mimeType"  character varying(120),
        "createdAt" TIMESTAMP WITH TIME ZONE            NOT NULL DEFAULT now(),
        CONSTRAINT "PK_run_artifacts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "run_logs" (
        "id"        uuid                              NOT NULL DEFAULT uuid_generate_v4(),
        "runId"     uuid                              NOT NULL,
        "level"     "public"."run_logs_level_enum"    NOT NULL DEFAULT 'info',
        "message"   text                              NOT NULL,
        "metadata"  jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE          NOT NULL DEFAULT now(),
        CONSTRAINT "PK_run_logs" PRIMARY KEY ("id")
      )
    `);

    // ---------- foreign keys ----------

    await queryRunner.query(`
      ALTER TABLE "runs"
        ADD CONSTRAINT "FK_runs_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "run_artifacts"
        ADD CONSTRAINT "FK_run_artifacts_runId"
        FOREIGN KEY ("runId") REFERENCES "runs"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "run_logs"
        ADD CONSTRAINT "FK_run_logs_runId"
        FOREIGN KEY ("runId") REFERENCES "runs"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "run_logs" DROP CONSTRAINT "FK_run_logs_runId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "run_artifacts" DROP CONSTRAINT "FK_run_artifacts_runId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "runs" DROP CONSTRAINT "FK_runs_user_id"`,
    );

    await queryRunner.query(`DROP TABLE "run_logs"`);
    await queryRunner.query(`DROP TABLE "run_artifacts"`);
    await queryRunner.query(`DROP TABLE "runs"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "public"."run_logs_level_enum"`);
    await queryRunner.query(`DROP TYPE "public"."run_artifacts_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."runs_status_enum"`);
  }
}

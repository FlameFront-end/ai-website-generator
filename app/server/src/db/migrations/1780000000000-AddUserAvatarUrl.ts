import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAvatarUrl1780000000000 implements MigrationInterface {
  name = 'AddUserAvatarUrl1780000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "avatar_url" text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "avatar_url"');
  }
}

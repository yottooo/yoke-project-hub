import { MigrationInterface, QueryRunner } from 'typeorm';

// Epic names are unique per project ignoring case. EpicsService checks first for a
// friendly 409; this index stops two concurrent requests that both pass that check.
export class AddEpicNameUnique1794600000000 implements MigrationInterface {
  name = 'AddEpicNameUnique1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_epic_project_name" ON "epic" ("projectId", lower("name"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_epic_project_name"`);
  }
}

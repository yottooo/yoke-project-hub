import { MigrationInterface, QueryRunner } from "typeorm";

// Written by hand: existing tasks keep their column, moved from the old status string to a row.
export class AddStatuses1793286985378 implements MigrationInterface {
    name = 'AddStatuses1793286985378'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "status" ("id" SERIAL NOT NULL, "projectId" integer NOT NULL, "name" character varying(50) NOT NULL, "color" character varying NOT NULL DEFAULT 'slate', "position" double precision NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e12743a7086ec826733f54e1d95" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_14c9897451c5ecc91211a2e873" ON "status" ("projectId") `);
        await queryRunner.query(`ALTER TABLE "status" ADD CONSTRAINT "FK_14c9897451c5ecc91211a2e873d" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Every existing project gets the three columns it had before (see DEFAULT_STATUSES).
        await queryRunner.query(`INSERT INTO "status" ("projectId", "name", "color", "position")
            SELECT "project"."id", "d"."name", "d"."color", "d"."position"
            FROM "project" CROSS JOIN (VALUES ('To do', 'slate', 1000), ('In progress', 'blue', 2000), ('Done', 'green', 3000)) AS "d"("name", "color", "position")`);

        // Point each task at its project's row for its old status.
        await queryRunner.query(`ALTER TABLE "task" ADD "statusId" integer`);
        await queryRunner.query(`UPDATE "task" SET "statusId" = "status"."id"
            FROM "status"
            WHERE "status"."projectId" = "task"."projectId"
              AND "status"."name" = CASE "task"."status" WHEN 'in_progress' THEN 'In progress' WHEN 'done' THEN 'Done' ELSE 'To do' END`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "statusId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE INDEX "IDX_02068239bb8d5b2fc7f3ded618" ON "task" ("statusId") `);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_02068239bb8d5b2fc7f3ded618c" FOREIGN KEY ("statusId") REFERENCES "status"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_02068239bb8d5b2fc7f3ded618c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_02068239bb8d5b2fc7f3ded618"`);

        // Custom columns have no old equivalent; their tasks go back to 'todo'.
        await queryRunner.query(`ALTER TABLE "task" ADD "status" character varying NOT NULL DEFAULT 'todo'`);
        await queryRunner.query(`UPDATE "task" SET "status" = CASE "status"."name" WHEN 'In progress' THEN 'in_progress' WHEN 'Done' THEN 'done' ELSE 'todo' END
            FROM "status"
            WHERE "status"."id" = "task"."statusId"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "statusId"`);

        await queryRunner.query(`ALTER TABLE "status" DROP CONSTRAINT "FK_14c9897451c5ecc91211a2e873d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14c9897451c5ecc91211a2e873"`);
        await queryRunner.query(`DROP TABLE "status"`);
    }

}

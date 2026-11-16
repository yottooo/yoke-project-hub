import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEpics1794593361520 implements MigrationInterface {
    name = 'AddEpics1794593361520'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "epic" ("id" SERIAL NOT NULL, "projectId" integer NOT NULL, "name" character varying(80) NOT NULL, "description" text, "color" character varying NOT NULL DEFAULT 'slate', "startDate" date, "endDate" date, "position" double precision NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1c02d43d72c5150bc888d452397" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_17d0c3c72a6d4b5d106c144d5c" ON "epic" ("projectId") `);
        await queryRunner.query(`ALTER TABLE "task" ADD "epicId" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_6bb3a86bf4d828d74bffa275ce" ON "task" ("epicId") `);
        await queryRunner.query(`ALTER TABLE "epic" ADD CONSTRAINT "FK_17d0c3c72a6d4b5d106c144d5cf" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_6bb3a86bf4d828d74bffa275ced" FOREIGN KEY ("epicId") REFERENCES "epic"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_6bb3a86bf4d828d74bffa275ced"`);
        await queryRunner.query(`ALTER TABLE "epic" DROP CONSTRAINT "FK_17d0c3c72a6d4b5d106c144d5cf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bb3a86bf4d828d74bffa275ce"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "epicId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17d0c3c72a6d4b5d106c144d5c"`);
        await queryRunner.query(`DROP TABLE "epic"`);
    }

}

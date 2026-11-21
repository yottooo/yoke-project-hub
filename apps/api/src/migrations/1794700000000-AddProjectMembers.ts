import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectMembers1794700000000 implements MigrationInterface {
  name = 'AddProjectMembers1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_member" ("projectId" integer NOT NULL, "userId" integer NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'member', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_project_member" PRIMARY KEY ("projectId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_member_userId" ON "project_member" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project_member" ADD CONSTRAINT "FK_project_member_project" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_member" ADD CONSTRAINT "FK_project_member_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Existing projects store their owner as text (the web app sends the user's name, or their
    // email if they have no name). Match it to an account: email first, then name, oldest user
    // first if several share a name.
    await queryRunner.query(`
      INSERT INTO "project_member" ("projectId", "userId", "role")
      SELECT DISTINCT ON (p."id") p."id", u."id", 'owner'
      FROM "project" p
      JOIN "users" u ON u."email" = p."owner" OR u."name" = p."owner"
      ORDER BY p."id", (u."email" = p."owner") DESC, u."id"
    `);

    // A project whose owner text matches no account would be visible to nobody. Give it to
    // the oldest account, so it stays reachable and that owner can share or delete it.
    await queryRunner.query(`
      INSERT INTO "project_member" ("projectId", "userId", "role")
      SELECT p."id", (SELECT "id" FROM "users" ORDER BY "id" LIMIT 1), 'owner'
      FROM "project" p
      WHERE NOT EXISTS (SELECT 1 FROM "project_member" m WHERE m."projectId" = p."id")
        AND EXISTS (SELECT 1 FROM "users")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_member" DROP CONSTRAINT "FK_project_member_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_member" DROP CONSTRAINT "FK_project_member_project"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_project_member_userId"`);
    await queryRunner.query(`DROP TABLE "project_member"`);
  }
}

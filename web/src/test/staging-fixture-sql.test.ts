import { describe, expect, it, vi } from "vitest";
import {
  runStagingFixtureSql,
  STAGING_PROJECT_REF,
  stagingDatabaseEnv,
} from "../../e2e/support/staging-fixture-sql";

const REF = STAGING_PROJECT_REF;
type TestExecPsql = NonNullable<Parameters<typeof runStagingFixtureSql>[2]>;

describe("staging fixture SQL direct connection", () => {
  it("QA-DB-01 exact staging direct host와 username만 PG env로 변환한다", () => {
    expect(stagingDatabaseEnv(
      `postgresql://postgres:p%40ssword@db.${REF}.supabase.co:5432/postgres?sslmode=require`,
    )).toMatchObject({
      PGDATABASE: "postgres",
      PGHOST: `db.${REF}.supabase.co`,
      PGPASSWORD: "p@ssword",
      PGPORT: "5432",
      PGSSLMODE: "require",
      PGUSER: "postgres",
    });
  });

  it("QA-DB-02 exact staging pooler username에서 project ref를 검증한다", () => {
    expect(stagingDatabaseEnv(
      `postgres://postgres.${REF}:secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
    )).toMatchObject({
      PGHOST: "aws-0-ap-northeast-2.pooler.supabase.com",
      PGPORT: "6543",
      PGUSER: `postgres.${REF}`,
    });
  });

  it.each([
    ["타 프로젝트 direct host", "postgres://postgres:secret@db.wrongprojectref.supabase.co:5432/postgres"],
    ["타 프로젝트 pooler username", "postgres://postgres.wrongprojectref:secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"],
    ["임의 host", `postgres://postgres.${REF}:secret@example.com:5432/postgres`],
    ["direct host의 pooler username", `postgres://postgres.${REF}:secret@db.${REF}.supabase.co:5432/postgres`],
    ["다른 database", `postgres://postgres:secret@db.${REF}.supabase.co:5432/template1`],
  ])("QA-DB-03 production·타프로젝트 연결을 거부한다: %s", (_label, url) => {
    expect(() => stagingDatabaseEnv(url)).toThrow(/forbidden/);
  });

  it("QA-DB-04 credentials는 argv가 아닌 PG env, SQL은 stdin으로만 전달한다", () => {
    const execPsql = vi.fn<TestExecPsql>(() => `42\u001fignored\u001e99\u001fignored`);
    const databaseUrl = `postgres://postgres.${REF}:top-secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;
    const sql = "select 42;";

    expect(runStagingFixtureSql(sql, databaseUrl, execPsql)).toBe("42");
    expect(execPsql).toHaveBeenCalledOnce();
    const [file, args, options] = execPsql.mock.calls[0];
    expect(file).toBe("psql");
    expect(args.join(" ")).not.toContain("top-secret");
    expect(args.join(" ")).not.toContain(REF);
    expect(args).toEqual(expect.arrayContaining(["-1", "-f", "-"]));
    expect(args.slice(-2)).toEqual(["-f", "-"]);
    expect(args).toEqual(expect.arrayContaining(["ON_ERROR_STOP=1"]));
    expect(options.input).toBe(sql);
    expect(options.timeout).toBe(45_000);
    expect(options.env).toMatchObject({
      PGPASSWORD: "top-secret",
      PGUSER: `postgres.${REF}`,
      PGOPTIONS: "-c statement_timeout=30000",
    });
  });

  it("QA-DB-05 psql 실패 오류에 URL·password·SQL을 노출하지 않는다", () => {
    const execPsql = vi.fn<TestExecPsql>(() => {
      throw Object.assign(new Error("top-secret select_private_data"), { status: 2 });
    });
    const databaseUrl = `postgres://postgres.${REF}:top-secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

    expect(() => runStagingFixtureSql("select_private_data", databaseUrl, execPsql))
      .toThrow("staging_fixture_psql_failed:2");
    try {
      runStagingFixtureSql("select_private_data", databaseUrl, execPsql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("top-secret");
      expect(message).not.toContain("select_private_data");
      expect(message).not.toContain(REF);
    }
  });
});

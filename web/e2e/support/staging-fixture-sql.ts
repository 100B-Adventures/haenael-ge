import { execFileSync } from "node:child_process";

export const STAGING_PROJECT_REF = "ezzklgotgydwxqebfoys";
const FIELD_SEPARATOR = "\u001f";
const RECORD_SEPARATOR = "\u001e";
const POOLER_HOST = /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/;

type ExecPsql = (
  file: string,
  args: string[],
  options: {
    encoding: "utf8";
    env: NodeJS.ProcessEnv;
    input: string;
    maxBuffer: number;
    stdio: ["pipe", "pipe", "pipe"];
    timeout: number;
  },
) => string;

type StagingPgEnv = Pick<
  NodeJS.ProcessEnv,
  | "PGCONNECT_TIMEOUT"
  | "PGDATABASE"
  | "PGHOST"
  | "PGOPTIONS"
  | "PGPASSWORD"
  | "PGPORT"
  | "PGSSLMODE"
  | "PGUSER"
>;

function decodeUrlPart(value: string, errorCode: string) {
  try {
    const decoded = decodeURIComponent(value);
    const hasControlCharacter = Array.from(decoded).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    });
    if (!decoded || hasControlCharacter) throw new Error(errorCode);
    return decoded;
  } catch {
    throw new Error(errorCode);
  }
}

export function stagingDatabaseEnv(databaseUrl: string): StagingPgEnv {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("staging_database_url_invalid");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("staging_database_protocol_invalid");
  }
  if (url.hash) throw new Error("staging_database_fragment_forbidden");

  const host = url.hostname.toLowerCase();
  const directHost = `db.${STAGING_PROJECT_REF}.supabase.co`;
  const direct = host === directHost;
  const pooler = POOLER_HOST.test(host);
  if (!direct && !pooler) throw new Error("staging_database_host_forbidden");

  const username = decodeUrlPart(url.username, "staging_database_username_invalid");
  const expectedUsername = direct ? "postgres" : `postgres.${STAGING_PROJECT_REF}`;
  if (username !== expectedUsername) throw new Error("staging_database_username_forbidden");

  const password = decodeUrlPart(url.password, "staging_database_password_invalid");
  const database = decodeUrlPart(
    url.pathname.replace(/^\//, ""),
    "staging_database_name_invalid",
  );
  if (database !== "postgres") throw new Error("staging_database_name_forbidden");

  const port = url.port || "5432";
  if (direct ? port !== "5432" : !["5432", "6543"].includes(port)) {
    throw new Error("staging_database_port_forbidden");
  }

  return {
    PGCONNECT_TIMEOUT: "10",
    PGDATABASE: database,
    PGHOST: host,
    PGOPTIONS: "-c statement_timeout=30000",
    PGPASSWORD: password,
    PGPORT: port,
    PGSSLMODE: "require",
    PGUSER: username,
  };
}

const executePsql: ExecPsql = (file, args, options) =>
  execFileSync(file, args, options);

export function runStagingFixtureSql(
  sql: string,
  databaseUrl: string,
  execPsql: ExecPsql = executePsql,
) {
  const pgEnv = stagingDatabaseEnv(databaseUrl);
  let output: string;
  try {
    output = execPsql(
      "psql",
      [
        "-X",
        "-1",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-t",
        "-A",
        "-F",
        FIELD_SEPARATOR,
        "-R",
        RECORD_SEPARATOR,
        "-f",
        "-",
      ],
      {
        encoding: "utf8",
        env: {
          LANG: process.env.LANG ?? "C",
          LC_ALL: "C",
          NODE_ENV: process.env.NODE_ENV ?? "test",
          PATH: process.env.PATH ?? "",
          ...pgEnv,
        },
        input: sql,
        maxBuffer: 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 45_000,
      },
    );
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error
      && typeof error.status === "number"
      ? error.status
      : "unknown";
    throw new Error(`staging_fixture_psql_failed:${status}`);
  }

  const firstRecord = output.split(RECORD_SEPARATOR, 1)[0]?.trim() ?? "";
  return firstRecord.split(FIELD_SEPARATOR, 1)[0] ?? "";
}

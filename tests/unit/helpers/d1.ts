/**
 * D1 stand-in backed by a real in-memory SQLite (node:sqlite), with the repo's migrations applied.
 * Implements the subset of the D1 API the Worker uses: prepare/bind/first/all/run, batch (transactional).
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

type Sqlite = {
  exec(sql: string): void;
  prepare(sql: string): { all(...a: unknown[]): unknown[]; get(...a: unknown[]): unknown; run(...a: unknown[]): { changes: number | bigint } };
};
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Sqlite };

const MIGRATIONS = fileURLToPath(new URL("../../../migrations", import.meta.url));

export function migrationFiles(upTo?: string): string[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !upTo || f <= upTo);
}

class Stmt {
  args: unknown[] = [];
  constructor(
    private db: Sqlite,
    readonly sql: string,
  ) {}
  bind(...a: unknown[]) {
    const s = new Stmt(this.db, this.sql);
    s.args = a.map((x) => (x === undefined ? null : typeof x === "boolean" ? Number(x) : x));
    return s;
  }
  async first<T>(col?: string): Promise<T | null> {
    const row = (this.db.prepare(this.sql).get(...this.args) as Record<string, unknown> | undefined) ?? null;
    if (row && col) return row[col] as T;
    return row ? ({ ...row } as T) : null;
  }
  async all<T>() {
    return { results: this.db.prepare(this.sql).all(...this.args).map((r) => ({ ...(r as object) })) as T[], success: true, meta: {} };
  }
  async run() {
    const trimmed = this.sql.trim().toUpperCase();
    if (trimmed.startsWith("SELECT") || /\bRETURNING\b/.test(trimmed)) {
      const results = this.db.prepare(this.sql).all(...this.args);
      return { results, success: true, meta: { changes: results.length } };
    }
    const r = this.db.prepare(this.sql).run(...this.args);
    return { results: [], success: true, meta: { changes: Number(r.changes) } };
  }
  runSync() {
    const trimmed = this.sql.trim().toUpperCase();
    if (trimmed.startsWith("SELECT") || /\bRETURNING\b/.test(trimmed)) {
      const results = this.db.prepare(this.sql).all(...this.args).map((r) => ({ ...(r as object) }));
      return { results, success: true, meta: { changes: results.length } };
    }
    const r = this.db.prepare(this.sql).run(...this.args);
    return { results: [], success: true, meta: { changes: Number(r.changes) } };
  }
}

export function createD1(opts: { upTo?: string } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const apply = (file: string) => db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  for (const f of migrationFiles(opts.upTo)) apply(f);
  const D1 = {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(stmts: Stmt[]) {
      db.exec("BEGIN");
      try {
        const out = stmts.map((s) => s.runSync());
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async exec(sql: string) {
      db.exec(sql);
    },
  };
  return { D1: D1 as unknown as D1Database, raw: db, apply };
}

export function fakeEnv(extra: Partial<Omit<Env, "APP_ENV">> & { APP_ENV?: string } = {}, opts: { upTo?: string } = {}) {
  const { D1, raw, apply } = createD1(opts);
  const env = { DB: D1, APP_ENV: "development", ASSETS: { fetch: async () => new Response("asset") }, ...extra } as unknown as Env;
  const count = (table: string) => (raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  return { env, raw, apply, count };
}

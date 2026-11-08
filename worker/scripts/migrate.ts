// Columns added after a database was provisioned (deployment spec §3: schema.sql runs once, so later
// columns arrive here). `seed-remote.ts` reads PRAGMA table_info and applies only the missing ones;
// local `npm run seed` reapplies schema.sql, so it never needs this.
export interface ColumnMigration { table: string; column: string; ddl: string }

export const MIGRATIONS: ColumnMigration[] = [
  // urgency-and-readability §4
  { table: 'goals', column: 'decision_at', ddl: 'ALTER TABLE goals ADD COLUMN decision_at TEXT;' },
  { table: 'goals', column: 'decision_date_confirmed', ddl: 'ALTER TABLE goals ADD COLUMN decision_date_confirmed INTEGER NOT NULL DEFAULT 0;' },
  // email-button §2.1
  { table: 'actions', column: 'email_subject', ddl: 'ALTER TABLE actions ADD COLUMN email_subject TEXT;' },
  // email-button §2.2 (the receipts_kind_goal index change is an owner step: DROP INDEX + CREATE INDEX on production).
  { table: 'receipts', column: 'channel', ddl: "ALTER TABLE receipts ADD COLUMN channel TEXT NOT NULL DEFAULT 'call' CHECK (channel = 'call' OR channel = 'email');" },
];

/** The column names a `PRAGMA table_info(<table>)` --json result lists; [] when the table is missing or the output is not JSON. */
export function columnsOf(out: string): string[] {
  const start = out.indexOf('[');
  if (start < 0) return [];
  try {
    const parsed = JSON.parse(out.slice(start)) as { results?: { name?: unknown }[] }[];
    return (parsed[0]?.results ?? []).map((r) => r.name).filter((n): n is string => typeof n === 'string');
  } catch {
    return [];
  }
}

/** The migrations whose column the table lacks; none when the table itself is absent (schema.sql creates it whole). */
export function pending(existing: Record<string, string[]>, migrations = MIGRATIONS): ColumnMigration[] {
  return migrations.filter((m) => existing[m.table]?.length && !existing[m.table].includes(m.column));
}

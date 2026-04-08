export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS cycle_entries (
    id TEXT PRIMARY KEY NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    cycle_day INTEGER NOT NULL,
    phase TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS symptom_logs (
    id TEXT PRIMARY KEY NOT NULL,
    logged_at TEXT NOT NULL,
    mood TEXT,
    energy TEXT,
    tags TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_cycle_entries_start_date
    ON cycle_entries (start_date DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_symptom_logs_logged_at
    ON symptom_logs (logged_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_attempts_created
    ON sync_queue (attempts, created_at ASC);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_entity
    ON sync_queue (entity_type, entity_id);`,
];

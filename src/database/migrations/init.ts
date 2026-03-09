import { SQLiteDatabase } from 'expo-sqlite';

import { schemaStatements } from '@/src/database/schema/tables';

export async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');

  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }
}

import { mysqlPool } from './mysql';

export async function logSystem(level: 'info' | 'warn' | 'error', message: string, context: any = null) {
  try {
    await mysqlPool.query(
      'INSERT INTO system_logs (level, message, context) VALUES (?, ?, ?)',
      [level, message, context ? JSON.stringify(context) : null]
    );
  } catch (err) {
    console.error('[Logger Failure]', err);
  }
}

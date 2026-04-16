/**
 * Global Debug Logger — logs every Supabase API call with payload, response, and errors.
 * Enable/disable via DEBUG_MODE flag or localStorage key 'debug_mode'.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return IS_DEV;
  try {
    return localStorage.getItem('debug_mode') === 'true' || IS_DEV;
  } catch {
    return IS_DEV;
  }
}

export function enableDebug() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('debug_mode', 'true');
    console.log('%c[DEBUG] Debug mode ENABLED', 'color: #22c55e; font-weight: bold;');
  }
}

export function disableDebug() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('debug_mode');
    console.log('%c[DEBUG] Debug mode DISABLED', 'color: #ef4444; font-weight: bold;');
  }
}

type LogLevel = 'info' | 'success' | 'error' | 'warn';

const colors: Record<LogLevel, string> = {
  info: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
  warn: '#f59e0b',
};

function log(level: LogLevel, module: string, action: string, data?: unknown) {
  if (!isDebugEnabled()) return;
  const color = colors[level];
  const prefix = `%c[${module.toUpperCase()}] ${action}`;
  const style = `color: ${color}; font-weight: bold;`;
  if (data !== undefined) {
    console.groupCollapsed(prefix, style);
    console.log(data);
    console.groupEnd();
  } else {
    console.log(prefix, style);
  }
}

/** Log a Supabase DB request before it fires */
export function dbRequest(module: string, operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', table: string, payload?: unknown) {
  log('info', module, `→ ${operation} ${table}`, payload);
}

/** Log a successful Supabase DB response */
export function dbSuccess(module: string, operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', table: string, response?: unknown) {
  log('success', module, `✓ ${operation} ${table} — OK`, response);
}

/** Log a Supabase DB error */
export function dbError(module: string, operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', table: string, error: unknown) {
  log('error', module, `✗ ${operation} ${table} — FAILED`, error);
  // Always log errors regardless of debug mode
  console.error(`[${module.toUpperCase()}] ${operation} ${table} error:`, error);
}

/** Log an auth check */
export function authCheck(module: string, userId: string | null) {
  if (!isDebugEnabled()) return;
  if (userId) {
    log('success', module, `Auth OK — user: ${userId}`);
  } else {
    log('warn', module, 'Auth FAILED — no user session');
  }
}

/** Log a generic action */
export function action(module: string, description: string, data?: unknown) {
  log('info', module, description, data);
}

const debug = { dbRequest, dbSuccess, dbError, authCheck, action, enableDebug, disableDebug };
export default debug;

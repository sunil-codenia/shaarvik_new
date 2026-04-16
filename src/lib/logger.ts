/**
 * Action Logger — writes through the app's MySQL-backed API.
 * Falls back silently if logging is unavailable.
 */

export type LogAction =
  | 'login' |'logout' |'payment_created' |'payment_updated' |'invoice_created' |'invoice_updated' |'subscription_created' |'subscription_updated' |'subscription_cancelled' |'ticket_created' |'ticket_updated' |'ticket_closed' |'staff_created' |'staff_updated' |'role_permissions_updated' |'client_created' |'client_updated' |'lead_created' |'lead_updated';

export interface LogEntry {
  action: LogAction;
  module: string;
  description: string;
  metadata?: Record<string, unknown>;
  user_id?: string;
}

export async function logAction(entry: LogEntry): Promise<void> {
  try {
    await fetch('/api/logs/action', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...entry,
        metadata: entry.metadata ?? {},
      }),
    });
  } catch {
    // Silent fail — logging should never break the app
  }
}

/** Mask sensitive strings — show only first 4 and last 4 chars */
export function maskSensitive(value: string): string {
  if (!value || value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

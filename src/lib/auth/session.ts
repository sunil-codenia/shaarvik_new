const SESSION_COOKIE_NAME = 'cf_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface AppSessionPayload {
  sub: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string | null;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET || 'dev-only-session-secret-change-me';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function signValue(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    stringToBytes(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, stringToBytes(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(
  payload: Omit<AppSessionPayload, 'iat' | 'exp'>
): Promise<string> {
  const now = Date.now();
  const fullPayload: AppSessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_DURATION_MS,
  };

  const encodedPayload = bytesToBase64Url(
    stringToBytes(JSON.stringify(fullPayload))
  );
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<AppSessionPayload | null> {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signValue(encodedPayload);
  if (expectedSignature !== signature) return null;

  try {
    const payload = JSON.parse(
      bytesToString(base64UrlToBytes(encodedPayload))
    ) as AppSessionPayload;

    if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getSessionDurationMs(): number {
  return SESSION_DURATION_MS;
}

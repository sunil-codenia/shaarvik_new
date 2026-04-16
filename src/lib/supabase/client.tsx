import { createBrowserClient } from '@supabase/ssr';

const PFX = 'sb_';

const canUseCookies = (() => {
  let cache: boolean | null = null;
  return () => {
    if (typeof document === 'undefined') return false;
    if (cache !== null) return cache;
    const k = '__sb_test__';
    document.cookie = `${k}=1; Path=/; SameSite=None; Secure; Partitioned`;
    cache = document.cookie.includes(k);
    document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=None; Secure`;
    return cache;
  };
})();

const fromCookies = () =>
  typeof document === 'undefined' ? [] :
  document.cookie.split(';').filter(Boolean).map((c) => {
    const [name, ...rest] = c.trim().split('=');
    return { name: name.trim(), value: decodeURIComponent(rest.join('=')) };
  }).filter((c) => c.name);

const fromStorage = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX))
      .map((k) => ({ name: k.slice(PFX.length), value: localStorage.getItem(k) || '' }));
  } catch { return []; }
};

const setCookie = (name: string, value: string, options?: any) => {
  let s = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=None; Secure; Partitioned`;
  if (options?.maxAge) s += `; Max-Age=${options.maxAge}`;
  if (options?.domain) s += `; Domain=${options.domain}`;
  if (options?.expires) s += `; Expires=${new Date(options.expires).toUTCString()}`;
  document.cookie = s;
};

const getToken = () =>
  (canUseCookies() ? fromCookies() : fromStorage())
    .find((c) => c.name.includes('auth-token'))?.value ?? null;

function createNoopSupabaseClient() {
  const emptyList = Promise.resolve({ data: [], error: null });
  const emptySingle = Promise.resolve({ data: null, error: null });

  const queryBuilder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return emptyList.then.bind(emptyList);
        if (prop === 'catch') return emptyList.catch.bind(emptyList);
        if (prop === 'finally') return emptyList.finally.bind(emptyList);
        if (prop === 'single' || prop === 'maybeSingle' || prop === 'execute') {
          return () => emptySingle;
        }
        return (..._args: any[]) => queryBuilder;
      },
    }
  );

  const channel = () => ({
    on: () => channel(),
    subscribe: () => channel(),
    unsubscribe: () => undefined,
  });

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      exchangeCodeForSession: async () => ({ data: null, error: null }),
      admin: {
        createUser: async () => ({ data: { user: null }, error: null }),
        listUsers: async () => ({ data: { users: [] }, error: null }),
      },
    },
    channel,
    removeChannel: () => undefined,
    from: () => queryBuilder,
    rpc: async () => ({ data: null, error: null }),
  } as any;
}

if (typeof window !== 'undefined' && !(window as any).__sb_patched__) {
  (window as any).__sb_patched__ = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const token = getToken();
    const url = typeof input === 'string' ? input
      : input instanceof URL ? input.href
      : (input as Request).url;
    if (token && (url.startsWith('/') || url.startsWith(window.location.origin))) {
      init = { ...(init || {}), headers: { ...(init?.headers || {}), 'x-sb-token': token } };
    }
    return orig(input, init);
  };
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return createNoopSupabaseClient();
  }

  return createBrowserClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => canUseCookies() ? fromCookies() : fromStorage(),
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          if (typeof document === 'undefined') return;
          if (canUseCookies()) {
            cookiesToSet.forEach(({ name, value, options }) =>
              value ? setCookie(name, value, options)
                    : (document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`)
            );
          } else {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                value ? localStorage.setItem(`${PFX}${name}`, value)
                      : localStorage.removeItem(`${PFX}${name}`);
              } catch {}
              if (value) setCookie(name, value, options);
            });
          }
        },
      },
    }
  );
}

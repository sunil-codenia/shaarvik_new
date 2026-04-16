import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return createNoopSupabaseClient();
  }

  const cookieStore = await cookies();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'none',
                secure: true,
              })
            );
          } catch {
            // Server Component read-only context
          }
        },
      },
    }
  );
}

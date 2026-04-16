import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Internal route used by AI features to fetch the actual API key server-side
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase?.auth?.getUser();
  if (!user) return NextResponse?.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase?.from('ai_settings')?.select('openai_api_key')?.eq('user_id', user?.id)?.single();

  const key = data?.openai_api_key || null;
  return NextResponse?.json({ key });
}

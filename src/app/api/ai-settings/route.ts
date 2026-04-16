import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('ai_settings')
    .select('openai_api_key')
    .eq('user_id', user.id)
    .single();

  const key = data?.openai_api_key || null;
  // Return masked key for display (show only last 4 chars)
  const maskedKey = key ? `sk-...${key.slice(-4)}` : null;
  return NextResponse.json({ hasKey: !!key, maskedKey });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { openai_api_key } = await req.json();
  if (!openai_api_key || typeof openai_api_key !== 'string') {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
  }

  const { error } = await supabase
    .from('ai_settings')
    .upsert({ user_id: user.id, openai_api_key: openai_api_key.trim(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

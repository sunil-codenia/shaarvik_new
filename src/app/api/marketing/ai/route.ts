import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's OpenAI API key from ai_settings
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single();

    const apiKey = settings?.openai_api_key;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please configure it in Settings > AI Configuration.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { model, messages, parameters = {} } = body;

    if (!model || !messages?.length) {
      return NextResponse.json({ error: 'Missing required fields: model, messages' }, { status: 400 });
    }

    const response = await completion({
      model,
      messages,
      stream: false,
      api_key: apiKey,
      ...parameters,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.status || 500;
    console.error('Marketing AI Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'AI request failed', details: String(error) },
      { status: statusCode }
    );
  }
}

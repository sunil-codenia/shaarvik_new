import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/ai-feedback — store feedback for an insight
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { insight_id, insight_text, feedback, revenue_impact, company_id } = body;

    if (!insight_text || !feedback || !['good', 'bad'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Upsert: one feedback per user per insight_text (update if already exists)
    const { data: existing } = await supabase
      .from('ai_feedback')
      .select('id')
      .eq('user_id', user.id)
      .eq('insight_text', insight_text)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('ai_feedback')
        .update({ feedback, revenue_impact: revenue_impact ?? null, company_id: company_id ?? null })
        .eq('id', existing.id);
    } else {
      await supabase.from('ai_feedback').insert({
        user_id: user.id,
        insight_id: insight_id ?? null,
        insight_text,
        feedback,
        revenue_impact: revenue_impact ?? null,
        company_id: company_id ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/ai-feedback — get success rates for all insights
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get all feedback for this user grouped by insight_text
    const { data, error } = await supabase
      .from('ai_feedback')
      .select('insight_text, feedback')
      .eq('user_id', user.id);

    if (error) throw error;

    // Build success rate map: insight_text -> { good, bad, total, rate, userFeedback }
    const map: Record<string, { good: number; bad: number; total: number; rate: number; userFeedback: string | null }> = {};

    (data || []).forEach((row: any) => {
      const key = row.insight_text;
      if (!map[key]) map[key] = { good: 0, bad: 0, total: 0, rate: 0, userFeedback: null };
      map[key].total += 1;
      if (row.feedback === 'good') map[key].good += 1;
      else map[key].bad += 1;
      map[key].userFeedback = row.feedback; // last feedback = current user's vote
    });

    // Compute rates
    Object.keys(map).forEach((key) => {
      const entry = map[key];
      entry.rate = entry.total > 0 ? Math.round((entry.good / entry.total) * 100) : 0;
    });

    return NextResponse.json({ rates: map });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

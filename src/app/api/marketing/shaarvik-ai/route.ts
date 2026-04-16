import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { createClient } from '@/lib/supabase/server';

async function getOpenAIKey(supabase: any, userId: string): Promise<string | null> {
  const { data: settings } = await supabase
    .from('ai_settings')
    .select('openai_api_key')
    .eq('user_id', userId)
    .single();
  if (settings?.openai_api_key) return settings.openai_api_key;
  return process.env.OPENAI_API_KEY || null;
}

// ─── Fallback Engine ──────────────────────────────────────────────────────────
// Finds the best matching learned pattern for a given action + context
async function getFallbackResponse(supabase: any, userId: string, action: string, context: any): Promise<any | null> {
  const { data: patterns } = await supabase
    .from('ai_fallback_patterns')
    .select('*')
    .eq('user_id', userId)
    .eq('action_type', action)
    .order('usage_count', { ascending: false })
    .order('confidence_score', { ascending: false })
    .limit(10);

  if (!patterns || patterns.length === 0) return null;

  // Score each pattern by similarity to current context
  const contextStr = JSON.stringify(context);
  let bestPattern = patterns[0];
  let bestScore = 0;

  for (const pattern of patterns) {
    const patternStr = JSON.stringify(pattern.input_context);
    // Simple similarity: count matching keys/values
    let score = 0;
    const ctxKeys = Object.keys(context || {});
    for (const key of ctxKeys) {
      if (patternStr.includes(String(context[key]))) score++;
    }
    // Weight by usage count and confidence
    score = score * (pattern.confidence_score / 100) * Math.log(pattern.usage_count + 1);
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  // Increment usage count for the selected pattern
  await supabase
    .from('ai_fallback_patterns')
    .update({ usage_count: bestPattern.usage_count + 1, last_used_at: new Date().toISOString() })
    .eq('id', bestPattern.id);

  // Update fallback stats
  await supabase
    .from('ai_fallback_settings')
    .upsert({
      user_id: userId,
      last_fallback_response_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select();

  // Increment total_fallback_responses
  await supabase.rpc
    ? await supabase
        .from('ai_fallback_settings')
        .update({ total_fallback_responses: (bestPattern.total_fallback_responses || 0) + 1 })
        .eq('user_id', userId)
    : null;

  return bestPattern.openai_response;
}

// ─── Store learned pattern from OpenAI response ───────────────────────────────
async function storeLearnedPattern(supabase: any, userId: string, companyId: string | null, action: string, context: any, response: any, confidence: number) {
  try {
    // Check if a very similar pattern already exists (same action + similar context keys)
    const { data: existing } = await supabase
      .from('ai_fallback_patterns')
      .select('id, usage_count')
      .eq('user_id', userId)
      .eq('action_type', action)
      .limit(1);

    if (existing && existing.length > 50) {
      // Already have many patterns — update the oldest one instead of inserting
      const { data: oldest } = await supabase
        .from('ai_fallback_patterns')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', action)
        .order('last_used_at', { ascending: true })
        .limit(1);

      if (oldest && oldest.length > 0) {
        await supabase
          .from('ai_fallback_patterns')
          .update({
            input_context: context,
            openai_response: response,
            confidence_score: confidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', oldest[0].id);
        return;
      }
    }

    await supabase.from('ai_fallback_patterns').insert({
      user_id: userId,
      company_id: companyId,
      action_type: action,
      input_context: context,
      openai_response: response,
      confidence_score: confidence,
    });

    // Update stats
    await supabase
      .from('ai_fallback_settings')
      .upsert({
        user_id: userId,
        company_id: companyId,
        last_openai_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Increment total_patterns_learned
    const { data: fsData } = await supabase
      .from('ai_fallback_settings')
      .select('total_patterns_learned')
      .eq('user_id', userId)
      .single();

    if (fsData) {
      await supabase
        .from('ai_fallback_settings')
        .update({ total_patterns_learned: (fsData.total_patterns_learned || 0) + 1 })
        .eq('user_id', userId);
    }
  } catch {
    // Non-blocking — learning failure should not break the main response
  }
}

// ─── Generate rule-based fallback when no patterns exist ─────────────────────
function generateRuleBasedFallback(action: string, context: any): any {
  const campaigns = context?.campaigns || [];
  const goals = context?.goals || [];
  const totalLeads = context?.total_leads || 0;
  const totalRevenue = context?.total_revenue || 0;

  switch (action) {
    case 'observe_analyze':
      return {
        health_score: campaigns.length > 0 ? Math.min(70, 40 + campaigns.length * 5) : 30,
        key_observations: [
          `${campaigns.length} campaigns tracked across all channels`,
          `${totalLeads} total leads generated`,
          totalRevenue > 0 ? `$${totalRevenue.toFixed(0)} total revenue attributed` : 'No revenue data yet',
          'Fallback mode active — patterns learned from previous OpenAI sessions',
        ],
        critical_issues: campaigns.length === 0 ? ['No active campaigns found — create campaigns to start generating leads'] : [],
        opportunities: [
          'Review underperforming campaigns and reallocate budget',
          'Focus on channels with highest lead-to-revenue conversion',
        ],
        cross_module_signals: ['Connect sales data for deeper revenue attribution'],
        next_actions: [
          { action: 'Review campaign performance metrics', priority: 'high', confidence: 65, reasoning: 'Based on learned patterns from previous AI sessions' },
          { action: 'Optimize budget allocation across channels', priority: 'medium', confidence: 60, reasoning: 'Rule-based recommendation from fallback engine' },
        ],
      };

    case 'decide_strategy':
      const activeCampaigns = campaigns.filter((c: any) => c.status === 'active');
      const underperforming = campaigns.filter((c: any) => (c.leads || 0) === 0 && c.status === 'active');
      return {
        strategy_name: 'Fallback Optimization Strategy',
        primary_focus: goals[0]?.type === 'leads' ? 'Lead Generation' : 'Revenue Growth',
        campaigns_to_pause: underperforming.slice(0, 2).map((c: any) => ({ id: c.id, name: c.name, reason: 'Zero leads generated — reallocate budget' })),
        campaigns_to_scale: activeCampaigns.filter((c: any) => (c.leads || 0) > 0).slice(0, 2).map((c: any) => ({ id: c.id, name: c.name, reason: 'Generating leads — scale for more volume', budget_increase_pct: 15 })),
        new_campaign_ideas: [],
        budget_reallocation: 'Shift budget from zero-lead campaigns to top performers',
        confidence_score: 62,
        estimated_goal_achievement_pct: 55,
      };

    case 'simulate_scenario':
      const budgetChange = context?.budget_change_pct || 20;
      const currentLeads = context?.current_leads || 0;
      const multiplier = 1 + (budgetChange / 100) * 0.6;
      return {
        scenario_name: `${budgetChange > 0 ? '+' : ''}${budgetChange}% Budget Scenario`,
        predicted_leads: Math.round(currentLeads * multiplier),
        predicted_revenue: Math.round((context?.current_revenue || 0) * multiplier),
        predicted_roi: Math.round(120 + budgetChange * 0.5),
        confidence_score: 58,
        key_assumptions: ['Linear scaling assumption', 'Channel mix remains constant', 'Based on historical patterns'],
        risk_factors: ['Market saturation may reduce returns', 'Seasonal variations not accounted for'],
        recommended_action: budgetChange > 0 ? 'Increase budget gradually and monitor CPL' : 'Reduce spend on lowest-performing channels first',
        alternative_scenarios: [
          { name: 'Conservative (+10%)', predicted_leads: Math.round(currentLeads * 1.06), confidence: 65 },
          { name: 'Aggressive (+40%)', predicted_leads: Math.round(currentLeads * 1.24), confidence: 45 },
        ],
      };

    case 'learn_improve':
      return {
        patterns_learned: [
          { type: 'performance', key: 'lead_volume', insight: 'Active campaigns with budget > $500 generate more leads', confidence: 65 },
          { type: 'channel', key: 'channel_efficiency', insight: 'Multi-channel approach outperforms single-channel', confidence: 60 },
        ],
        strategy_improvements: ['Increase budget on top-performing channels', 'Pause campaigns with 0 leads after 14 days'],
        model_updates: [{ area: 'budget_allocation', old_assumption: 'Equal distribution', new_learning: 'Performance-weighted allocation' }],
        performance_trend: 'stable',
        learning_summary: 'Fallback engine updated with latest campaign performance data',
      };

    case 'generate_campaign':
      return {
        campaign_name: 'AI-Generated Growth Campaign',
        objective: 'Lead Generation',
        channel: 'Social Media',
        budget: 500,
        duration_days: 30,
        target_audience: 'Business decision makers aged 25-45',
        ad_copy: { headline: 'Grow Your Business Faster', description: 'Discover how our solution helps you achieve your goals', cta: 'Get Started Free' },
        kpis: { target_leads: 50, target_cpl: 10, target_roi: 150 },
        confidence_score: 55,
        reasoning: 'Generated by Shaarvik AI fallback engine based on learned patterns',
      };

    case 'cross_module_intelligence':
      return {
        marketing_to_sales_signals: [
          { signal: 'Lead volume trending stable', impact: 'medium', action: 'Maintain current campaign mix' },
        ],
        revenue_attribution: campaigns.slice(0, 3).map((c: any) => ({ campaign: c.name, estimated_revenue_contribution_pct: Math.round(100 / Math.max(campaigns.length, 1)) })),
        funnel_bottlenecks: [{ stage: 'Lead to Opportunity', issue: 'Low conversion rate', fix: 'Improve lead qualification criteria' }],
        best_lead_sources: [{ source: 'Organic', conversion_rate_estimate: 0.15, revenue_per_lead: 250 }],
        recommended_budget_shift: 'Allocate more to highest-converting channels',
        overall_intelligence_score: 58,
      };

    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, context } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
    }

    // ─── Check OpenAI toggle state ────────────────────────────────────────────
    const { data: fallbackSettings } = await supabase
      .from('ai_fallback_settings')
      .select('openai_enabled, fallback_mode_active')
      .eq('user_id', user.id)
      .single();

    const openaiEnabled = fallbackSettings?.openai_enabled !== false; // default true

    // ─── Approval & Threshold Enforcement ────────────────────────────────────
    const { data: controlSettings } = await supabase
      .from('ai_control_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (controlSettings) {
      if (controlSettings.manual_override_active) {
        return NextResponse.json({
          blocked: true,
          reason: 'Manual override is active. Shaarvik AI autonomous actions are paused. Disable manual override in AI Control to resume.',
          action,
        }, { status: 200 });
      }

      const isLaunchAction = action === 'generate_campaign';
      const isBudgetAction = action === 'decide_strategy';

      if (isLaunchAction && controlSettings.approval_required_for_launch && !controlSettings.autonomous_mode) {
        return NextResponse.json({
          blocked: true,
          requires_approval: true,
          reason: 'Campaign launch requires human approval. Enable Autonomous Mode or approve this action manually in AI Control.',
          action,
        }, { status: 200 });
      }

      if (isBudgetAction && controlSettings.require_approval_above_spend) {
        const proposedBudget = context?.total_budget || 0;
        if (proposedBudget > (controlSettings.daily_spend_limit || 500)) {
          return NextResponse.json({
            blocked: true,
            requires_approval: true,
            reason: `Proposed spend ($${proposedBudget}) exceeds daily spend limit ($${controlSettings.daily_spend_limit}). Increase the daily spend limit or approve manually in AI Control.`,
            action,
            spend_limit: controlSettings.daily_spend_limit,
            proposed_spend: proposedBudget,
          }, { status: 200 });
        }
      }

      const minConfidence = controlSettings.approval_threshold || controlSettings.min_confidence_to_act || 75;
      if (context?.required_confidence && context.required_confidence < minConfidence) {
        return NextResponse.json({
          blocked: true,
          requires_approval: true,
          reason: `Action confidence (${context.required_confidence}%) is below approval threshold (${minConfidence}%). Raise confidence or lower the threshold in AI Control.`,
          action,
          confidence: context.required_confidence,
          threshold: minConfidence,
        }, { status: 200 });
      }
    }

    // ─── FALLBACK MODE: OpenAI disabled ──────────────────────────────────────
    if (!openaiEnabled) {
      // Try learned patterns first
      const learnedResponse = await getFallbackResponse(supabase, user.id, action, context);
      if (learnedResponse) {
        return NextResponse.json({
          result: learnedResponse,
          action,
          source: 'fallback_learned',
          fallback_mode: true,
        });
      }

      // Fall back to rule-based engine
      const ruleBasedResponse = generateRuleBasedFallback(action, context);
      if (ruleBasedResponse) {
        return NextResponse.json({
          result: ruleBasedResponse,
          action,
          source: 'fallback_rules',
          fallback_mode: true,
        });
      }

      return NextResponse.json({
        error: 'Fallback engine has no learned patterns yet for this action. Enable OpenAI to generate and learn from responses.',
        fallback_mode: true,
        action,
      }, { status: 400 });
    }

    // ─── OPENAI MODE ──────────────────────────────────────────────────────────
    const apiKey = await getOpenAIKey(supabase, user.id);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please configure it in Settings > AI Configuration.' },
        { status: 400 }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'observe_analyze': {
        systemPrompt = `You are Shaarvik AI, a Level 6 autonomous marketing intelligence engine. 
You observe marketing data, analyze patterns, and provide actionable intelligence.
Always respond with valid JSON only. No markdown, no explanation outside JSON.`;
        userPrompt = `Analyze this marketing data and return a JSON object with:
{
  "health_score": <0-100>,
  "key_observations": [<string>, ...],
  "critical_issues": [<string>, ...],
  "opportunities": [<string>, ...],
  "cross_module_signals": [<string>, ...],
  "next_actions": [{"action": <string>, "priority": "high|medium|low", "confidence": <0-100>, "reasoning": <string>}]
}

Marketing Context:
${JSON.stringify(context, null, 2)}`;
        break;
      }

      case 'decide_strategy': {
        systemPrompt = `You are Shaarvik AI, a Level 6 autonomous marketing AI. 
You make strategic decisions based on goals and data. Be specific and actionable.
Always respond with valid JSON only.`;
        userPrompt = `Given these goals and current performance, decide the optimal strategy.
Return JSON:
{
  "strategy_name": <string>,
  "primary_focus": <string>,
  "campaigns_to_pause": [{"id": <string>, "name": <string>, "reason": <string>}],
  "campaigns_to_scale": [{"id": <string>, "name": <string>, "reason": <string>, "budget_increase_pct": <number>}],
  "new_campaign_ideas": [{"name": <string>, "channel": <string>, "budget": <number>, "target_audience": <string>, "expected_leads": <number>}],
  "budget_reallocation": <string>,
  "confidence_score": <0-100>,
  "estimated_goal_achievement_pct": <0-100>
}

Context:
${JSON.stringify(context, null, 2)}`;
        break;
      }

      case 'simulate_scenario': {
        systemPrompt = `You are Shaarvik AI predictive simulation engine. 
Simulate marketing scenarios with statistical confidence. Always respond with valid JSON only.`;
        userPrompt = `Simulate this marketing scenario and predict outcomes.
Return JSON:
{
  "scenario_name": <string>,
  "predicted_leads": <number>,
  "predicted_revenue": <number>,
  "predicted_roi": <number>,
  "confidence_score": <0-100>,
  "key_assumptions": [<string>, ...],
  "risk_factors": [<string>, ...],
  "recommended_action": <string>,
  "alternative_scenarios": [{"name": <string>, "predicted_leads": <number>, "confidence": <number>}]
}

Scenario:
${JSON.stringify(context, null, 2)}`;
        break;
      }

      case 'learn_improve': {
        systemPrompt = `You are Shaarvik AI self-improvement engine. 
Extract learnable patterns from campaign performance data. Always respond with valid JSON only.`;
        userPrompt = `Extract learning patterns from this performance data.
Return JSON:
{
  "patterns_learned": [{"type": <string>, "key": <string>, "insight": <string>, "confidence": <0-100>}],
  "strategy_improvements": [<string>, ...],
  "model_updates": [{"area": <string>, "old_assumption": <string>, "new_learning": <string>}],
  "performance_trend": "improving|stable|declining",
  "learning_summary": <string>
}

Performance Data:
${JSON.stringify(context, null, 2)}`;
        break;
      }

      case 'generate_campaign': {
        systemPrompt = `You are Shaarvik AI autonomous campaign creator. 
Create complete, ready-to-launch campaign specifications. Always respond with valid JSON only.`;
        userPrompt = `Create a complete campaign specification based on these goals and historical data.
Return JSON:
{
  "campaign_name": <string>,
  "objective": <string>,
  "channel": <string>,
  "budget": <number>,
  "duration_days": <number>,
  "target_audience": <string>,
  "ad_copy": {"headline": <string>, "description": <string>, "cta": <string>},
  "kpis": {"target_leads": <number>, "target_cpl": <number>, "target_roi": <number>},
  "confidence_score": <0-100>,
  "reasoning": <string>
}

Context:
${JSON.stringify(context, null, 2)}`;
        break;
      }

      case 'cross_module_intelligence': {
        systemPrompt = `You are Shaarvik AI cross-module intelligence engine.
Connect marketing data with sales and revenue signals to surface hidden opportunities. Always respond with valid JSON only.`;
        userPrompt = `Analyze cross-module data (marketing + sales + revenue) and surface intelligence.
Return JSON:
{
  "marketing_to_sales_signals": [{"signal": <string>, "impact": "high|medium|low", "action": <string>}],
  "revenue_attribution": [{"campaign": <string>, "estimated_revenue_contribution_pct": <number>}],
  "funnel_bottlenecks": [{"stage": <string>, "issue": <string>, "fix": <string>}],
  "best_lead_sources": [{"source": <string>, "conversion_rate_estimate": <number>, "revenue_per_lead": <number>}],
  "recommended_budget_shift": <string>,
  "overall_intelligence_score": <0-100>
}

Cross-Module Data:
${JSON.stringify(context, null, 2)}`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const response = await completion({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      api_key: apiKey,
      max_completion_tokens: 2000,
    } as any);

    const content = (response as any)?.choices?.[0]?.message?.content || '';

    let parsed: any;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 });
    }

    // ─── Store learned pattern for future fallback use ────────────────────────
    const confidence = parsed?.confidence_score || parsed?.overall_intelligence_score || 70;
    const companyId = controlSettings?.company_id || null;
    await storeLearnedPattern(supabase, user.id, companyId, action, context, parsed, confidence);

    return NextResponse.json({ result: parsed, action, source: 'openai' });
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.status || 500;
    console.error('Shaarvik AI Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Shaarvik AI request failed', details: String(error) },
      { status: statusCode }
    );
  }
}

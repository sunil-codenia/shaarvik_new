'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, ToggleLeft, ToggleRight, Loader2, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/lib/hooks/useChat';
import { useToast } from '@/components/ui/Toast';

import Step1Platforms from './components/Step1Platforms';
import Step2CommonFields, { type CommonFormData } from './components/Step2CommonFields';
import Step3PlatformFields, { type PlatformConfig } from './components/Step3PlatformFields';
import Step4Creatives, { type CreativeSelection } from './components/Step4Creatives';
import Step5Tracking, { type TrackingData } from './components/Step5Tracking';
import Step6AIValidation, { validate, validateCommon, validatePlatformFields, validateTracking } from './components/Step6AIValidation';
import CampaignDashboard from './components/CampaignDashboard';

// ─── Step Definitions ─────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Platforms' },
  { id: 2, label: 'Campaign Setup' },
  { id: 3, label: 'Platform Fields' },
  { id: 4, label: 'Creatives' },
  { id: 5, label: 'Tracking' },
  { id: 6, label: 'Review & AI' },
];

// ─── Default State ────────────────────────────────────────────
const defaultCommon: CommonFormData = {
  name: '', brand: '', objective: '', totalBudget: '', dailyBudget: '',
  startDate: '', endDate: '', location: '', ageMin: '', ageMax: '',
  gender: 'all', language: '', interests: '', behaviors: '', customAudience: '',
};

const defaultPlatformConfig: PlatformConfig = {
  googleCampaignType: '', googleKeywords: '', googleMatchType: '', googleBidStrategy: '',
  googleTargetCpa: '', googleHeadlines: ['', '', '', '', ''], googleDescriptions: ['', ''],
  googleDisplayUrl: '', googleSitelinks: '', googleCallouts: '', googleDevices: [],
  metaObjective: '', metaConversionLocation: '', metaPixelId: '', metaCustomAudiences: '',
  metaLookalike: '', metaPlacements: 'Automatic', metaManualPlacements: [],
  metaOptimizationEvent: '', metaBidStrategy: '',
  linkedinObjective: '', linkedinJobTitles: '', linkedinCompanySize: '',
  linkedinIndustry: '', linkedinSkills: '', linkedinAdFormat: '',
};

const defaultCreatives: CreativeSelection = {
  selectedIds: [], creativeName: '', format: '', primaryText: '', headline: '', cta: '',
};

const defaultTracking: TrackingData = {
  landingPageUrl: '', utmSource: '', utmMedium: '', utmCampaign: '',
  utmContent: '', utmTerm: '', googleTagId: '', metaPixelId: '',
  linkedinInsightTag: '', conversionEvents: [], attributionModel: 'Last Click',
};

// ─── Main Page ────────────────────────────────────────────────
export default function CampaignBuilderPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const supabase = createClient();

  const [view, setView] = useState<'builder' | 'dashboard'>('builder');
  const [currentStep, setCurrentStep] = useState(1);
  const [aiMode, setAiMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [aiValidating, setAiValidating] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);

  // Form state
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [common, setCommon] = useState<CommonFormData>(defaultCommon);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(defaultPlatformConfig);
  const [creatives, setCreatives] = useState<CreativeSelection>(defaultCreatives);
  const [tracking, setTracking] = useState<TrackingData>(defaultTracking);

  // AI hook (uses existing OpenAI route — does NOT touch Shaarvik AI)
  const { response: aiResponse, isLoading: aiLoading, sendMessage } = useChat('OPEN_AI', 'gpt-4.1-mini', false);

  // ─── Persistence ──────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('ucb_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.platforms) setPlatforms(parsed.platforms);
        if (parsed.common) setCommon(parsed.common);
        if (parsed.platformConfig) setPlatformConfig(parsed.platformConfig);
        if (parsed.creatives) setCreatives(parsed.creatives);
        if (parsed.tracking) setTracking(parsed.tracking);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ucb_draft', JSON.stringify({
      platforms, common, platformConfig, creatives, tracking, currentStep
    }));
  }, [platforms, common, platformConfig, creatives, tracking, currentStep]);

  const clearDraft = () => localStorage.removeItem('ucb_draft');

  // ─── AI Auto-Fill ─────────────────────────────────────────
  const handleAiFill = async () => {
    if (!aiMode) return;
    setAiFilling(true);
    sendMessage([
      {
        role: 'system',
        content: 'You are a digital marketing expert. Generate campaign data as JSON only. No markdown, no explanation.',
      },
      {
        role: 'user',
        content: `Generate campaign setup JSON for a ${platforms.join(' + ')} campaign. Return ONLY valid JSON with these keys: name, brand, objective (one of: lead_generation, website_traffic, conversions, awareness), totalBudget (number as string), dailyBudget (number as string), startDate (YYYY-MM-DD, 7 days from today), endDate (YYYY-MM-DD, 37 days from today), location, language, interests, behaviors. Use realistic Indian market values.`,
      },
    ], { max_completion_tokens: 500 });
  };

  useEffect(() => {
    if (!aiResponse || !aiFilling) return;
    try {
      const cleaned = aiResponse.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setCommon((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        brand: parsed.brand || prev.brand,
        objective: parsed.objective || prev.objective,
        totalBudget: String(parsed.totalBudget || prev.totalBudget),
        dailyBudget: String(parsed.dailyBudget || prev.dailyBudget),
        startDate: parsed.startDate || prev.startDate,
        endDate: parsed.endDate || prev.endDate,
        location: parsed.location || prev.location,
        language: parsed.language || prev.language,
        interests: parsed.interests || prev.interests,
        behaviors: parsed.behaviors || prev.behaviors,
      }));
      toastSuccess('AI filled campaign fields!');
    } catch {
      // If not JSON, show as suggestion
      setAiSuggestions(aiResponse);
    }
    setAiFilling(false);
  }, [aiResponse, aiFilling]);

  // ─── AI Validate ──────────────────────────────────────────
  const handleAiValidate = async () => {
    if (!aiMode) return;
    setAiValidating(true);
    const errors = validate(platforms, common, platformConfig, creatives, tracking);
    sendMessage([
      {
        role: 'system',
        content: 'You are a Google/Meta/LinkedIn Ads expert. Review this campaign and give 3-5 specific, actionable improvement suggestions in plain text. Be concise.',
      },
      {
        role: 'user',
        content: `Campaign: ${common.name}, Platforms: ${platforms.join(', ')}, Objective: ${common.objective}, Budget: ₹${common.totalBudget}/total ₹${common.dailyBudget}/day, Location: ${common.location}, Errors found: ${errors.map((e) => e.message).join('; ')}. Give improvement suggestions.`,
      },
    ], { max_completion_tokens: 400 });
  };

  useEffect(() => {
    if (!aiResponse || !aiValidating) return;
    setAiSuggestions(aiResponse);
    setAiValidating(false);
  }, [aiResponse, aiValidating]);

  // ─── Navigation & Validation ────────────────────────────
  const getStepErrors = (stepId: number) => {
    if (stepId === 1) return platforms.length === 0 ? ['At least one platform required'] : [];
    if (stepId === 2) return validateCommon(common).map(e => e.message);
    if (stepId === 3) return validatePlatformFields(platforms, platformConfig).map(e => e.message);
    if (stepId === 5) return validateTracking(tracking).map(e => e.message);
    return [];
  };

  const isStepValid = (stepId: number) => getStepErrors(stepId).length === 0;

  const canGoNext = () => {
    const errors = getStepErrors(currentStep);
    return errors.length === 0;
  };

  const goNext = () => { if (currentStep < 6 && canGoNext()) setCurrentStep((s) => s + 1); };
  const goPrev = () => { if (currentStep > 1) setCurrentStep((s) => s - 1); };

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user) return;
    const errors = validate(platforms, common, platformConfig, creatives, tracking);
    const blocking = errors.filter((e) => e.blocking);
    if (blocking.length > 0) {
      toastError(`Fix ${blocking.length} error${blocking.length > 1 ? 's' : ''} before submitting`);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('ucb_campaigns').insert({
        user_id: user.id,
        name: common.name,
        brand: common.brand,
        objective: common.objective,
        platforms,
        status: 'active',
        total_budget: Number(common.totalBudget) || null,
        daily_budget: Number(common.dailyBudget) || null,
        start_date: common.startDate || null,
        end_date: common.endDate || null,
        location: common.location,
        age_min: common.ageMin ? Number(common.ageMin) : null,
        age_max: common.ageMax ? Number(common.ageMax) : null,
        gender: common.gender,
        language: common.language,
        interests: common.interests,
        behaviors: common.behaviors,
        custom_audience: common.customAudience,
        landing_page_url: tracking.landingPageUrl,
        utm_source: tracking.utmSource,
        utm_medium: tracking.utmMedium,
        utm_campaign: tracking.utmCampaign,
        utm_content: tracking.utmContent,
        utm_term: tracking.utmTerm,
        google_tag_id: tracking.googleTagId,
        meta_pixel_id: tracking.metaPixelId,
        linkedin_insight_tag: tracking.linkedinInsightTag,
        conversion_events: tracking.conversionEvents,
        attribution_model: tracking.attributionModel,
        google_config: platforms.includes('google') ? {
          campaignType: platformConfig.googleCampaignType,
          keywords: platformConfig.googleKeywords,
          matchType: platformConfig.googleMatchType,
          bidStrategy: platformConfig.googleBidStrategy,
          targetCpa: platformConfig.googleTargetCpa,
          headlines: platformConfig.googleHeadlines.filter((h) => h.trim()),
          descriptions: platformConfig.googleDescriptions.filter((d) => d.trim()),
          displayUrl: platformConfig.googleDisplayUrl,
          devices: platformConfig.googleDevices,
        } : null,
        meta_config: platforms.includes('meta') ? {
          objective: platformConfig.metaObjective,
          conversionLocation: platformConfig.metaConversionLocation,
          pixelId: platformConfig.metaPixelId,
          placements: platformConfig.metaPlacements,
          manualPlacements: platformConfig.metaManualPlacements,
          optimizationEvent: platformConfig.metaOptimizationEvent,
          bidStrategy: platformConfig.metaBidStrategy,
        } : null,
        linkedin_config: platforms.includes('linkedin') ? {
          objective: platformConfig.linkedinObjective,
          jobTitles: platformConfig.linkedinJobTitles,
          companySize: platformConfig.linkedinCompanySize,
          industry: platformConfig.linkedinIndustry,
          skills: platformConfig.linkedinSkills,
          adFormat: platformConfig.linkedinAdFormat,
        } : null,
        creative_ids: creatives.selectedIds,
        ai_mode: aiMode,
        ai_suggestions: aiSuggestions || null,
        google_sync_status: platforms.includes('google') ? 'pending' : null,
        meta_sync_status: platforms.includes('meta') ? 'pending' : null,
        linkedin_sync_status: platforms.includes('linkedin') ? 'pending' : null,
      });

      if (error) throw error;

      toastSuccess('Campaign created successfully!');
      clearDraft();
      // Reset form
      setPlatforms([]);
      setCommon(defaultCommon);
      setPlatformConfig(defaultPlatformConfig);
      setCreatives(defaultCreatives);
      setTracking(defaultTracking);
      setAiSuggestions('');
      setCurrentStep(1);
      setView('dashboard');
    } catch (err: any) {
      toastError(err?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Unified Campaign Builder</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Build multi-platform campaigns with AI assistance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* AI Mode Toggle */}
          <button
            type="button"
            onClick={() => setAiMode(!aiMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: aiMode ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${aiMode ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: aiMode ? '#c4b5fd' : 'rgba(148,163,184,0.7)',
            }}
          >
            {aiMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <Sparkles size={14} />
            AI Mode {aiMode ? 'ON' : 'OFF'}
          </button>

          {/* View Toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {(['builder', 'dashboard'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="px-4 py-2 text-xs font-medium transition-all capitalize"
                style={{
                  background: view === v ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: view === v ? '#93c5fd' : 'rgba(148,163,184,0.6)',
                }}
              >
                {v === 'builder' ? '+ New Campaign' : 'Dashboard'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'dashboard' ? (
        <CampaignDashboard />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Step Sidebar */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl p-4 sticky top-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>
                Steps
              </p>
              <div className="space-y-1">
                {STEPS.map((step) => {
                  const isActive = currentStep === step.id;
                  const stepErrors = getStepErrors(step.id);
                  const isValid = stepErrors.length === 0;
                  const isVisited = currentStep > step.id;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group"
                      style={{
                        background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                        border: `1px solid ${isActive ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all"
                        style={{
                          background: isValid && isVisited ? 'rgba(16,185,129,0.2)' : !isValid && isVisited ? 'rgba(239,68,68,0.2)' : isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                          color: isValid && isVisited ? '#34d399' : !isValid && isVisited ? '#f87171' : isActive ? '#93c5fd' : 'rgba(148,163,184,0.5)',
                          border: !isValid && isVisited ? '1px solid rgba(239,68,68,0.3)' : 'none',
                        }}
                      >
                        {isValid && isVisited ? <Check size={12} /> : !isValid && isVisited ? '!' : step.id}
                      </div>
                      <div className="flex-1">
                        <span
                          className="text-xs font-medium block"
                          style={{ color: isActive ? '#93c5fd' : isValid && isVisited ? '#34d399' : !isValid && isVisited ? '#f87171' : 'rgba(148,163,184,0.6)' }}
                        >
                          {step.label}
                        </span>
                        {!isValid && isVisited && (
                          <span className="text-[10px] text-red-500/70 block -mt-0.5">Missing info</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* AI Mode Info */}
              {aiMode && (
                <div
                  className="mt-4 rounded-xl p-3"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={12} className="text-purple-400" />
                    <p className="text-xs font-semibold text-purple-300">AI Mode Active</p>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    Shaarvik AI will auto-fill fields and validate your campaign.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step Content */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {currentStep === 1 && (
                <Step1Platforms selected={platforms} onChange={setPlatforms} />
              )}
              {currentStep === 2 && (
                <Step2CommonFields
                  data={common}
                  onChange={setCommon}
                  aiMode={aiMode}
                  aiLoading={aiFilling || aiLoading}
                  onAiFill={handleAiFill}
                />
              )}
              {currentStep === 3 && (
                <Step3PlatformFields
                  platforms={platforms}
                  data={platformConfig}
                  onChange={setPlatformConfig}
                />
              )}
              {currentStep === 4 && (
                <Step4Creatives data={creatives} onChange={setCreatives} />
              )}
              {currentStep === 5 && (
                <Step5Tracking
                  data={tracking}
                  onChange={setTracking}
                  platforms={platforms}
                  campaignName={common.name}
                />
              )}
              {currentStep === 6 && (
                <Step6AIValidation
                  platforms={platforms}
                  common={common}
                  platformConfig={platformConfig}
                  creatives={creatives}
                  tracking={tracking}
                  aiMode={aiMode}
                  aiSuggestions={aiSuggestions}
                  aiLoading={aiValidating || aiLoading}
                  onAiValidate={handleAiValidate}
                />
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(148,163,184,0.8)',
                  }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  Step {currentStep} of {STEPS.length}
                </span>

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canGoNext()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{
                      background: canGoNext() ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${canGoNext() ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: canGoNext() ? '#93c5fd' : 'rgba(148,163,184,0.4)',
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: submitting ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.2)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      color: '#34d399',
                    }}
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    {submitting ? 'Submitting...' : 'Submit Campaign'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

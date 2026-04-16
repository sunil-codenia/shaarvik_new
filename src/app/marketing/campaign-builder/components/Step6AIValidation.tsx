'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import type { CommonFormData } from './Step2CommonFields';
import type { PlatformConfig } from './Step3PlatformFields';
import type { CreativeSelection } from './Step4Creatives';
import type { TrackingData } from './Step5Tracking';

interface ValidationError {
  field: string;
  message: string;
  blocking: boolean;
}

interface Props {
  platforms: string[];
  common: CommonFormData;
  platformConfig: PlatformConfig;
  creatives: CreativeSelection;
  tracking: TrackingData;
  aiMode: boolean;
  aiSuggestions: string;
  aiLoading: boolean;
  onAiValidate: () => void;
}

function validateCommon(common: CommonFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!common.name.trim()) errors.push({ field: 'Campaign Name', message: 'Campaign name is required', blocking: true });
  if (!common.brand.trim()) errors.push({ field: 'Brand', message: 'Company/Brand is required', blocking: true });
  if (!common.objective) errors.push({ field: 'Objective', message: 'Campaign objective is required', blocking: true });
  if (!common.totalBudget || Number(common.totalBudget) <= 0) errors.push({ field: 'Total Budget', message: 'Total budget must be greater than 0', blocking: true });
  if (!common.dailyBudget || Number(common.dailyBudget) <= 0) errors.push({ field: 'Daily Budget', message: 'Daily budget must be greater than 0', blocking: true });
  if (!common.startDate) errors.push({ field: 'Start Date', message: 'Start date is required', blocking: true });
  return errors;
}

function validatePlatformFields(platforms: string[], platformConfig: PlatformConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  if (platforms.includes('google')) {
    if (!platformConfig.googleCampaignType) errors.push({ field: 'Google: Campaign Type', message: 'Google campaign type is required', blocking: true });
    if (platformConfig.googleCampaignType === 'Search' && !platformConfig.googleKeywords.trim()) {
      errors.push({ field: 'Google: Keywords', message: 'Keywords are required for Search campaigns', blocking: true });
    }
    if (!platformConfig.googleBidStrategy) errors.push({ field: 'Google: Bid Strategy', message: 'Bidding strategy is required', blocking: true });
    const headlines = platformConfig.googleHeadlines.filter((h) => h.trim());
    if (headlines.length < 5) errors.push({ field: 'Google: Headlines', message: `At least 5 headlines required (${headlines.length} provided)`, blocking: true });
    const descs = platformConfig.googleDescriptions.filter((d) => d.trim());
    if (descs.length < 2) errors.push({ field: 'Google: Descriptions', message: `At least 2 descriptions required (${descs.length} provided)`, blocking: true });
  }

  if (platforms.includes('meta')) {
    if (!platformConfig.metaObjective) errors.push({ field: 'Meta: Objective', message: 'Meta campaign objective is required', blocking: true });
    if (!platformConfig.metaPixelId.trim()) errors.push({ field: 'Meta: Pixel ID', message: 'Meta Pixel ID is required', blocking: true });
    if (!platformConfig.metaConversionLocation) errors.push({ field: 'Meta: Conversion Location', message: 'Conversion location is required', blocking: true });
  }

  if (platforms.includes('linkedin')) {
    if (!platformConfig.linkedinObjective) errors.push({ field: 'LinkedIn: Objective', message: 'LinkedIn campaign objective is required', blocking: true });
    if (!platformConfig.linkedinAdFormat) errors.push({ field: 'LinkedIn: Ad Format', message: 'LinkedIn ad format is required', blocking: true });
  }
  return errors;
}

function validateTracking(tracking: TrackingData): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!tracking.landingPageUrl.trim()) errors.push({ field: 'Landing Page URL', message: 'Landing page URL is required', blocking: true });
  return errors;
}

function validate(
  platforms: string[],
  common: CommonFormData,
  platformConfig: PlatformConfig,
  creatives: CreativeSelection,
  tracking: TrackingData
): ValidationError[] {
  const errors: ValidationError[] = [
    ...validateCommon(common),
    ...validatePlatformFields(platforms, platformConfig),
    ...validateTracking(tracking),
  ];

  // Budget consistency
  if (common.totalBudget && common.dailyBudget && common.startDate && common.endDate) {
    const days = Math.ceil((new Date(common.endDate).getTime() - new Date(common.startDate).getTime()) / 86400000);
    const maxSpend = Number(common.dailyBudget) * days;
    if (maxSpend > Number(common.totalBudget) * 1.1) {
      errors.push({ field: 'Budget', message: `Daily budget × campaign days (₹${maxSpend.toLocaleString()}) exceeds total budget`, blocking: false });
    }
  }

  // Creatives warning
  if (creatives.selectedIds.length === 0 && !creatives.creativeName.trim()) {
    errors.push({ field: 'Creatives', message: 'No creatives selected or defined — campaign may not run', blocking: false });
  }

  return errors;
}

export default function Step6AIValidation({
  platforms, common, platformConfig, creatives, tracking,
  aiMode, aiSuggestions, aiLoading, onAiValidate,
}: Props) {
  const errors = validate(platforms, common, platformConfig, creatives, tracking);
  const blocking = errors.filter((e) => e.blocking);
  const warnings = errors.filter((e) => !e.blocking);
  const isValid = blocking.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Review & AI Validation</h2>
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Review your campaign before submission. AI will check for issues.
          </p>
        </div>
        {aiMode && (
          <button
            type="button"
            onClick={onAiValidate}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: aiLoading ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.4)',
              color: '#c4b5fd',
            }}
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {aiLoading ? 'Validating...' : 'AI Validate'}
          </button>
        )}
      </div>

      {/* Validation Status */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: isValid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${isValid ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          {isValid ? (
            <CheckCircle2 size={22} className="text-emerald-400" />
          ) : (
            <XCircle size={22} className="text-red-400" />
          )}
          <div>
            <p className="font-semibold text-white">
              {isValid ? 'Campaign is ready to submit' : `${blocking.length} blocking error${blocking.length > 1 ? 's' : ''} found`}
            </p>
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
              {isValid
                ? warnings.length > 0
                  ? `${warnings.length} non-blocking warning${warnings.length > 1 ? 's' : ''} — review recommended`
                  : 'All required fields are complete' :'Fix all errors before submitting'}
            </p>
          </div>
        </div>

        {blocking.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Errors (Blocking)</p>
            {blocking.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-red-300">{e.field}:</span>{' '}
                  <span style={{ color: 'rgba(148,163,184,0.8)' }}>{e.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Warnings (Non-blocking)</p>
            {warnings.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-yellow-300">{e.field}:</span>{' '}
                  <span style={{ color: 'rgba(148,163,184,0.8)' }}>{e.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-purple-400" />
            <p className="text-sm font-semibold text-purple-300">Shaarvik AI Suggestions</p>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(203,213,225,0.9)' }}>
            {aiSuggestions}
          </p>
        </div>
      )}

      {/* Campaign Summary */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-sm font-semibold text-white">Campaign Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            { label: 'Name', value: common.name || '—' },
            { label: 'Brand', value: common.brand || '—' },
            { label: 'Objective', value: common.objective?.replace(/_/g, ' ') || '—' },
            { label: 'Platforms', value: platforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') || '—' },
            { label: 'Total Budget', value: common.totalBudget ? `₹${Number(common.totalBudget).toLocaleString()}` : '—' },
            { label: 'Daily Budget', value: common.dailyBudget ? `₹${Number(common.dailyBudget).toLocaleString()}` : '—' },
            { label: 'Start Date', value: common.startDate || '—' },
            { label: 'End Date', value: common.endDate || 'Ongoing' },
            { label: 'Creatives', value: creatives.selectedIds.length > 0 ? `${creatives.selectedIds.length} selected` : creatives.creativeName || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</p>
              <p className="font-medium text-white capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {!isValid && (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-sm text-red-300">
            Please go back and fix all <strong>{blocking.length} blocking error{blocking.length > 1 ? 's' : ''}</strong> before submitting.
          </p>
        </div>
      )}
    </div>
  );
}

export { validate, validateCommon, validatePlatformFields, validateTracking };

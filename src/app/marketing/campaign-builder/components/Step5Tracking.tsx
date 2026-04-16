'use client';

import React, { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';

export interface TrackingData {
  landingPageUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  googleTagId: string;
  metaPixelId: string;
  linkedinInsightTag: string;
  conversionEvents: string[];
  attributionModel: string;
}

interface Props {
  data: TrackingData;
  onChange: (d: TrackingData) => void;
  platforms: string[];
  campaignName: string;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#e2e8f0',
  padding: '10px 14px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'rgba(148,163,184,0.8)',
  marginBottom: '6px',
};

const CONVERSION_EVENTS = ['Lead Submit', 'WhatsApp Click', 'Call Click', 'Form Fill', 'Purchase'];
const ATTRIBUTION_MODELS = ['Last Click', 'Data Driven', 'First Click', 'Linear'];

export default function Step5Tracking({ data, onChange, platforms, campaignName }: Props) {
  const [copied, setCopied] = useState(false);

  const set = (key: keyof TrackingData, value: any) => onChange({ ...data, [key]: value });

  const toggleEvent = (e: string) => {
    if (data.conversionEvents.includes(e)) {
      set('conversionEvents', data.conversionEvents.filter((x) => x !== e));
    } else {
      set('conversionEvents', [...data.conversionEvents, e]);
    }
  };

  const buildUtmUrl = () => {
    if (!data.landingPageUrl) return '';
    const params = new URLSearchParams();
    if (data.utmSource) params.set('utm_source', data.utmSource);
    if (data.utmMedium) params.set('utm_medium', data.utmMedium);
    if (data.utmCampaign) params.set('utm_campaign', data.utmCampaign);
    if (data.utmContent) params.set('utm_content', data.utmContent);
    if (data.utmTerm) params.set('utm_term', data.utmTerm);
    const qs = params.toString();
    return qs ? `${data.landingPageUrl}?${qs}` : data.landingPageUrl;
  };

  const autoFillUtm = () => {
    onChange({
      ...data,
      utmSource: platforms[0] || 'google',
      utmMedium: 'cpc',
      utmCampaign: campaignName.toLowerCase().replace(/\s+/g, '_') || 'campaign',
      utmContent: 'ad1',
    });
  };

  const copyUrl = () => {
    const url = buildUtmUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fullUrl = buildUtmUrl();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Tracking & Conversion</h2>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Set up tracking pixels, UTM parameters, and conversion events.
        </p>
      </div>

      {/* Landing Page + UTM Builder */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">UTM Builder</h3>
          <button
            type="button"
            onClick={autoFillUtm}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}
          >
            <RefreshCw size={12} /> Auto-fill
          </button>
        </div>

        <div>
          <label style={labelStyle}>Landing Page URL <span style={{ color: '#f87171' }}>*</span></label>
          <input
            style={inputStyle}
            value={data.landingPageUrl}
            onChange={(e) => set('landingPageUrl', e.target.value)}
            placeholder="https://yoursite.com/landing"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'utmSource', label: 'UTM Source', placeholder: 'google' },
            { key: 'utmMedium', label: 'UTM Medium', placeholder: 'cpc' },
            { key: 'utmCampaign', label: 'UTM Campaign', placeholder: 'summer_2026' },
            { key: 'utmContent', label: 'UTM Content', placeholder: 'ad_variant_a' },
            { key: 'utmTerm', label: 'UTM Term', placeholder: 'real estate' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                style={inputStyle}
                value={(data as any)[key]}
                onChange={(e) => set(key as keyof TrackingData, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        {fullUrl && (
          <div
            className="rounded-xl p-3 flex items-start gap-3"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-400 mb-1">Generated URL</p>
              <p className="text-xs break-all" style={{ color: 'rgba(148,163,184,0.8)' }}>{fullUrl}</p>
            </div>
            <button
              type="button"
              onClick={copyUrl}
              className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
              style={{ color: copied ? '#34d399' : '#60a5fa', background: 'rgba(96,165,250,0.1)' }}
            >
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Platform Tracking IDs */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-sm font-semibold text-white">Platform Tracking IDs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.includes('google') && (
            <div>
              <label style={labelStyle}>Google Tag ID</label>
              <input
                style={inputStyle}
                value={data.googleTagId}
                onChange={(e) => set('googleTagId', e.target.value)}
                placeholder="GT-XXXXXXXXXX"
              />
            </div>
          )}
          {platforms.includes('meta') && (
            <div>
              <label style={labelStyle}>Meta Pixel ID</label>
              <input
                style={inputStyle}
                value={data.metaPixelId}
                onChange={(e) => set('metaPixelId', e.target.value)}
                placeholder="1234567890123456"
              />
            </div>
          )}
          {platforms.includes('linkedin') && (
            <div>
              <label style={labelStyle}>LinkedIn Insight Tag</label>
              <input
                style={inputStyle}
                value={data.linkedinInsightTag}
                onChange={(e) => set('linkedinInsightTag', e.target.value)}
                placeholder="1234567"
              />
            </div>
          )}
        </div>
      </div>

      {/* Conversion Events */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-sm font-semibold text-white">Conversion Events</h3>
        <div className="flex flex-wrap gap-2">
          {CONVERSION_EVENTS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => toggleEvent(e)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: data.conversionEvents.includes(e) ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${data.conversionEvents.includes(e) ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: data.conversionEvents.includes(e) ? '#34d399' : 'rgba(148,163,184,0.6)',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        <div>
          <label style={labelStyle}>Attribution Model</label>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTION_MODELS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set('attributionModel', m)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: data.attributionModel === m ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${data.attributionModel === m ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: data.attributionModel === m ? '#93c5fd' : 'rgba(148,163,184,0.6)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

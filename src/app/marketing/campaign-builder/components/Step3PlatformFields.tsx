'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';

export interface PlatformConfig {
  // Google
  googleCampaignType: string;
  googleKeywords: string;
  googleMatchType: string;
  googleBidStrategy: string;
  googleTargetCpa: string;
  googleHeadlines: string[];
  googleDescriptions: string[];
  googleDisplayUrl: string;
  googleSitelinks: string;
  googleCallouts: string;
  googleDevices: string[];
  // Meta
  metaObjective: string;
  metaConversionLocation: string;
  metaPixelId: string;
  metaCustomAudiences: string;
  metaLookalike: string;
  metaPlacements: string;
  metaManualPlacements: string[];
  metaOptimizationEvent: string;
  metaBidStrategy: string;
  // LinkedIn
  linkedinObjective: string;
  linkedinJobTitles: string;
  linkedinCompanySize: string;
  linkedinIndustry: string;
  linkedinSkills: string;
  linkedinAdFormat: string;
}

interface Props {
  platforms: string[];
  data: PlatformConfig;
  onChange: (data: PlatformConfig) => void;
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#f87171' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ChipSelect({ options, selected, onChange, color }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  color: string;
}) {
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: selected.includes(o) ? `${color}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selected.includes(o) ? color : 'rgba(255,255,255,0.08)'}`,
            color: selected.includes(o) ? color : 'rgba(148,163,184,0.6)',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function HeadlineList({ items, onChange, placeholder, max }: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  max: number;
}) {
  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const add = () => { if (items.length < max) onChange([...items, '']); };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`${placeholder} ${i + 1}`}
          />
          {items.length > 1 && (
            <button type="button" onClick={() => remove(i)} className="p-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
          style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px dashed rgba(96,165,250,0.3)' }}
        >
          <Plus size={12} /> Add {placeholder}
        </button>
      )}
    </div>
  );
}

// ─── Google Section ───────────────────────────────────────────
function GoogleSection({ data, onChange }: { data: PlatformConfig; onChange: (d: PlatformConfig) => void }) {
  const set = (key: keyof PlatformConfig, value: any) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-6 rounded-full" style={{ background: '#fbbf24' }} />
        <h3 className="font-semibold text-white">Google Ads Configuration</h3>
      </div>

      <Field label="Campaign Type" required>
        <ChipSelect
          options={['Search', 'Display', 'Video', 'Performance Max', 'Shopping']}
          selected={data.googleCampaignType ? [data.googleCampaignType] : []}
          onChange={(v) => set('googleCampaignType', v[v.length - 1] || '')}
          color="#fbbf24"
        />
      </Field>

      {data.googleCampaignType === 'Search' && (
        <Field label="Keywords (one per line)" required>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={data.googleKeywords}
            onChange={(e) => set('googleKeywords', e.target.value)}
            placeholder="real estate mumbai&#10;buy apartment&#10;property investment"
          />
          <div className="mt-2">
            <label style={labelStyle}>Match Type</label>
            <ChipSelect
              options={['Broad', 'Phrase', 'Exact']}
              selected={data.googleMatchType ? [data.googleMatchType] : []}
              onChange={(v) => set('googleMatchType', v[v.length - 1] || '')}
              color="#fbbf24"
            />
          </div>
        </Field>
      )}

      <Field label="Bidding Strategy" required>
        <ChipSelect
          options={['Maximize Conversions', 'Target CPA', 'Target ROAS', 'Manual CPC']}
          selected={data.googleBidStrategy ? [data.googleBidStrategy] : []}
          onChange={(v) => set('googleBidStrategy', v[v.length - 1] || '')}
          color="#fbbf24"
        />
      </Field>

      {data.googleBidStrategy === 'Target CPA' && (
        <Field label="Target CPA (₹)">
          <input
            style={{ ...inputStyle, maxWidth: '200px' }}
            type="number"
            value={data.googleTargetCpa}
            onChange={(e) => set('googleTargetCpa', e.target.value)}
            placeholder="500"
          />
        </Field>
      )}

      <Field label="Ad Headlines (min 5)" required>
        <HeadlineList
          items={data.googleHeadlines.length ? data.googleHeadlines : ['', '', '', '', '']}
          onChange={(v) => set('googleHeadlines', v)}
          placeholder="Headline"
          max={15}
        />
      </Field>

      <Field label="Ad Descriptions (min 2)" required>
        <HeadlineList
          items={data.googleDescriptions.length ? data.googleDescriptions : ['', '']}
          onChange={(v) => set('googleDescriptions', v)}
          placeholder="Description"
          max={4}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Display URL">
          <input
            style={inputStyle}
            value={data.googleDisplayUrl}
            onChange={(e) => set('googleDisplayUrl', e.target.value)}
            placeholder="yoursite.com/offer"
          />
        </Field>
        <Field label="Device Targeting">
          <ChipSelect
            options={['Mobile', 'Desktop', 'Tablet']}
            selected={data.googleDevices}
            onChange={(v) => set('googleDevices', v)}
            color="#fbbf24"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Sitelinks">
          <input style={inputStyle} value={data.googleSitelinks} onChange={(e) => set('googleSitelinks', e.target.value)} placeholder="Home, About, Contact" />
        </Field>
        <Field label="Callouts">
          <input style={inputStyle} value={data.googleCallouts} onChange={(e) => set('googleCallouts', e.target.value)} placeholder="Free Consultation, 24/7 Support" />
        </Field>
        <Field label="Structured Snippets">
          <input style={inputStyle} placeholder="Services: Design, Build, Sell" readOnly style={{ ...inputStyle, opacity: 0.5 }} />
        </Field>
      </div>
    </div>
  );
}

// ─── Meta Section ─────────────────────────────────────────────
function MetaSection({ data, onChange }: { data: PlatformConfig; onChange: (d: PlatformConfig) => void }) {
  const set = (key: keyof PlatformConfig, value: any) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-6 rounded-full" style={{ background: '#60a5fa' }} />
        <h3 className="font-semibold text-white">Meta Ads Configuration</h3>
      </div>

      <Field label="Campaign Objective" required>
        <ChipSelect
          options={['Leads', 'Traffic', 'Engagement', 'Sales']}
          selected={data.metaObjective ? [data.metaObjective] : []}
          onChange={(v) => set('metaObjective', v[v.length - 1] || '')}
          color="#60a5fa"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Conversion Location" required>
          <ChipSelect
            options={['Website', 'App', 'WhatsApp']}
            selected={data.metaConversionLocation ? [data.metaConversionLocation] : []}
            onChange={(v) => set('metaConversionLocation', v[v.length - 1] || '')}
            color="#60a5fa"
          />
        </Field>
        <Field label="Meta Pixel ID" required>
          <input
            style={inputStyle}
            value={data.metaPixelId}
            onChange={(e) => set('metaPixelId', e.target.value)}
            placeholder="e.g. 1234567890123456"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Custom Audiences">
          <input style={inputStyle} value={data.metaCustomAudiences} onChange={(e) => set('metaCustomAudiences', e.target.value)} placeholder="Website visitors, Email list" />
        </Field>
        <Field label="Lookalike Audience">
          <input style={inputStyle} value={data.metaLookalike} onChange={(e) => set('metaLookalike', e.target.value)} placeholder="1% lookalike of customers" />
        </Field>
      </div>

      <Field label="Placements">
        <div className="flex gap-2 mb-3">
          {['Automatic', 'Manual'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set('metaPlacements', p)}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: data.metaPlacements === p ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${data.metaPlacements === p ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: data.metaPlacements === p ? '#93c5fd' : 'rgba(148,163,184,0.6)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
        {data.metaPlacements === 'Manual' && (
          <ChipSelect
            options={['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels']}
            selected={data.metaManualPlacements}
            onChange={(v) => set('metaManualPlacements', v)}
            color="#60a5fa"
          />
        )}
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Optimization Event">
          <input style={inputStyle} value={data.metaOptimizationEvent} onChange={(e) => set('metaOptimizationEvent', e.target.value)} placeholder="e.g. Lead, Purchase" />
        </Field>
        <Field label="Bid Strategy">
          <input style={inputStyle} value={data.metaBidStrategy} onChange={(e) => set('metaBidStrategy', e.target.value)} placeholder="e.g. Lowest Cost, Cost Cap" />
        </Field>
      </div>
    </div>
  );
}

// ─── LinkedIn Section ─────────────────────────────────────────
function LinkedInSection({ data, onChange }: { data: PlatformConfig; onChange: (d: PlatformConfig) => void }) {
  const set = (key: keyof PlatformConfig, value: any) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-6 rounded-full" style={{ background: '#818cf8' }} />
        <h3 className="font-semibold text-white">LinkedIn Ads Configuration</h3>
      </div>

      <Field label="Campaign Objective" required>
        <ChipSelect
          options={['Website Visits', 'Lead Generation', 'Engagement']}
          selected={data.linkedinObjective ? [data.linkedinObjective] : []}
          onChange={(v) => set('linkedinObjective', v[v.length - 1] || '')}
          color="#818cf8"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Job Titles">
          <input style={inputStyle} value={data.linkedinJobTitles} onChange={(e) => set('linkedinJobTitles', e.target.value)} placeholder="CEO, CTO, Marketing Manager" />
        </Field>
        <Field label="Company Size">
          <input style={inputStyle} value={data.linkedinCompanySize} onChange={(e) => set('linkedinCompanySize', e.target.value)} placeholder="11-50, 51-200, 201-500" />
        </Field>
        <Field label="Industry">
          <input style={inputStyle} value={data.linkedinIndustry} onChange={(e) => set('linkedinIndustry', e.target.value)} placeholder="Real Estate, Technology, Finance" />
        </Field>
        <Field label="Skills">
          <input style={inputStyle} value={data.linkedinSkills} onChange={(e) => set('linkedinSkills', e.target.value)} placeholder="Project Management, Sales" />
        </Field>
      </div>

      <Field label="Ad Format" required>
        <ChipSelect
          options={['Single Image', 'Carousel', 'Message Ads']}
          selected={data.linkedinAdFormat ? [data.linkedinAdFormat] : []}
          onChange={(v) => set('linkedinAdFormat', v[v.length - 1] || '')}
          color="#818cf8"
        />
      </Field>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function Step3PlatformFields({ platforms, data, onChange }: Props) {
  if (platforms.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'rgba(148,163,184,0.5)' }}>
        No platforms selected. Go back to Step 1 to select platforms.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Platform-Specific Settings</h2>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Configure settings for each selected platform.
        </p>
      </div>

      {platforms.includes('google') && (
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}
        >
          <GoogleSection data={data} onChange={onChange} />
        </div>
      )}

      {platforms.includes('meta') && (
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)' }}
        >
          <MetaSection data={data} onChange={onChange} />
        </div>
      )}

      {platforms.includes('linkedin') && (
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(129,140,248,0.04)', border: '1px solid rgba(129,140,248,0.15)' }}
        >
          <LinkedInSection data={data} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

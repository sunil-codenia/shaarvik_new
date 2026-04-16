'use client';

import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export interface CommonFormData {
  name: string;
  brand: string;
  objective: string;
  totalBudget: string;
  dailyBudget: string;
  startDate: string;
  endDate: string;
  location: string;
  ageMin: string;
  ageMax: string;
  gender: string;
  language: string;
  interests: string;
  behaviors: string;
  customAudience: string;
}

interface Props {
  data: CommonFormData;
  onChange: (data: CommonFormData) => void;
  aiMode: boolean;
  aiLoading: boolean;
  onAiFill: () => void;
}

const OBJECTIVES = [
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'website_traffic', label: 'Website Traffic' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'awareness', label: 'Brand Awareness' },
];

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#e2e8f0',
  padding: '10px 14px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s',
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

export default function Step2CommonFields({ data, onChange, aiMode, aiLoading, onAiFill }: Props) {
  const set = (key: keyof CommonFormData, value: string) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Campaign Setup</h2>
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
            These fields apply to all selected platforms.
          </p>
        </div>
        {aiMode && (
          <button
            type="button"
            onClick={onAiFill}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: aiLoading ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.4)',
              color: '#c4b5fd',
            }}
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {aiLoading ? 'AI Filling...' : 'AI Auto-Fill'}
          </button>
        )}
      </div>

      {/* Campaign Basics */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-sm font-semibold text-white">Campaign Basics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Campaign Name" required>
            <input
              style={inputStyle}
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Summer Lead Gen 2026"
            />
          </Field>
          <Field label="Company / Brand" required>
            <input
              style={inputStyle}
              value={data.brand}
              onChange={(e) => set('brand', e.target.value)}
              placeholder="e.g. Buildarya"
            />
          </Field>
        </div>
        <Field label="Campaign Objective" required>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {OBJECTIVES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set('objective', o.value)}
                className="py-2.5 px-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: data.objective === o.value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${data.objective === o.value ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: data.objective === o.value ? '#93c5fd' : 'rgba(148,163,184,0.7)',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Budget */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-sm font-semibold text-white">Budget & Schedule</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Total Budget (₹)" required>
            <input
              style={inputStyle}
              type="number"
              value={data.totalBudget}
              onChange={(e) => set('totalBudget', e.target.value)}
              placeholder="50000"
            />
          </Field>
          <Field label="Daily Budget (₹)" required>
            <input
              style={inputStyle}
              type="number"
              value={data.dailyBudget}
              onChange={(e) => set('dailyBudget', e.target.value)}
              placeholder="2000"
            />
          </Field>
          <Field label="Start Date" required>
            <input
              style={inputStyle}
              type="date"
              value={data.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </Field>
          <Field label="End Date">
            <input
              style={inputStyle}
              type="date"
              value={data.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Targeting */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-sm font-semibold text-white">Audience Targeting</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Location (city / radius / pin)">
            <input
              style={inputStyle}
              value={data.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Mumbai, Delhi, Bangalore"
            />
          </Field>
          <Field label="Language">
            <input
              style={inputStyle}
              value={data.language}
              onChange={(e) => set('language', e.target.value)}
              placeholder="e.g. English, Hindi"
            />
          </Field>
          <Field label="Age Range">
            <div className="flex items-center gap-2">
              <input
                style={{ ...inputStyle, width: '80px' }}
                type="number"
                value={data.ageMin}
                onChange={(e) => set('ageMin', e.target.value)}
                placeholder="18"
              />
              <span style={{ color: 'rgba(148,163,184,0.5)' }}>–</span>
              <input
                style={{ ...inputStyle, width: '80px' }}
                type="number"
                value={data.ageMax}
                onChange={(e) => set('ageMax', e.target.value)}
                placeholder="65"
              />
            </div>
          </Field>
          <Field label="Gender">
            <div className="flex gap-2">
              {['all', 'male', 'female'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('gender', g)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize"
                  style={{
                    background: data.gender === g ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${data.gender === g ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: data.gender === g ? '#93c5fd' : 'rgba(148,163,184,0.7)',
                  }}
                >
                  {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Interests">
            <input
              style={inputStyle}
              value={data.interests}
              onChange={(e) => set('interests', e.target.value)}
              placeholder="e.g. Real estate, Finance"
            />
          </Field>
          <Field label="Behaviors">
            <input
              style={inputStyle}
              value={data.behaviors}
              onChange={(e) => set('behaviors', e.target.value)}
              placeholder="e.g. Home buyers, Investors"
            />
          </Field>
          <Field label="Custom Audience">
            <input
              style={inputStyle}
              value={data.customAudience}
              onChange={(e) => set('customAudience', e.target.value)}
              placeholder="Existing audience name"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

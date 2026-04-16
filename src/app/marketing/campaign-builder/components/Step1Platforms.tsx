'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface Props {
  selected: string[];
  onChange: (platforms: string[]) => void;
}

const PLATFORMS = [
  {
    id: 'google',
    name: 'Google Ads',
    description: 'Search, Display, Video, Performance Max & Shopping campaigns',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
    activeBorder: '#fbbf24',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Facebook, Instagram, Stories, Reels & Audience Network',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
    activeBorder: '#60a5fa',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Ads',
    description: 'B2B targeting by job title, company size, industry & skills',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.25)',
    activeBorder: '#818cf8',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
];

export default function Step1Platforms({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Select Platforms</h2>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Choose one or more ad platforms. Platform-specific fields will load automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="relative text-left rounded-2xl p-5 transition-all duration-200 focus:outline-none"
              style={{
                background: isSelected ? p.bg : 'rgba(255,255,255,0.03)',
                border: `2px solid ${isSelected ? p.activeBorder : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isSelected ? `0 0 20px ${p.color}22` : 'none',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {p.icon}
                </div>
                {isSelected ? (
                  <CheckCircle2 size={20} style={{ color: p.color }} />
                ) : (
                  <Circle size={20} style={{ color: 'rgba(148,163,184,0.3)' }} />
                )}
              </div>
              <h3 className="font-semibold text-white mb-1">{p.name}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
                {p.description}
              </p>
              {isSelected && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
                  style={{ background: `linear-gradient(90deg, transparent, ${p.color}, transparent)` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-300">
            <span className="font-semibold">{selected.length} platform{selected.length > 1 ? 's' : ''} selected.</span>{' '}
            {selected.length > 1
              ? 'Common fields will be shared. Platform-specific sections will appear in Step 3.'
              : 'Platform-specific fields will appear in Step 3.'}
          </p>
        </div>
      )}
    </div>
  );
}

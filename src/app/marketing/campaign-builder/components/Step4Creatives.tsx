'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Video, Plus, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface CreativeSelection {
  selectedIds: string[];
  creativeName: string;
  format: string;
  primaryText: string;
  headline: string;
  cta: string;
}

interface Creative {
  id: string;
  name: string;
  type: string | null;
  creative_url: string | null;
  headline: string | null;
  description: string | null;
  status: string | null;
}

interface Props {
  data: CreativeSelection;
  onChange: (d: CreativeSelection) => void;
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

const CTA_OPTIONS = ['Learn More', 'Sign Up', 'Get Quote', 'Contact Us', 'Download', 'Shop Now', 'Book Now'];
const FORMAT_OPTIONS = ['Image', 'Video', 'Carousel'];

export default function Step4Creatives({ data, onChange }: Props) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreatives = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: rows } = await supabase
        .from('creatives')
        .select('id, name, type, creative_url, headline, description, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      setCreatives(rows || []);
      setLoading(false);
    };
    fetchCreatives();
  }, []);

  const set = (key: keyof CreativeSelection, value: any) => onChange({ ...data, [key]: value });

  const toggleCreative = (id: string) => {
    if (data.selectedIds.includes(id)) {
      set('selectedIds', data.selectedIds.filter((x) => x !== id));
    } else {
      set('selectedIds', [...data.selectedIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Creative Management</h2>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Select from your creative library or define new creative details.
        </p>
      </div>

      {/* Creative Library */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Creative Library</h3>
          <a
            href="/marketing/creatives"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}
          >
            <Plus size={12} /> Upload New
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : creatives.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'rgba(148,163,184,0.5)' }}>
            <Upload size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No creatives in library yet.</p>
            <a href="/marketing/creatives" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 inline-block">
              Upload creatives →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {creatives.map((c) => {
              const isSelected = data.selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCreative(c.id)}
                  className="relative rounded-xl overflow-hidden text-left transition-all"
                  style={{
                    border: `2px solid ${isSelected ? '#60a5fa' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isSelected ? '0 0 12px rgba(96,165,250,0.2)' : 'none',
                  }}
                >
                  <div className="aspect-video flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {c.type === 'video' ? (
                      <Video size={24} style={{ color: 'rgba(148,163,184,0.4)' }} />
                    ) : (
                      <ImageIcon size={24} style={{ color: 'rgba(148,163,184,0.4)' }} />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-white truncate">{c.name}</p>
                    <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(148,163,184,0.5)' }}>{c.type || 'image'}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 size={16} className="text-blue-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {data.selectedIds.length > 0 && (
          <p className="text-xs mt-3" style={{ color: 'rgba(96,165,250,0.8)' }}>
            {data.selectedIds.length} creative{data.selectedIds.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Creative Details */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-sm font-semibold text-white">Creative Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Creative Name</label>
            <input style={inputStyle} value={data.creativeName} onChange={(e) => set('creativeName', e.target.value)} placeholder="e.g. Summer Banner v1" />
          </div>
          <div>
            <label style={labelStyle}>Format</label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set('format', f)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: data.format === f ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${data.format === f ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: data.format === f ? '#93c5fd' : 'rgba(148,163,184,0.6)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Primary Text</label>
          <textarea
            style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
            value={data.primaryText}
            onChange={(e) => set('primaryText', e.target.value)}
            placeholder="Your main ad copy here..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Headline</label>
            <input style={inputStyle} value={data.headline} onChange={(e) => set('headline', e.target.value)} placeholder="e.g. Find Your Dream Home Today" />
          </div>
          <div>
            <label style={labelStyle}>Call to Action</label>
            <div className="flex flex-wrap gap-2">
              {CTA_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('cta', c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: data.cta === c ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${data.cta === c ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: data.cta === c ? '#93c5fd' : 'rgba(148,163,184,0.6)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

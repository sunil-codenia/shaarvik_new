'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Bot, Eye, EyeOff, Save, CheckCircle, AlertCircle, Loader2, ArrowLeft, Key } from 'lucide-react';

export default function AISettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const res = await fetch('/api/ai-settings');
        const data = await res.json();
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchKey();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setErrorMsg('Please enter an API key.');
      setSaveStatus('error');
      return;
    }
    setSaving(true);
    setSaveStatus('idle');
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSaveStatus('success');
      setHasKey(true);
      setMaskedKey(`sk-...${apiKey.slice(-4)}`);
      setApiKey('');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save API key.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 max-w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Settings
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground font-500">AI Configuration</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-600 text-foreground">AI Configuration</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure your OpenAI API key for AI-powered features</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : (
          <div className="max-w-lg space-y-5">
            {/* Current Status */}
            <div className="bg-white border border-border rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-600 text-foreground mb-3 flex items-center gap-2">
                <Key size={15} className="text-muted-foreground" />
                Current API Key Status
              </h2>
              {hasKey ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-500 text-green-800">API Key Configured</p>
                    <p className="text-xs text-green-600 mt-0.5 font-mono">{maskedKey}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-500 text-amber-800">No API Key Configured</p>
                    <p className="text-xs text-amber-600 mt-0.5">AI features will not work until you add a key.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Update Key Form */}
            <div className="bg-white border border-border rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-600 text-foreground mb-1">
                {hasKey ? 'Update API Key' : 'Add API Key'}
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Your OpenAI API key is stored securely and used only for AI features in this application.
              </p>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-500 text-foreground mb-1.5">
                    OpenAI API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Get your API key from{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      platform.openai.com
                    </a>
                  </p>
                </div>

                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                    <CheckCircle size={14} className="flex-shrink-0" />
                    API key saved successfully!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !apiKey.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={14} /> Save API Key</>
                  )}
                </button>
              </form>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-xs font-600 text-blue-800 mb-1.5">How it works</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Your API key is stored securely in the database</li>
                <li>• It is used only when you trigger AI features (e.g., Generate Ad Content)</li>
                <li>• You can update it at any time from this page</li>
                <li>• AI features will show a prompt to configure the key if it is missing</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

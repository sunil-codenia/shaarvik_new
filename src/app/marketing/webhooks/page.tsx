'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Zap,
  Globe,
  Activity,
  RefreshCw,
} from 'lucide-react';

interface WebhookLead {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  ad_platform: string | null;
  ad_campaign_name: string | null;
  utm_campaign: string | null;
  webhook_source: string | null;
  webhook_received_at: string | null;
  status: string;
}

interface PlatformConfig {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  webhookPath: string;
  docsUrl: string;
  setupSteps: string[];
  fieldMapping: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'google_ads',
    name: 'Google Ads',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: '🟡',
    webhookPath: '/api/webhooks/google-ads',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/lead-form-extensions',
    setupSteps: [
      'In Google Ads, go to Assets → Lead Form Extensions',
      'Create or edit a Lead Form asset',
      'Under "Webhook", paste the URL below',
      'Set the Key to any value (e.g. "clientflow")',
      'Save and publish your campaign',
    ],
    fieldMapping: 'FULL_NAME, EMAIL, PHONE_NUMBER, COMPANY_NAME',
  },
  {
    id: 'meta_ads',
    name: 'Meta (Facebook/Instagram)',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    icon: '🔵',
    webhookPath: '/api/webhooks/meta-ads',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving',
    setupSteps: [
      'Go to Meta Business Suite → Integrations → Leads Access',
      'Or use Meta Developer Portal → Webhooks',
      'Subscribe to the "leadgen" field for your Page',
      'Paste the URL below as the Callback URL',
      'Set Verify Token to: meta_verify_clientflow',
    ],
    fieldMapping: 'full_name, email, phone_number, company_name',
  },
  {
    id: 'linkedin_ads',
    name: 'LinkedIn Ads',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    borderColor: 'border-sky-200 dark:border-sky-800',
    icon: '🔷',
    webhookPath: '/api/webhooks/linkedin-ads',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/lead-generation/lead-sync-api',
    setupSteps: [
      'In LinkedIn Campaign Manager, go to Account Assets → Lead Gen Forms',
      'Open the Lead Sync API settings',
      'Add a new webhook endpoint with the URL below',
      'Select the campaigns to sync leads from',
      'Save — LinkedIn will POST new leads within minutes',
    ],
    fieldMapping: 'firstName, lastName, emailAddress, phoneNumber, company',
  },
];

export default function WebhooksPage() {
  const { theme } = useTheme();
  const supabase = createClient();
  const [baseUrl, setBaseUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [recentLeads, setRecentLeads] = useState<WebhookLead[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetchWebhookLeads();
  }, []);

  const fetchWebhookLeads = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('leads')
        .select(
          'id, full_name, email, phone, company_name, ad_platform, ad_campaign_name, utm_campaign, webhook_source, webhook_received_at, status'
        )
        .not('webhook_source', 'is', null)
        .order('webhook_received_at', { ascending: false })
        .limit(20);

      if (data) {
        setRecentLeads(data as WebhookLead[]);
        const counts: Record<string, number> = {};
        data.forEach((lead) => {
          if (lead.ad_platform) {
            counts[lead.ad_platform] = (counts[lead.ad_platform] || 0) + 1;
          }
        });
        setLeadCounts(counts);
      }
    } catch (err) {
      console.error('Failed to fetch webhook leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrl(key);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const platformLabel: Record<string, string> = {
    google_ads: 'Google Ads',
    meta_ads: 'Meta Ads',
    linkedin_ads: 'LinkedIn Ads',
  };

  const platformBadge: Record<string, string> = {
    google_ads: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    meta_ads: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    linkedin_ads: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  };

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              Ad Lead Webhooks
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Automatically capture leads from Google Ads, Meta, and LinkedIn into your CRM with full source tracking.
            </p>
          </div>
          <button
            onClick={fetchWebhookLeads}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border p-4 ${p.bgColor} ${p.borderColor}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{p.icon}</span>
                <span className={`text-2xl font-bold ${p.color}`}>
                  {leadCounts[p.id] || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">leads captured</p>
            </div>
          ))}
        </div>

        {/* Platform Webhook Cards */}
        <div className="space-y-6">
          {PLATFORMS.map((platform) => {
            const webhookUrl = `${baseUrl}${platform.webhookPath}`;
            const urlKey = platform.id;
            return (
              <div
                key={platform.id}
                className={`rounded-xl border ${platform.borderColor} bg-white dark:bg-gray-800 overflow-hidden`}
              >
                {/* Card Header */}
                <div className={`px-6 py-4 ${platform.bgColor} border-b ${platform.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{platform.icon}</span>
                      <div>
                        <h2 className={`text-base font-semibold ${platform.color}`}>
                          {platform.name}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {leadCounts[platform.id] || 0} leads captured via webhook
                        </p>
                      </div>
                    </div>
                    <a
                      href={platform.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Platform Docs
                    </a>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Webhook URL */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Webhook URL
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <code className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                          {webhookUrl}
                        </code>
                      </div>
                      <button
                        onClick={() => copyToClipboard(webhookUrl, urlKey)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          copiedUrl === urlKey
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {copiedUrl === urlKey ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Setup Steps + Field Mapping side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Setup Steps
                      </label>
                      <ol className="space-y-1.5">
                        {platform.setupSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${platform.bgColor} ${platform.color}`}>
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Tracked Fields
                      </label>
                      <div className="space-y-2">
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lead Fields</p>
                          <code className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                            {platform.fieldMapping}
                          </code>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source Tracking</p>
                          <code className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                            campaign_id, campaign_name, ad_id, utm_source, utm_medium, utm_campaign
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Webhook Leads */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Recent Webhook Leads
              </h2>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last 20 captured leads
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
              Loading leads...
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No webhook leads yet. Configure a platform above to start capturing leads.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lead</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platform</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Campaign</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Received</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {lead.full_name || '—'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lead.email || lead.phone || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        {lead.ad_platform ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platformBadge[lead.ad_platform] || 'bg-gray-100 text-gray-700'}`}>
                            {platformLabel[lead.ad_platform] || lead.ad_platform}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {lead.ad_campaign_name || lead.utm_campaign || '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {formatDate(lead.webhook_received_at)}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

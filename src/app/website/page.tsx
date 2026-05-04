'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function WebsiteHomePage() {
  const { session } = useAuth();
  return (
    <div className="pt-16">
      {/* Section 1: Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Shaarvik Technologies LLP
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
              Building Smart Digital Solutions{' '}
              <span className="text-blue-400">for Modern Businesses</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl">
              Shaarvik Technologies develops powerful SaaS products to simplify business operations — from project tracking to cost control and beyond.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="https://buildarya.com/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/40"
              >
                Explore Buildarya
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-200"
              >
                {session ? "Go to Dashboard" : "Access CRM Portal"}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>
      {/* Section 2: Featured Product — Buildarya */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-semibold mb-6 uppercase tracking-wide">
                Featured Product
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                Buildarya — Construction & Project Management, Simplified
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Buildarya is a purpose-built SaaS platform for construction and infrastructure businesses. Track every task, control every cost, and manage your workforce — all from one dashboard.
              </p>
              <div className="space-y-4 mb-10">
                {[
                  {
                    icon: '📋',
                    title: 'Project Tracking',
                    desc: 'Real-time visibility into every project milestone and task status.',
                  },
                  {
                    icon: '💰',
                    title: 'Cost Control',
                    desc: 'Monitor budgets, expenses, and financial health across all projects.',
                  },
                  {
                    icon: '👷',
                    title: 'Labour Management',
                    desc: 'Assign, track, and manage your workforce with precision.',
                  },
                ]?.map((item) => (
                  <div key={item?.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                      {item?.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{item?.title}</h3>
                      <p className="text-gray-500 text-sm">{item?.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="https://buildarya.com/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm"
              >
                View Buildarya
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Visual Card */}
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                  <span className="ml-2 text-xs text-slate-500 font-mono">buildarya.shaarvik.com</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400 font-medium">Project Overview</span>
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <div className="space-y-2">
                      {['Site A — Foundation', 'Block B — Framing', 'Tower C — Finishing']?.map((p, i) => (
                        <div key={p} className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${[78, 45, 92]?.[i]}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{[78, 45, 92]?.[i]}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Tasks', value: '142', color: 'text-blue-400' },
                      { label: 'Budget Used', value: '67%', color: 'text-yellow-400' },
                      { label: 'Workers', value: '38', color: 'text-green-400' },
                    ]?.map((stat) => (
                      <div key={stat?.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                        <div className={`text-lg font-bold ${stat?.color}`}>{stat?.value}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{stat?.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-gray-700">Live Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Section 3: Why Shaarvik */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Shaarvik?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              We don't just build software. We build systems that scale with your business.
            </p>
          </div>

          {/* Bento-style grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Product Vision</h3>
              <p className="text-gray-500 leading-relaxed">
                Shaarvik is building a suite of industry-specific SaaS products. Each product is crafted to solve real operational problems — starting with construction, expanding into more verticals.
              </p>
            </div>

            <div className="bg-blue-600 rounded-2xl p-8 text-white">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Scalable Systems</h3>
              <p className="text-white/80 leading-relaxed text-sm">
                Built on modern cloud infrastructure. Our products scale from small teams to enterprise operations without friction.
              </p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 text-white">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Driven Insights</h3>
              <p className="text-white/70 leading-relaxed text-sm">
                Intelligent analytics and reporting built into every product — so you make decisions based on data, not guesswork.
              </p>
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex items-center gap-8">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Industry-Focused Design</h3>
                <p className="text-gray-500 leading-relaxed">
                  Generic tools don't solve specific problems. Every Shaarvik product is designed around the workflows of a specific industry — making adoption fast and ROI immediate.
                </p>
              </div>
              <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                {['Construction', 'Real Estate', 'Manufacturing']?.map((ind) => (
                  <span key={ind} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600">
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Section 4: Future Vision */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 text-xs font-semibold mb-6 uppercase tracking-wide">
                Our Roadmap
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Building the Future of Business Software
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                We're expanding into multiple industries with a clear mission: make enterprise-grade software accessible to every business, regardless of size.
              </p>
              <div className="space-y-5">
                {[
                  {
                    title: 'Expanding into Multiple Industries',
                    desc: 'From construction to retail, logistics to healthcare — Shaarvik products will serve diverse sectors.',
                  },
                  {
                    title: 'Innovative SaaS Solutions',
                    desc: 'Each product leverages the latest in cloud, AI, and automation to deliver measurable business outcomes.',
                  },
                  {
                    title: 'Partner Ecosystem',
                    desc: 'Building integrations and partnerships to create a connected business software ecosystem.',
                  },
                ]?.map((item, i) => (
                  <div key={item?.title} className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{item?.title}</h4>
                      <p className="text-gray-500 text-sm">{item?.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Products in Development', value: '3+', sub: 'Across industries' },
                { label: 'Years of Expertise', value: '5+', sub: 'Enterprise software' },
                { label: 'Industries Targeted', value: '8+', sub: 'Verticals planned' },
                { label: 'Uptime SLA', value: '99.9%', sub: 'Guaranteed reliability' },
              ]?.map((stat) => (
                <div key={stat?.label} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{stat?.value}</div>
                  <div className="text-sm font-semibold text-gray-900 mb-0.5">{stat?.label}</div>
                  <div className="text-xs text-gray-500">{stat?.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* Section 5: CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start managing your projects smarter with Buildarya
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
            Join businesses already using Buildarya to track projects, control costs, and manage their workforce — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-lg"
            >
              {session ? "Go to Dashboard" : "Sign In to CRM"}
            </Link>
            <Link
              href="/website/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-500/30 hover:bg-blue-500/40 border border-white/20 text-white font-semibold rounded-xl transition-all duration-200"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

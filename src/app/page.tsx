'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const services = [
  {
    title: 'Custom Software Development',
    desc: 'Tailored enterprise solutions built to your exact specifications — from concept to deployment.',
    icon: '⬡',
    span: 'col-span-1 row-span-2',
    bg: 'bg-[#0f1923]',
    accent: 'text-[#4fd1c5]',
  },
  {
    title: 'Cloud & DevOps',
    desc: 'Scalable infrastructure, CI/CD pipelines, and cloud-native architectures on AWS, GCP & Azure.',
    icon: '◈',
    span: 'col-span-1 row-span-1',
    bg: 'bg-[#1a2535]',
    accent: 'text-[#f6ad55]',
  },
  {
    title: 'CRM & Business Automation',
    desc: 'Streamline client management, sales pipelines, and operations with intelligent automation.',
    icon: '◎',
    span: 'col-span-1 row-span-1',
    bg: 'bg-[#162032]',
    accent: 'text-[#68d391]',
  },
  {
    title: 'Data & Analytics',
    desc: 'Turn raw data into actionable insights with real-time dashboards and predictive models.',
    icon: '◇',
    span: 'col-span-2 row-span-1',
    bg: 'bg-[#0d1f2d]',
    accent: 'text-[#76e4f7]',
  },
];

const stats = [
  { value: '150+', label: 'Projects Delivered' },
  { value: '8+', label: 'Years of Excellence' },
  { value: '40+', label: 'Enterprise Clients' },
  { value: '99%', label: 'Client Retention' },
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#070d14] text-white font-sans overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 backdrop-blur-md bg-[#070d14]/80 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4fd1c5] to-[#2b6cb0] flex items-center justify-center text-sm font-bold text-white">
            ST
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">Shaarvik Technologies</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#services" className="hover:text-white transition-colors">Services</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
        </div>
        <Link
          href={session ? "/dashboard" : "/login"}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#4fd1c5] text-[#070d14] hover:bg-[#38b2ac] transition-all duration-200 active:scale-95"
        >
          {session ? "Dashboard" : "Client Login"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </nav>
      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Animated background orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #4fd1c5 0%, transparent 70%)',
            transform: `translate(${scrollY * 0.05}px, ${scrollY * -0.03}px)`,
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #2b6cb0 0%, transparent 70%)',
            transform: `translate(${scrollY * -0.04}px, ${scrollY * 0.02}px)`,
          }}
        />
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#4fd1c5 1px, transparent 1px), linear-gradient(90deg, #4fd1c5 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#4fd1c5]/20 bg-[#4fd1c5]/5 text-[#4fd1c5] text-xs font-medium mb-8 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4fd1c5] animate-pulse" />
            Technology Partner for Growing Businesses
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            <span className="text-white">Engineering</span>
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #4fd1c5 0%, #76e4f7 40%, #2b6cb0 100%)' }}
            >
              Digital Excellence
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
            Shaarvik Technologies LLP builds robust software, automates business operations, and delivers measurable results for enterprises across India and beyond.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="group flex items-center gap-3 px-7 py-3.5 rounded-xl text-base font-semibold bg-[#4fd1c5] text-[#070d14] hover:bg-[#38b2ac] transition-all duration-200 shadow-[0_0_30px_rgba(79,209,197,0.25)] hover:shadow-[0_0_40px_rgba(79,209,197,0.4)] active:scale-95"
            >
              {session ? "Go to Dashboard" : "Access CRM Portal"}
              <svg className="group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#services"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold border border-white/10 text-white/70 hover:border-white/25 hover:text-white transition-all duration-200"
            >
              Explore Services
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 text-xs">
          <span>Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
        </div>
      </section>
      {/* ── Stats ── */}
      <section className="relative py-16 border-y border-white/5 bg-[#0a1520]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats?.map((s) => (
            <div key={s?.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #4fd1c5, #76e4f7)' }}>
                {s?.value}
              </div>
              <div className="text-sm text-white/40 mt-1 tracking-wide">{s?.label}</div>
            </div>
          ))}
        </div>
      </section>
      {/* ── Services Bento ── */}
      <section id="services" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="mb-14">
          <p className="text-[#4fd1c5] text-sm font-medium tracking-widest uppercase mb-3">What We Build</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Services that move<br />
            <span className="text-white/40">your business forward</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[180px]">
          {/* Card 1 — tall */}
          <div className={`${services?.[0]?.bg} rounded-2xl p-6 flex flex-col justify-between border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 row-span-2`}>
            <span className={`text-3xl ${services?.[0]?.accent}`}>{services?.[0]?.icon}</span>
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">{services?.[0]?.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{services?.[0]?.desc}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className={`${services?.[1]?.bg} rounded-2xl p-6 flex flex-col justify-between border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1`}>
            <span className={`text-3xl ${services?.[1]?.accent}`}>{services?.[1]?.icon}</span>
            <div>
              <h3 className="text-white font-semibold text-base mb-1">{services?.[1]?.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{services?.[1]?.desc}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className={`${services?.[2]?.bg} rounded-2xl p-6 flex flex-col justify-between border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1`}>
            <span className={`text-3xl ${services?.[2]?.accent}`}>{services?.[2]?.icon}</span>
            <div>
              <h3 className="text-white font-semibold text-base mb-1">{services?.[2]?.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{services?.[2]?.desc}</p>
            </div>
          </div>

          {/* Card 4 — wide */}
          <div className={`${services?.[3]?.bg} rounded-2xl p-6 flex flex-col justify-between border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 col-span-2`}>
            <span className={`text-3xl ${services?.[3]?.accent}`}>{services?.[3]?.icon}</span>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold text-base mb-1">{services?.[3]?.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed max-w-sm">{services?.[3]?.desc}</p>
              </div>
              <Link
                href={session ? "/dashboard" : "/login"}
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold bg-[#4fd1c5]/10 text-[#4fd1c5] border border-[#4fd1c5]/20 hover:bg-[#4fd1c5]/20 transition-colors whitespace-nowrap"
              >
                {session ? "Dashboard →" : "Try CRM →"}
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* ── About ── */}
      <section id="about" className="py-24 px-6 bg-[#0a1520]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[#4fd1c5] text-sm font-medium tracking-widest uppercase mb-3">About Us</p>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Built in India,<br />trusted globally
            </h2>
            <p className="text-white/50 leading-relaxed mb-6">
              Shaarvik Technologies LLP is a registered technology company delivering end-to-end software solutions. From early-stage startups to established enterprises, we partner with organizations to build technology that scales.
            </p>
            <p className="text-white/50 leading-relaxed mb-8">
              Our team of engineers, designers, and strategists brings deep domain expertise across fintech, logistics, healthcare, and professional services.
            </p>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 text-[#4fd1c5] text-sm font-semibold hover:gap-3 transition-all duration-200"
            >
              {session ? "Go to Dashboard" : "Access your workspace"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Visual block */}
          <div className="relative">
            <div className="rounded-2xl border border-white/5 bg-[#0f1923] p-8 space-y-4">
              {[
                { label: 'Registered LLP', value: 'India · MCA Compliant', dot: '#4fd1c5' },
                { label: 'Headquarters', value: 'India', dot: '#f6ad55' },
                { label: 'Core Stack', value: 'Next.js · Node · Python · AWS', dot: '#68d391' },
                { label: 'Engagement Model', value: 'Fixed Price · T&M · Retainer', dot: '#76e4f7' },
              ]?.map((item) => (
                <div key={item?.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: item?.dot }} />
                    <span className="text-white/40 text-sm">{item?.label}</span>
                  </div>
                  <span className="text-white/80 text-sm font-medium">{item?.value}</span>
                </div>
              ))}
            </div>
            {/* Glow */}
            <div className="absolute -inset-4 rounded-3xl opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, #4fd1c5, transparent 70%)' }} />
          </div>
        </div>
      </section>
      {/* ── CTA ── */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl border border-[#4fd1c5]/15 bg-gradient-to-br from-[#0f1923] to-[#0a1520] p-12 md:p-16 overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #4fd1c5, transparent 60%), radial-gradient(circle at 70% 50%, #2b6cb0, transparent 60%)' }} />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
                Log in to the ClientFlow CRM portal to manage your clients, track leads, and grow your business.
              </p>
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold bg-[#4fd1c5] text-[#070d14] hover:bg-[#38b2ac] transition-all duration-200 shadow-[0_0_40px_rgba(79,209,197,0.3)] hover:shadow-[0_0_60px_rgba(79,209,197,0.45)] active:scale-95"
              >
                {session ? "Go to Dashboard" : "Sign In to CRM"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#4fd1c5] to-[#2b6cb0] flex items-center justify-center text-xs font-bold text-white">
              ST
            </div>
            <span className="text-white/40 text-sm">Shaarvik Technologies LLP</span>
          </div>
          <p className="text-white/20 text-xs">© {new Date()?.getFullYear()} Shaarvik Technologies LLP. All rights reserved.</p>
          <Link href={session ? "/dashboard" : "/login"} className="text-[#4fd1c5] text-sm hover:text-[#38b2ac] transition-colors">
            {session ? "Dashboard →" : "Client Login →"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

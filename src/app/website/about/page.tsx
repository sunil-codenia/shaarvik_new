import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-400 text-xs font-medium mb-6">
              About Us
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              We Build Software That{' '}
              <span className="text-blue-400">Actually Works</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
              Shaarvik Technologies LLP is a software company focused on building practical, powerful SaaS products for businesses that need real solutions — not just another app.
            </p>
          </div>
        </div>
      </section>
      {/* About Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About Shaarvik Technologies LLP</h2>
              <div className="space-y-4 text-gray-500 leading-relaxed">
                <p>
                  Shaarvik Technologies LLP is a technology company dedicated to building industry-specific SaaS products that solve real operational challenges. We believe that the best software is built with deep domain knowledge — not just technical skill.
                </p>
                <p>
                  Our team combines expertise in software engineering, business operations, and industry-specific workflows to create products that are intuitive, powerful, and genuinely useful from day one.
                </p>
                <p>
                  We started with construction and project management — an industry historically underserved by modern software — and built Buildarya to address that gap. Our roadmap includes expanding into retail, logistics, manufacturing, and beyond.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { label: 'Founded', value: '2020' },
                  { label: 'Headquarters', value: 'India' },
                  { label: 'Products', value: '1 Live, 2+ Planned' },
                  { label: 'Focus', value: 'B2B SaaS' },
                ]?.map((item) => (
                  <div key={item?.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{item?.label}</div>
                    <div className="text-sm font-semibold text-gray-900">{item?.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {/* Vision Card */}
              <div className="bg-blue-600 rounded-2xl p-8 text-white">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Our Vision</h3>
                <p className="text-blue-100 leading-relaxed text-sm">
                  To become the leading provider of industry-specific SaaS products in emerging markets — building a portfolio of tools that collectively transform how businesses operate across sectors.
                </p>
              </div>

              {/* Mission Card */}
              <div className="bg-slate-900 rounded-2xl p-8 text-white">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Our Mission</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  To build software that solves real problems — not software that looks good in demos. Every product we ship must deliver measurable value to the businesses that use it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: '🎯',
                title: 'Purpose-Built',
                desc: 'Every product is designed for a specific industry, not a generic market.',
              },
              {
                icon: '🔒',
                title: 'Reliability First',
                desc: 'We build systems that businesses can depend on — 99.9% uptime, always.',
              },
              {
                icon: '🚀',
                title: 'Continuous Innovation',
                desc: 'We ship improvements constantly, driven by real user feedback.',
              },
              {
                icon: '🤝',
                title: 'Customer Success',
                desc: 'Our success is measured by the success of the businesses using our products.',
              },
            ]?.map((value) => (
              <div key={value?.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                <div className="text-3xl mb-4">{value?.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{value?.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{value?.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Want to work with us or learn more?</h2>
          <p className="text-gray-500 mb-7">Reach out to our team — we'd love to hear from you.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/website/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Get in Touch
            </Link>
            <Link
              href="/website/products"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              View Our Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

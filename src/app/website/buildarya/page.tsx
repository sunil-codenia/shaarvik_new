import React from 'react';
import Link from 'next/link';

const features = [
  {
    icon: '📋',
    title: 'Task Tracking',
    desc: 'Create, assign, and monitor tasks across multiple projects. Set deadlines, track progress, and get real-time status updates for every work item.',
  },
  {
    icon: '💰',
    title: 'Cost Tracking',
    desc: 'Monitor project budgets, track expenses, and compare planned vs actual costs. Prevent budget overruns before they happen.',
  },
  {
    icon: '👷',
    title: 'Labour Tracking',
    desc: 'Manage your workforce — assign workers to projects, track attendance, monitor productivity, and calculate labour costs automatically.',
  },
  {
    icon: '📊',
    title: 'Reports & Analytics',
    desc: 'Generate detailed reports on project performance, cost summaries, labour utilization, and more. Export to PDF or Excel in one click.',
  },
];

const benefits = [
  {
    title: 'Save Time',
    desc: 'Eliminate manual spreadsheets and paperwork. Automate routine tasks and focus on what matters — delivering projects.',
    icon: '⚡',
  },
  {
    title: 'Reduce Errors',
    desc: 'Centralized data means no more version conflicts, lost records, or miscommunication between teams and sites.',
    icon: '✅',
  },
  {
    title: 'Better Control',
    desc: 'Complete visibility into every project, cost, and resource — so you\'re always in control, never caught off guard.',
    icon: '🎯',
  },
];

const pricingPlans = [
  {
    name: 'Basic',
    price: '₹2,999',
    period: '/month',
    desc: 'Perfect for small contractors and individual project managers.',
    features: [
      'Up to 5 projects',
      'Task & milestone tracking',
      'Basic cost tracking',
      'Up to 10 team members',
      'Standard reports',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '₹7,999',
    period: '/month',
    desc: 'For growing construction businesses managing multiple projects.',
    features: [
      'Unlimited projects',
      'Advanced task management',
      'Full cost & budget control',
      'Labour management module',
      'Up to 50 team members',
      'Advanced reports & exports',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large enterprises with complex operations and custom needs.',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Custom integrations',
      'Dedicated account manager',
      'On-premise deployment option',
      'SLA guarantee',
      'Custom training & onboarding',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function BuildaryaPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-24 md:py-32 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-medium mb-6">
              <span className="text-lg">🏗️</span> Buildarya by Shaarvik Technologies
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Construction Management,{' '}
              <span className="text-blue-400">Finally Done Right</span>
            </h1>
            <p className="text-slate-300 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
              Buildarya is the all-in-one project management platform built specifically for construction and infrastructure businesses. Track tasks, control costs, manage labour — from one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/40"
              >
                Login to Buildarya
              </Link>
              <Link
                href="/website/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-200"
              >
                Request a Demo
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>
      {/* Problem Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The Problems Buildarya Solves
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Construction businesses lose money and time due to fragmented tools and manual processes. Buildarya fixes that.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                problem: 'Projects running over budget',
                solution: 'Real-time cost tracking with alerts when spending approaches limits',
              },
              {
                problem: 'No visibility into site progress',
                solution: 'Live task and milestone tracking across all active projects',
              },
              {
                problem: 'Labour costs out of control',
                solution: 'Automated labour tracking with attendance and productivity metrics',
              },
              {
                problem: 'Reports take days to prepare',
                solution: 'One-click reports generated instantly from live project data',
              },
            ]?.map((item) => (
              <div key={item?.problem} className="flex gap-5 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600 mb-2 line-through opacity-70">{item?.problem}</p>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-gray-700">{item?.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Everything you need to run a construction business, in one platform.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features?.map((feature) => (
              <div key={feature?.title} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-5">
                  {feature?.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature?.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{feature?.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Teams Love Buildarya</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits?.map((benefit) => (
              <div key={benefit?.title} className="text-center p-8 rounded-2xl bg-gradient-to-b from-gray-50 to-white border border-gray-100">
                <div className="text-4xl mb-4">{benefit?.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit?.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{benefit?.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Choose the plan that fits your business. No hidden fees, no surprises.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans?.map((plan) => (
              <div
                key={plan?.name}
                className={`rounded-2xl p-7 flex flex-col ${
                  plan?.highlighted
                    ? 'bg-blue-600 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-950' :'bg-gray-900 border border-gray-800'
                }`}
              >
                {plan?.highlighted && (
                  <div className="text-xs font-bold text-blue-200 bg-blue-500/30 px-3 py-1 rounded-full self-start mb-4 uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-1 ${plan?.highlighted ? 'text-white' : 'text-white'}`}>
                  {plan?.name}
                </h3>
                <p className={`text-sm mb-5 ${plan?.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                  {plan?.desc}
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-3xl font-bold ${plan?.highlighted ? 'text-white' : 'text-white'}`}>
                    {plan?.price}
                  </span>
                  {plan?.period && (
                    <span className={`text-sm ${plan?.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>
                      {plan?.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan?.features?.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <svg
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan?.highlighted ? 'text-blue-200' : 'text-blue-500'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan?.highlighted ? 'text-blue-50' : 'text-gray-400'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan?.name === 'Enterprise' ? (
                  <Link
                    href="/website/contact"
                    className={`inline-flex items-center justify-center w-full px-4 py-3 font-semibold rounded-xl transition-all duration-200 ${
                      plan?.highlighted
                        ? 'bg-white text-blue-700 hover:bg-blue-50' :'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    {plan?.cta}
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    className={`inline-flex items-center justify-center w-full px-4 py-3 font-semibold rounded-xl transition-all duration-200 ${
                      plan?.highlighted
                        ? 'bg-white text-blue-700 hover:bg-blue-50' :'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    {plan?.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Final CTA */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to transform your construction business?</h2>
          <p className="text-gray-500 mb-7">Get started with Buildarya today or talk to our team for a personalized demo.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Get Started Free
            </Link>
            <Link
              href="/website/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

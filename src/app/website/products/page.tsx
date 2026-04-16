import React from 'react';
import Link from 'next/link';

const products = [
  {
    id: 'buildarya',
    name: 'Buildarya',
    tagline: 'Construction & Project Management',
    description:
      'A comprehensive SaaS platform built for construction and infrastructure businesses. Manage projects, control costs, track labour, and generate reports — all from one unified dashboard.',
    status: 'Live',
    statusColor: 'bg-green-100 text-green-700',
    features: ['Task & Project Tracking', 'Cost & Budget Control', 'Labour Management', 'Reports & Analytics'],
    href: '/website/buildarya',
    gradient: 'from-blue-600 to-blue-800',
    icon: '🏗️',
  },
  {
    id: 'coming-soon-1',
    name: 'RetailFlow',
    tagline: 'Retail Operations Management',
    description:
      'Streamline inventory, sales, and staff management for retail businesses. Currently in development as part of Shaarvik\'s expanding product suite.',
    status: 'Coming Soon',
    statusColor: 'bg-amber-100 text-amber-700',
    features: ['Inventory Management', 'POS Integration', 'Staff Scheduling', 'Sales Analytics'],
    href: '#',
    gradient: 'from-amber-500 to-orange-600',
    icon: '🛍️',
  },
  {
    id: 'coming-soon-2',
    name: 'LogiTrack',
    tagline: 'Logistics & Fleet Management',
    description:
      'End-to-end logistics management for fleet operators and supply chain businesses. Planned as the next major product in the Shaarvik ecosystem.',
    status: 'Planned',
    statusColor: 'bg-purple-100 text-purple-700',
    features: ['Fleet Tracking', 'Route Optimization', 'Driver Management', 'Delivery Reports'],
    href: '#',
    gradient: 'from-purple-600 to-indigo-700',
    icon: '🚛',
  },
];

export default function ProductsPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-400 text-xs font-medium mb-6">
            Our Product Suite
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            SaaS Products Built for{' '}
            <span className="text-blue-400">Real Industries</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Each Shaarvik product is purpose-built for a specific industry — delivering focused functionality that generic tools can't match.
          </p>
        </div>
      </section>
      {/* Products Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
              <div
                key={product?.id}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className={`bg-gradient-to-br ${product?.gradient} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{product?.icon}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${product?.statusColor}`}>
                      {product?.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-1">{product?.name}</h2>
                  <p className="text-white/70 text-sm">{product?.tagline}</p>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-gray-500 text-sm leading-relaxed mb-5">{product?.description}</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {product?.features?.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {product?.href !== '#' ? (
                    <Link
                      href={product?.href}
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      View Details
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to get started with Buildarya?</h2>
          <p className="text-gray-500 mb-7">Our flagship product is live and ready for your business.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/website/buildarya"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Explore Buildarya
            </Link>
            <Link
              href="/website/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

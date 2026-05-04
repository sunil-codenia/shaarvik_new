'use client';

import React, { useState } from 'react';

interface FormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  platformId: string;
  saasPlanId: string;
}

interface Platform {
  id: number;
  name: string;
}

interface Plan {
  id: number;
  platform_id: number;
  name: string;
  price: string;
  billing_cycle: string;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({ 
    name: '', email: '', company: '', phone: '', message: '',
    platformId: '', saasPlanId: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);

  React.useEffect(() => {
    fetch('/api/public/config')
      .then(res => res.json())
      .then(data => {
        if (data.platforms) setPlatforms(data.platforms);
        if (data.plans) setAllPlans(data.plans);
      })
      .catch(err => console.error('Failed to load config:', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const newState = { ...prev, [name]: value };
      // Reset plan if platform changes
      if (name === 'platformId') {
        newState.saasPlanId = '';
      }
      return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg('Please fill in all required fields.');
      setStatus('error');
      return;
    }

    // Extra guard: name must not be blank after trimming
    const sanitizedName = form.name.trim();
    if (!sanitizedName) {
      setErrorMsg('Full name is required.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: sanitizedName,
          email: form.email.trim(),
          company: form.company.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
          platformId: form.platformId || null,
          saasPlanId: form.saasPlanId || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to send your message right now.');
      }

      setStatus('success');
      setForm({ 
        name: '', email: '', company: '', phone: '', message: '',
        platformId: '', saasPlanId: '' 
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrorMsg(message);
      setStatus('error');
    }
  };

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-400 text-xs font-medium mb-6">
            Get in Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Let's Start a <span className="text-blue-400">Conversation</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Have a question about our products, want a demo, or interested in partnering with us? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact Information</h2>
                <p className="text-gray-500 leading-relaxed text-sm">
                  Reach out to us for product inquiries, demo requests, partnership opportunities, or general questions.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ),
                    label: 'Email',
                    value: 'hello@shaarvik.com',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ),
                    label: 'Location',
                    value: 'India',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    ),
                    label: 'Website',
                    value: 'shaarvik.com',
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{item.label}</div>
                      <div className="text-sm font-medium text-gray-900">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Looking for a demo?</h4>
                <p className="text-blue-700 text-xs leading-relaxed">
                  Fill out the form and mention "demo request" in your message. Our team will schedule a personalized walkthrough of Buildarya within 24 hours.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a Message</h2>

                {status === 'success' ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Thank you for reaching out. Our team will get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => setStatus('idle')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="you@company.com"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Company Name
                        </label>
                        <input
                          id="company"
                          name="company"
                          type="text"
                          value={form.company}
                          onChange={handleChange}
                          placeholder="Your Organization"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="platformId" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Interested Platform (Optional)
                        </label>
                        <select
                          id="platformId"
                          name="platformId"
                          value={form.platformId}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                        >
                          <option value="">Select a Platform</option>
                          {platforms.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="saasPlanId" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Preferred Plan (Optional)
                        </label>
                        <select
                          id="saasPlanId"
                          name="saasPlanId"
                          value={form.saasPlanId}
                          onChange={handleChange}
                          disabled={!form.platformId}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white disabled:bg-gray-50"
                        >
                          <option value="">Select a Plan</option>
                          {allPlans
                            .filter(p => p.platform_id === Number(form.platformId))
                            .map(p => (
                              <option key={p.id} value={p.id}>{p.name} - Rs. {p.price}/{p.billing_cycle}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us about your project, ask a question, or request a demo..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                        required
                      />
                    </div>

                    {status === 'error' && errorMsg && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm"
                    >
                      {status === 'loading' ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

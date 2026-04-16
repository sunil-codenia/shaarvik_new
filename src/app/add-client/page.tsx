'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';

export default function AddClientPage() {
  const router = useRouter();

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-2xl mx-auto">
        <div className="bg-white border border-border rounded-xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Info size={24} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-600 text-foreground mb-2">Clients Are Created via Lead Conversion</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            To maintain data integrity, clients can only be created by converting a Lead. 
            Start by adding a Lead, then use the <strong>"Convert to Client"</strong> button on the lead detail page.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/leads/add"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all shadow-sm"
            >
              <TrendingUp size={15} /> Add a Lead
            </Link>
            <Link
              href="/leads"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all"
            >
              View All Leads <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

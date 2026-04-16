'use client';

import React, { Suspense } from 'react';
import AddSubscriptionContent from './AddSubscriptionContent';
export default function AddSubscriptionPage() {
  return (
    <Suspense fallback={
      <>
        <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-2xl mx-auto">
          <div className="bg-white border border-border rounded-xl shadow-sm p-6 space-y-4 animate-pulse">
            {[...Array(6)]?.map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
          </div>
        </div>
      </>
    }>
      <AddSubscriptionContent />
    </Suspense>
  );
}

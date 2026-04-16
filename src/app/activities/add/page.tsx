'use client';

import React, { Suspense } from 'react';
import AddActivityContent from './AddActivityContent';

export default function AddActivityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <AddActivityContent />
    </Suspense>
  );
}

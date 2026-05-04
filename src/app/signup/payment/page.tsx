import { Suspense } from 'react';
import PaymentClient from './PaymentClient';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <PaymentClient />
    </Suspense>
  );
}

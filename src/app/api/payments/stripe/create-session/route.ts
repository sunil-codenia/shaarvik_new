import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { planName, amount, itemId, type, billingCycle, startDate, endDate, saasPlanId } = await req.json();
    
    const stripe_secret = process.env.STRIPE_SECRET_KEY;
    if (!stripe_secret) {
      return NextResponse.json({ error: 'Stripe secret not configured' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Stripe expects amount in cents
    const centsAmount = Math.round(Number(amount) * 100);

    // Build the request body for Stripe API (x-www-form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('payment_method_types[]', 'card');
    formData.append('line_items[0][price_data][currency]', 'inr');
    formData.append('line_items[0][price_data][product_data][name]', planName || 'Subscription Plan');
    formData.append('line_items[0][price_data][unit_amount]', String(centsAmount));
    formData.append('line_items[0][quantity]', '1');
    formData.append('mode', 'payment');
    
    // Pass metadata to track what's being paid for
    formData.append('metadata[itemId]', String(itemId || ''));
    formData.append('metadata[type]', String(type || 'conversion'));
    formData.append('metadata[saasPlanId]', String(saasPlanId || ''));
    formData.append('metadata[billingCycle]', String(billingCycle || ''));
    formData.append('metadata[startDate]', String(startDate || ''));
    formData.append('metadata[endDate]', String(endDate || ''));

    formData.append('success_url', `${siteUrl}/${type === 'conversion' ? 'leads' : 'subscriptions'}?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    formData.append('cancel_url', `${siteUrl}/${type === 'conversion' ? 'leads' : 'subscriptions'}?payment=cancel`);
    
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${stripe_secret}`,
      },
      body: formData.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Stripe Session Error:', data);
      throw new Error(data.error?.message || 'Stripe session creation failed');
    }

    return NextResponse.json({ url: data.url, sessionId: data.id });
  } catch (err: any) {
    console.error('Stripe Create Session Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

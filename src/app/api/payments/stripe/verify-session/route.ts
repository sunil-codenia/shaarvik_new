import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    
    const stripe_secret = process.env.STRIPE_SECRET_KEY;
    if (!stripe_secret) {
      return NextResponse.json({ error: 'Stripe secret not configured' }, { status: 500 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripe_secret}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Stripe Verify Session Error:', data);
      throw new Error(data.error?.message || 'Stripe session retrieval failed');
    }

    // Verify payment status
    if (data.payment_status === 'paid') {
      return NextResponse.json({ 
        success: true, 
        status: data.status,
        payment_status: data.payment_status,
        metadata: data.metadata,
        amount_total: data.amount_total / 100 // Convert cents to INR
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Payment not completed',
        status: data.status,
        payment_status: data.payment_status
      });
    }

  } catch (err: any) {
    console.error('Stripe Verify Session Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

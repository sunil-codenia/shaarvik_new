import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', receipt = 'receipt_123' } = await req.json();
    
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 });
    }

    // Razorpay expects amount in the smallest currency unit (paise for INR)
    const paiseAmount = Math.round(Number(amount) * 100);

    const auth = Buffer.from(`${key_id}:${key_secret}`).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: paiseAmount,
        currency,
        receipt,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Razorpay Order Error:', data);
      throw new Error(data.error?.description || 'Razorpay order creation failed');
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Razorpay Create Order Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

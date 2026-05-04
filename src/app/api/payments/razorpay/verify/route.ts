import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });
    }

    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      return NextResponse.json({ success: true, message: 'Payment verified' });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Razorpay Verify Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

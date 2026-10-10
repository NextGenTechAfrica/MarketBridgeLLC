import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PaystackWebhookHandler } from '@/lib/payment/paystack-webhook-handler';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? '';

// POST /api/webhooks/paystack
export async function POST(req: NextRequest) {
  // ── 1. Read raw body for signature verification ───────────────────────────
  const bodyText = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';

  // ── 2. Verify HMAC-SHA512 signature ──────────────────────────────────────
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(bodyText)
    .digest('hex');

  if (!signature || hash !== signature) {
    console.warn('[paystack-webhook] Invalid signature — rejecting request');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // ── 3. Parse JSON ─────────────────────────────────────────────────────────
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    console.error('[paystack-webhook] Malformed JSON payload');
    return new NextResponse('Bad payload', { status: 400 });
  }

  // ── 4. Delegate to idempotent handler ─────────────────────────────────────
  try {
    await PaystackWebhookHandler.handleEvent(
      event as unknown as Parameters<typeof PaystackWebhookHandler.handleEvent>[0]
    );
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[paystack-webhook] Handler error:', err);
    // Return 500 so Paystack retries the event
    return new NextResponse('Internal error', { status: 500 });
  }
}

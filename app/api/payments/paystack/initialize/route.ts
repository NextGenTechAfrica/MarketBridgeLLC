import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { paystackClient } from '@/lib/payment/paystack';
import { EscrowStage } from '@/lib/escrow/state-machine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InitializeRequestBody {
  orderId: string;
  userId: string;
}

// ─── Route ────────────────────────────────────────────────────────────────────

// POST /api/payments/paystack/initialize
export async function POST(req: Request) {
  try {
    // ── Parse body ──────────────────────────────────────────────────────────
    let body: InitializeRequestBody;
    try {
      body = (await req.json()) as InitializeRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { orderId, userId } = body;
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const supabase = await createServerSupabaseClient();

    // ── 1. Fetch order ───────────────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        buyer_id,
        seller_id,
        total_amount,
        agreed_price,
        amount,
        buyer:buyer_id ( email, full_name ),
        seller:seller_id ( business_name )
      `)
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const typedOrder = order as unknown as {
      id: string;
      status: string;
      buyer_id: string;
      seller_id: string;
      total_amount: number | null;
      agreed_price: number | null;
      amount: number | null;
      buyer: { email: string; full_name: string | null } | null;
      seller: { business_name: string | null } | null;
    };

    // ── 2. Authorization: only the buyer can initiate payment ────────────────
    if (typedOrder.buyer_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 3. State validation: must be offer_accepted ──────────────────────────
    if (typedOrder.status !== EscrowStage.OFFER_ACCEPTED) {
      return NextResponse.json(
        {
          error: `Order status is "${typedOrder.status}". Payment can only be initialized from "${EscrowStage.OFFER_ACCEPTED}" status.`,
        },
        { status: 400 }
      );
    }

    // ── 4. Verify buyer email ────────────────────────────────────────────────
    const buyerEmail = typedOrder.buyer?.email;
    if (!buyerEmail) {
      return NextResponse.json(
        { error: 'Buyer email not found — cannot initialize payment' },
        { status: 422 }
      );
    }

    // ── 5. Calculate total to charge (prefer total_amount, fall back to amount) ──
    const chargeAmount = typedOrder.total_amount ?? typedOrder.amount ?? 0;
    if (chargeAmount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 422 });
    }

    // ── 6. Generate unique reference ─────────────────────────────────────────
    const reference = `MB_${orderId}_${Date.now()}`;

    // ── 7. Initialize Paystack transaction ───────────────────────────────────
    const result = await paystackClient.initializeTransaction({
      email: buyerEmail,
      amount: Math.round(chargeAmount * 100), // kobo
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
      metadata: {
        order_id: orderId,
        buyer_id: userId,
        seller_id: typedOrder.seller_id,
        custom_fields: [
          {
            display_name: 'Order ID',
            variable_name: 'order_id',
            value: orderId,
          },
          {
            display_name: 'Seller',
            variable_name: 'seller_name',
            value: typedOrder.seller?.business_name ?? 'Seller',
          },
        ],
      },
    });

    if (!result.status) {
      return NextResponse.json(
        { error: `Payment initialization failed: ${result.message}` },
        { status: 502 }
      );
    }

    // ── 8. Update order to awaiting_payment with reference ───────────────────
    await supabase
      .from('orders')
      .update({
        status: EscrowStage.AWAITING_PAYMENT,
        paystack_reference: reference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      authorization_url: result.data.authorization_url,
      reference,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Initialize Payment Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

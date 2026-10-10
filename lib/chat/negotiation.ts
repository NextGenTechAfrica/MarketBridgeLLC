/**
 * MarketBridge Chat Negotiation
 * Connects price offers in chat to binding order creation.
 */

import { createClient } from '@/lib/supabase/client';
import { EscrowStage } from '@/lib/escrow/state-machine';

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceOffer {
  id: string;
  chat_id: string;
  sender_id: string;
  amount: number;
  listing_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface SendOfferResult {
  success: boolean;
  error?: string;
  offerId?: string;
}

export interface AcceptOfferResult {
  success: boolean;
  error?: string;
  orderId?: string;
}

type SubscriptionTier = 'basic' | 'standard' | 'pro';

const FEE_RATES: Record<SubscriptionTier, number> = {
  basic: 0.025,    // 2.5%
  standard: 0.015, // 1.5%
  pro: 0.015,      // 1.5%
};

// ─── sendPriceOffer ───────────────────────────────────────────────────────────

/**
 * Sends a price offer from a buyer in a chat thread.
 * - Validates the sender is the buyer in that chat.
 * - Validates the amount is within 50%–150% of the listing price.
 * - Ensures no other pending offer exists in the chat.
 * - Creates a price_offer record with a 24-hour expiry.
 * - Inserts a chat message and notifies the seller.
 */
export async function sendPriceOffer(
  chatId: string,
  senderId: string,
  amount: number,
  listingId: string
): Promise<SendOfferResult> {
  if (!chatId || !senderId || !listingId) {
    return { success: false, error: 'chatId, senderId, and listingId are required' };
  }
  if (!amount || amount <= 0) {
    return { success: false, error: 'Offer amount must be greater than zero' };
  }

  // 1. Verify sender is the buyer in this chat
  const { data: chat, error: chatErr } = await supabase
    .from('chats')
    .select('buyer_id, seller_id, listing_id')
    .eq('id', chatId)
    .single();

  if (chatErr || !chat) return { success: false, error: 'Chat not found' };

  const typedChat = chat as { buyer_id: string; seller_id: string; listing_id: string | null };

  if (typedChat.buyer_id !== senderId) {
    return { success: false, error: 'Only the buyer can make price offers' };
  }

  // 2. Validate amount against listing price (must be within 50%–150%)
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('price, title')
    .eq('id', listingId)
    .single();

  if (listingErr || !listing) return { success: false, error: 'Listing not found' };

  const typedListing = listing as { price: number; title: string };
  const minPrice = typedListing.price * 0.5;
  const maxPrice = typedListing.price * 1.5;

  if (amount < minPrice || amount > maxPrice) {
    return {
      success: false,
      error: `Offer must be between ₦${minPrice.toLocaleString()} and ₦${maxPrice.toLocaleString()} (50%–150% of listing price ₦${typedListing.price.toLocaleString()})`,
    };
  }

  // 3. Check for an existing pending offer in this chat
  const { data: pending } = await supabase
    .from('price_offers')
    .select('id')
    .eq('chat_id', chatId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending) {
    return {
      success: false,
      error: 'You already have a pending offer in this chat. Cancel it before making a new one.',
    };
  }

  // 4. Create the offer
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: offer, error: offerErr } = await supabase
    .from('price_offers')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      amount,
      listing_id: listingId,
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (offerErr || !offer) {
    return { success: false, error: offerErr?.message ?? 'Failed to create offer' };
  }

  const offerId = (offer as { id: string }).id;

  // 5. Insert chat message with offer metadata
  await supabase.from('chat_messages').insert({
    chat_id: chatId,
    sender_id: senderId,
    message_type: 'price_offer',
    content: `Offered ₦${amount.toLocaleString()}`,
    metadata: {
      offer_id: offerId,
      offer_amount: amount,
      offer_status: 'pending',
      expires_at: expiresAt,
    },
    created_at: new Date().toISOString(),
  });

  // 6. Notify the seller
  await supabase.from('notifications').insert({
    user_id: typedChat.seller_id,
    type: 'price_offer',
    message: `New offer of ₦${amount.toLocaleString()} received for "${typedListing.title}"`,
    read: false,
    created_at: new Date().toISOString(),
  });

  return { success: true, offerId };
}

// ─── acceptPriceOffer ─────────────────────────────────────────────────────────

/**
 * Accepts a pending price offer, creating a binding order.
 * - Verifies the caller is the seller in that chat.
 * - Checks the offer has not expired.
 * - Calculates escrow fee based on seller subscription tier.
 * - Applies MarketCoins discount (up to 50% of fee).
 * - Creates an order in `offer_accepted` status.
 * - Deducts MarketCoins from buyer.
 * - Links the order back to the chat.
 * - Inserts a system message prompting payment.
 */
export async function acceptPriceOffer(
  offerId: string,
  sellerId: string
): Promise<AcceptOfferResult> {
  if (!offerId || !sellerId) {
    return { success: false, error: 'offerId and sellerId are required' };
  }

  // 1. Fetch offer with parent chat
  const { data: offer, error: offerErr } = await supabase
    .from('price_offers')
    .select('*, chats!inner(buyer_id, seller_id)')
    .eq('id', offerId)
    .single();

  if (offerErr || !offer) return { success: false, error: 'Offer not found' };

  const typedOffer = offer as {
    id: string;
    chat_id: string;
    sender_id: string;
    amount: number;
    listing_id: string;
    status: string;
    expires_at: string;
    chats: { buyer_id: string; seller_id: string };
  };

  // 2. Verify caller is the seller in this chat
  if (typedOffer.chats.seller_id !== sellerId) {
    return { success: false, error: 'Only the seller can accept this offer' };
  }

  if (typedOffer.status !== 'pending') {
    return { success: false, error: `Offer is already "${typedOffer.status}"` };
  }

  // 3. Check expiry
  if (new Date(typedOffer.expires_at) < new Date()) {
    await supabase
      .from('price_offers')
      .update({ status: 'expired' })
      .eq('id', offerId);
    return { success: false, error: 'This offer has expired' };
  }

  // 4. Mark offer as accepted
  await supabase
    .from('price_offers')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', offerId);

  // 5. Fetch listing + seller subscription tier
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('price, title, seller:seller_id(subscription_tier, subscription_expires_at)')
    .eq('id', typedOffer.listing_id)
    .single();

  if (listingErr || !listing) return { success: false, error: 'Listing not found' };

  const typedListing = listing as unknown as {
    price: number;
    title: string;
    seller: { subscription_tier: string | null; subscription_expires_at: string | null } | null;
  };

  // Determine effective tier (fall back to basic if subscription expired)
  const isActive =
    typedListing.seller?.subscription_expires_at != null &&
    new Date(typedListing.seller.subscription_expires_at) > new Date();
  const tier: SubscriptionTier = isActive
    ? ((typedListing.seller?.subscription_tier ?? 'basic') as SubscriptionTier)
    : 'basic';

  const feeRate = FEE_RATES[tier] ?? FEE_RATES.basic;
  const escrowFee = typedOffer.amount * feeRate;

  // 6. Calculate MarketCoins discount (up to 50% of fee)
  const buyerId = typedOffer.chats.buyer_id;

  const { data: buyer } = await supabase
    .from('users')
    .select('coins_balance')
    .eq('id', buyerId)
    .single();

  const buyerCoins = (buyer as { coins_balance: number | null } | null)?.coins_balance ?? 0;
  const maxDiscount = escrowFee * 0.5;
  const coinDiscount = Math.min(buyerCoins, Math.floor(maxDiscount));
  const finalEscrowFee = escrowFee - coinDiscount;
  const totalAmount = typedOffer.amount + finalEscrowFee;
  const sellerPayout = typedOffer.amount - finalEscrowFee;

  // 7. Create order in offer_accepted status
  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: typedOffer.listing_id,
      original_price: typedListing.price,
      agreed_price: typedOffer.amount,
      escrow_fee: finalEscrowFee,
      marketcoins_discount: coinDiscount,
      total_amount: totalAmount,
      seller_payout: sellerPayout,
      status: EscrowStage.OFFER_ACCEPTED,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (orderErr || !newOrder) {
    return { success: false, error: orderErr?.message ?? 'Failed to create order' };
  }

  const orderId = (newOrder as { id: string }).id;

  // 8. Deduct used MarketCoins from buyer
  if (coinDiscount > 0) {
    await supabase
      .from('users')
      .update({
        coins_balance: buyerCoins - coinDiscount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', buyerId);

    await supabase.from('coin_transactions').insert({
      user_id: buyerId,
      amount: -coinDiscount,
      type: 'spend',
      source_id: orderId,
      description: `Used ${coinDiscount} MC for escrow fee discount on order #${orderId}`,
      created_at: new Date().toISOString(),
    });
  }

  // 9. Link chat → active order
  await supabase
    .from('chats')
    .update({ active_order_id: orderId })
    .eq('id', typedOffer.chat_id);

  // 10. System message in chat with Pay Now metadata
  await supabase.from('chat_messages').insert({
    chat_id: typedOffer.chat_id,
    sender_id: 'system',
    message_type: 'system',
    content: `✅ Offer accepted! Order #${orderId} created. Total to pay: ₦${totalAmount.toLocaleString()}`,
    metadata: {
      order_id: orderId,
      total_amount: totalAmount,
      action: 'pay_now',
      pay_url: `/payment/checkout?orderId=${orderId}`,
    },
    created_at: new Date().toISOString(),
  });

  return { success: true, orderId };
}

// ─── rejectPriceOffer ─────────────────────────────────────────────────────────

/**
 * Rejects a pending price offer. Seller only.
 */
export async function rejectPriceOffer(
  offerId: string,
  sellerId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: offer, error: offerErr } = await supabase
    .from('price_offers')
    .select('id, status, chat_id, chats!inner(seller_id)')
    .eq('id', offerId)
    .single();

  if (offerErr || !offer) return { success: false, error: 'Offer not found' };

  const typedOffer = offer as unknown as {
    id: string;
    status: string;
    chat_id: string;
    chats: { seller_id: string };
  };

  if (typedOffer.chats.seller_id !== sellerId) {
    return { success: false, error: 'Only the seller can reject this offer' };
  }

  if (typedOffer.status !== 'pending') {
    return { success: false, error: `Offer is already "${typedOffer.status}"` };
  }

  await supabase
    .from('price_offers')
    .update({ status: 'rejected' })
    .eq('id', offerId);

  await supabase.from('chat_messages').insert({
    chat_id: typedOffer.chat_id,
    sender_id: 'system',
    message_type: 'system',
    content: 'Offer was declined. Feel free to make another offer.',
    metadata: { offer_id: offerId, offer_status: 'rejected' },
    created_at: new Date().toISOString(),
  });

  return { success: true };
}

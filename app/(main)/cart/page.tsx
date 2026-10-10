'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Trash2, ShoppingBag, ArrowRight, ArrowLeft, ShieldCheck,
    Minus, Plus, Store, Truck, Sparkles, CheckCircle2
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, clearCart, total, itemCount } = useCart();
    const router = useRouter();

    if (itemCount === 0) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-background">
                <div className="container mx-auto max-w-md text-center">
                    <EmptyState
                        icon={<ShoppingBag className="w-12 h-12 text-[#FF6200]" />}
                        title="Your Cart is Empty"
                        description="Explore campus listings and find great deals on textbooks, gadgets, and food."
                        actionLabel="Browse Marketplace"
                        actionHref="/marketplace"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">

                {/* Back Button & Breadcrumbs */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4 text-[#FF6200]" />
                        <span>Continue Shopping</span>
                    </button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCart}
                        className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                    >
                        Clear Cart
                    </Button>
                </div>

                {/* Title Section */}
                <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-heading">
                            Shopping Cart
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            You have <strong className="text-foreground">{itemCount} item{itemCount !== 1 ? 's' : ''}</strong> staged for campus escrow checkout
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 self-start sm:self-auto">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Zero-Fraud Escrow Protection</span>
                    </div>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Cart Items List */}
                    <div className="lg:col-span-8 space-y-4">
                        {items.map((item) => (
                            <div
                                key={item.listingId}
                                className="bg-card border border-border hover:border-[#FF6200]/30 rounded-3xl p-4 sm:p-6 transition-all duration-300 shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                            >
                                <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
                                    {/* Thumbnail */}
                                    <Link
                                        href={`/listings/${item.listingId}`}
                                        className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl overflow-hidden border border-border relative bg-muted group block"
                                    >
                                        {item.image ? (
                                            <Image
                                                src={item.image}
                                                alt={item.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                <Store className="h-8 w-8 opacity-30" />
                                            </div>
                                        )}
                                    </Link>

                                    {/* Details */}
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <Link
                                            href={`/listings/${item.listingId}`}
                                            className="font-bold text-base sm:text-lg text-foreground hover:text-[#FF6200] transition-colors line-clamp-1 font-heading block"
                                        >
                                            {item.title}
                                        </Link>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Truck className="h-3.5 w-3.5 text-[#FF6200]" />
                                            Campus Delivery / Hostel Pickup Available
                                        </p>
                                        <p className="text-sm font-black text-[#FF6200] font-heading">
                                            ₦{item.price.toLocaleString()}
                                            <span className="text-[11px] font-normal text-muted-foreground ml-1">each</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Quantity & Actions */}
                                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.listingId, item.quantity - 1)}
                                            className="w-7 h-7 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                            aria-label="Decrease quantity"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center font-bold text-sm text-foreground">
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                                            className="w-7 h-7 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                            aria-label="Increase quantity"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>

                                    {/* Item Total */}
                                    <div className="text-right min-w-[90px]">
                                        <p className="text-base font-black text-foreground font-heading">
                                            ₦{(item.price * item.quantity).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(item.listingId)}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                        title="Remove item"
                                        aria-label="Remove item"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Safety Note */}
                        <div className="p-4 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-[#FF6200]/20 flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-[#FF6200] shrink-0 mt-0.5" />
                            <div className="text-xs text-muted-foreground leading-relaxed">
                                <strong className="text-foreground">Zero-Fraud Campus Guarantee:</strong> Every payment on MarketBridge is held securely in escrow. Sellers are only paid once you confirm that your item has been delivered in good condition.
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary (Sticky) */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
                        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-foreground font-heading">
                                    Order Summary
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Review total and proceed to escrow payment
                                </p>
                            </div>

                            <div className="space-y-3.5 text-sm">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Items Subtotal ({itemCount})</span>
                                    <span className="font-bold text-foreground">₦{total.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Campus Delivery / Meetup</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Campus Drop-off</span>
                                </div>

                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Escrow Protection Fee</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Free (0%)</span>
                                </div>

                                <Separator />

                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="text-base font-bold text-foreground">Estimated Total</span>
                                    <span className="text-3xl font-black text-[#FF6200] font-heading">
                                        ₦{total.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <Button
                                    className="w-full h-13 bg-[#FF6200] hover:bg-[#E55800] text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#FF6200]/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                    onClick={() => router.push('/checkout')}
                                    disabled={items.length === 0}
                                >
                                    <span>Proceed to Escrow Checkout</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    asChild
                                    className="w-full h-11 rounded-2xl text-xs font-bold border-border"
                                >
                                    <Link href="/marketplace">
                                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                                        Continue Browsing
                                    </Link>
                                </Button>
                            </div>

                            <div className="pt-2 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>100% Refundable until order confirmed</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

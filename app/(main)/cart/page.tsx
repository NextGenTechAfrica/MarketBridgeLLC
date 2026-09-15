'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { items, removeFromCart, clearCart, total, itemCount } = useCart();
    const router = useRouter();

    if (itemCount === 0) {
        return (
            <div className="min-h-screen pt-40 pb-20 px-4 relative flex flex-col items-center">
                <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none z-0" />
                <div className="container mx-auto max-w-lg relative z-10 pt-16">
                    <EmptyState
                        icon={<ShoppingBag className="w-12 h-12 text-[#FF6200]" />}
                        title="Cart Empty"
                        description="No active items in your cart."
                        actionLabel="Browse Marketplace"
                        actionHref="/marketplace"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-40 pb-20 bg-black text-white relative selection:bg-[#FF6200] selection:text-black">
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none z-0" />

            <div className="container px-6 mx-auto relative z-10 space-y-8">
                {/* Back Button */}
                <div>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white/80 hover:text-white border border-white/10 transition-all active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4 text-[#FF6200]" /> Back to Marketplace
                    </button>
                </div>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 font-heading">Asset Staging Dashboard</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic font-heading">
                            Acquisition <span className="text-[#FF6200]">Cart</span>
                        </h1>
                        <p className="text-white/40 font-medium max-w-xl italic">
                            Reviewing <span className="text-white font-bold">{itemCount} staged assets</span> for immediate deployment.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={clearCart} className="h-14 px-8 border-white/10 text-white/40 hover:text-[#FF6200] hover:border-[#FF6200]/30 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all font-heading">
                            Purge Dashboard
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-6">
                        {items.map((item) => (
                            <div key={item.listingId} className="glass-card p-6 flex flex-col sm:flex-row gap-8 group transition-all duration-500 hover:border-[#FF6200]/20">
                                <div className="h-32 w-32 shrink-0 rounded-2xl overflow-hidden border border-white/5 relative bg-zinc-900">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <ShoppingBag className="h-8 w-8 text-white/10" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black uppercase tracking-tighter font-heading italic line-clamp-1">{item.title}</h3>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest font-heading">Qty: 0{item.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-[#FF6200] italic font-heading">₦{item.price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4 border-t border-white/5 mt-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#FF6200] transition-colors py-2 px-4 group/remove"
                                            onClick={() => removeFromCart(item.listingId)}
                                        >
                                            <Trash2 className="h-3 w-3 mr-2 group-hover:scale-110 transition-transform" />
                                            De-authorize
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-10 rounded-[3rem] sticky top-32 space-y-10 border-[#FF6200]/10">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black uppercase tracking-tighter font-heading italic">Cycle Summary</h3>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Authorization pending</p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-heading">Gross Value</span>
                                    <span className="text-sm font-bold">₦{total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-heading">System Fees</span>
                                    <span className="text-sm font-black text-[#FF6200] uppercase tracking-tighter italic">0.0% (WAVED)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-heading">Checkout Routing</span>
                                    <span className="text-sm font-black text-[#FF6200] uppercase tracking-tighter italic">DIRECTED</span>
                                </div>

                                <Separator className="bg-white/5" />

                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest font-heading mb-1">Total Payload</span>
                                    <span className="text-4xl font-black text-[#FF6200] tracking-tighter italic font-heading">₦{total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6">
                                <Button
                                    className="w-full h-16 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest transition-all font-heading shadow-[0_10px_40px_rgba(255,98,0,0.2)] border-none"
                                    onClick={() => router.push('/checkout')}
                                    disabled={items.length === 0}
                                >
                                    Verify & Proceed
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <Button variant="ghost" className="w-full h-14 text-white/40 font-black uppercase tracking-widest text-[10px] transition-all hover:text-white" asChild>
                                    <Link href="/listings">
                                        <ArrowLeft className="mr-2 h-3 w-3" />
                                        Continue Scanning
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

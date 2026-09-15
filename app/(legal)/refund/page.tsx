'use client';

import React from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RefundPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#FF6200] selection:text-black pt-28 pb-20">
            <div className="container px-4 mx-auto max-w-4xl space-y-8">
                <Button
                    asChild
                    variant="ghost"
                    className="text-white/40 hover:text-white pl-0 gap-2 mb-8"
                >
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4" /> Back to MarketBridge
                    </Link>
                </Button>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
                        Refund & <span className="text-[#FF6200]">Escrow</span>
                    </h1>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                        Last Updated: February 16, 2026 | Version: 1.0 (Beta)
                    </p>
                    <p className="text-white text-sm font-medium mt-2">
                        MarketBridge, a platform operated by NextGen Tech, processes refunds via Paystack.
                    </p>
                </div>

                <div className="prose prose-invert prose-orange max-w-none space-y-8 text-white/70 font-medium">
                    <section className="glass-card p-8 rounded-3xl border-white/5 bg-zinc-900/50">
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-4">1. Escrow Protection</h2>
                        <p>
                            All transactions on MarketBridge are protected by our <strong>Escrow-to-Dashboard</strong> System.
                            Funds are held securely by our payment partner (Paystack) and are only released to the seller after the buyer confirms delivery
                            or the 24-hour inspection period lapses without a dispute.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">2. Buyer Protection & Refunds</h2>
                        <p>
                            You are eligible for a full refund (excluding platform fees) if:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>The seller fails to deliver the item within the agreed timeframe.</li>
                            <li>The item received is significantly different from the marketplace description.</li>
                            <li>The item is defective or non-functional (and not listed as such).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">3. Dispute Resolution</h2>
                        <p>
                            If a dispute arises, the funds remain locked in escrow. MarketBridge administrative personnel will review the case
                            within 48 hours. Our decision based on evidence provided by both parties is final.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">4. Non-Refundable Items</h2>
                        <p>
                            Digital services already rendered, perishable items once delivered, and platform subscription fees for sellers are strictly non-refundable.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-white/10">
                        <p className="text-xs text-white/40 uppercase tracking-widest italic flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-[#FF6200]" />
                            Secure Escrow enabled for all verified transactions.
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-4">
                            Contact Support: support@marketbridge.com.ng
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
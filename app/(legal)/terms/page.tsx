'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TermsPage() {
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
                        Terms of <span className="text-[#FF6200]">Service</span>
                    </h1>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                        Last Updated: February 16, 2026 | Version: 1.0 (Beta)
                    </p>
                    <p className="text-white text-sm font-medium mt-2">
                        These Terms are between you and MarketBridge, a platform operated by NextGen Tech.
                    </p>
                </div>

                <div className="prose prose-invert prose-orange max-w-none space-y-8 text-white/70 font-medium">
                    <section className="glass-card p-8 rounded-3xl border-white/5 bg-zinc-900/50">
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-4">1. Beta Testing Acknowledgment</h2>
                        <p>
                            You acknowledge that MarketBridge is currently in a <strong>Live Campus Beta</strong> phase.
                            The platform is provided "as is" and "as available". You may encounter bugs, service interruptions, or data inconsistencies.
                            MarketBridge shall not be liable for any loss of data or service downtime during this testing period.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">2. Platform Role (Intermediary Only)</h2>
                        <p>
                            MarketBridge acts solely as a technical intermediary connecting Student Sellers with Buyers.
                            We do not own, inspect, store, or deliver the goods listed. We are not a party to the actual transaction between buyers and sellers
                            outside of the escrow processing scope.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">3. User Eligibility</h2>
                        <p>
                            To use this Service, you must be:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>At least 18 years of age (or of legal age in your jurisdiction).</li>
                            <li>A verifiable student of a recognized Abuja institution (for Sellers).</li>
                            <li>Capable of forming a binding contract under Nigerian Law.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">4. Payment & Escrow</h2>
                        <p>
                            Payments are processed via Paystack under Nigerian banking regulations.
                            Funds are held in escrow until delivery is confirmed or the inspection period (24 hours) lapses.
                            MarketBridge charges a platform fee which is non-refundable once the transaction is initiated.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">5. Prohibited Items</h2>
                        <p>
                            Strictly prohibited: Illegal substances, weapons, stolen goods, academic fraud material, or any item violating Campus regulations.
                            Immediate ban and report to University Security/Nigerian Police Force applies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">6. Governing Law</h2>
                        <p>
                            These Terms shall be governed by the laws of the Federal Republic of Nigeria, specifically the
                            Companies and Allied Matters Act (CAMA) 2020 and FCCPC guidelines. Jurisdiction resides with the courts of the Federal Capital Territory (FCT), Abuja.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-white/10">
                        <p className="text-xs text-white/40 uppercase tracking-widest">
                            Contact Legal: legal@marketbridge.com.ng | Abuja, FCT
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
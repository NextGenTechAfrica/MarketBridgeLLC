'use client';

import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PrivacyPage() {
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
                        Privacy <span className="text-[#FF6200]">Policy</span>
                    </h1>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                        Last Updated: February 16, 2026 | Version: 1.0 (Beta)
                    </p>
                    <p className="text-white text-sm font-medium mt-2">
                        MarketBridge, a platform operated by NextGen Tech, is the data controller under NDPA 2023.
                    </p>
                </div>

                <div className="prose prose-invert prose-orange max-w-none space-y-8 text-white/70 font-medium">
                    <section className="glass-card p-8 rounded-3xl border-white/5 bg-zinc-900/50">
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-4">1. Data Collection</h2>
                        <p>
                            During this beta phase, we collect:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>Identity Data: Name, email, and university affiliation.</li>
                            <li>Financial Data: Transaction history (processed securely via Paystack).</li>
                            <li>Technical Data: IP address and location (for Abuja Dashboard routing).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">2. Use of Data</h2>
                        <p>
                            Your data is used specifically to facilitate campus commerce, prevent fraud, and improve platform reliability.
                            We do not sell student data to third-party advertisers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">3. NDPA Compliance</h2>
                        <p>
                            MarketBridge operates in compliance with the <strong>Nigeria Data Protection Act (NDPA) 2023</strong>.
                            You have the right to request access to, correction of, or deletion of your personal data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">4. Security Layers</h2>
                        <p>
                            All data is encrypted in transit and at rest using industry-standard protocols.
                            Administrative access is restricted to authorized personnel via secure Dashboard Campuss.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-white/10">
                        <p className="text-xs text-white/40 uppercase tracking-widest italic flex items-center gap-2">
                            <Shield className="h-4 w-4 text-[#FF6200]" />
                            Your data privacy is secured by MarketBridge Systems.
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-4">
                            Contact Data Protection Officer: dpo@marketbridge.com.ng
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
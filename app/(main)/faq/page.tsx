import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Shield, Eye, MessageSquare, TrendingUp, Users, Lock, ArrowLeft } from 'lucide-react';

export default function FAQPage() {
    const faqs = [
        {
            question: "What makes MarketBridge 'trustless'?",
            answer: "In a trustless marketplace, you don't need to blindly trust sellers. We provide transparency through verified seller badges, public reviews, transaction history, and clear order tracking. The platform's mechanisms replace the need for trust."
        },
        {
            question: "How does payment on delivery work?",
            answer: "You only pay when you receive your items. This protects buyers from fraud and ensures you get exactly what you ordered. It's our way of making transactions secure without requiring upfront trust."
        },
        {
            question: "Are all sellers verified?",
            answer: "We verify sellers through our verification process. Look for the green 'Verified Seller' badge before making a purchase. Verified sellers have confirmed their identity and business information."
        },
        {
            question: "Can I return items?",
            answer: "Return policies vary by seller. Check the listing details or contact the seller directly before purchasing. All communication is recorded for your protection."
        },
        {
            question: "How do I become a verified seller?",
            answer: "Sign up as a seller and complete your profile with accurate business information. Our team will review your application and verify your credentials. Verification helps build trust with customers."
        },
        {
            question: "What if I have an issue with my order?",
            answer: "Contact the seller directly through our messaging system. All conversations are recorded. If you can't resolve the issue, our support team can help mediate."
        },
        {
            question: "Are there any hidden fees?",
            answer: "No. What you see is what you pay. We believe in complete transparency - no surprise charges at checkout."
        },
        {
            question: "How do reviews work?",
            answer: "After receiving your order, you can leave a review. Reviews are public and cannot be deleted by sellers, ensuring honest feedback for future customers."
        },
        {
            question: "Is my personal information safe?",
            answer: "Yes. We use industry-standard security measures to protect your data. We never share your personal information with third parties without your consent."
        },
        {
            question: "Can I track my order?",
            answer: "Yes! Every order has a tracking page showing its status: Pending → Confirmed → Shipped → Delivered. You'll see exactly where your order is in the process."
        }
    ];

    return (
        <div className="min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Back to Home Button */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white/80 hover:text-white border border-white/10 transition-all active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4 text-[#FF6200]" /> Back to Home
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4 text-white">Frequently Asked <span className="text-[#FF6200]">Questions</span></h1>
                    <p className="text-lg text-white/40 font-medium italic">
                        Everything you need to know about trading on MarketBridge
                    </p>
                </div>

                {/* Trust Highlights */}
                <div className="grid md:grid-cols-3 gap-4 mb-12">
                    <Card className="bg-zinc-900/50 border-white/5">
                        <CardContent className="p-6 text-center">
                            <Shield className="h-8 w-8 mx-auto mb-3 text-[#FF6200]" />
                            <h3 className="font-bold uppercase tracking-widest text-white mb-1">Verified Sellers</h3>
                            <p className="text-xs text-white/40">All sellers go through verification</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-white/5">
                        <CardContent className="p-6 text-center">
                            <Eye className="h-8 w-8 mx-auto mb-3 text-[#FF6200]" />
                            <h3 className="font-bold uppercase tracking-widest text-white mb-1">Full Transparency</h3>
                            <p className="text-xs text-white/40">See ratings and reviews before buying</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-white/5">
                        <CardContent className="p-6 text-center">
                            <Lock className="h-8 w-8 mx-auto mb-3 text-[#FF6200]" />
                            <h3 className="font-bold uppercase tracking-widest text-white mb-1">Secure Payments</h3>
                            <p className="text-xs text-white/40">Pay on delivery for your protection</p>
                        </CardContent>
                    </Card>
                </div>

                {/* FAQs */}
                <div className="space-y-6">
                    {faqs.map((faq, index) => (
                        <Card key={index} className="bg-zinc-900/30 border-white/5">
                            <CardContent className="p-6">
                                <h3 className="text-lg font-black uppercase tracking-tighter italic text-white mb-3">{faq.question}</h3>
                                <p className="text-white/60 leading-relaxed text-sm font-medium">{faq.answer}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <Card className="bg-[#FF6200] text-black border-none rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-10">
                            <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-4">Still have questions?</h2>
                            <p className="mb-8 font-bold uppercase tracking-widest text-sm opacity-80">
                                Our support team is here to help
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button asChild variant="secondary" size="lg" className="bg-black text-white hover:bg-zinc-800 rounded-xl px-8 h-14 font-black uppercase tracking-widest border-none">
                                    <Link href="/contact">Contact Support</Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="bg-transparent border-black/20 text-black hover:bg-black/5 rounded-xl px-8 h-14 font-black uppercase tracking-widest">
                                    <Link href="/about">Learn More</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

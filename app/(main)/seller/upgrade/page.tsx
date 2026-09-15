'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Zap, Crown, Sparkles, ArrowLeft, Loader2, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PLANS = [
    {
        id: 'basic',
        name: 'Basic',
        price: 0,
        period: 'Free forever',
        icon: Star,
        color: 'zinc',
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-500 dark:text-slate-400',
        description: 'Ideal for getting started with essential selling tools.',
        features: [
            'Up to 5 active marketplace listings',
            'Full access to seller dashboard',
            'Direct buyer messaging & chat',
            'Standard escrow payment protection',
        ],
        cta: 'Current Plan',
        highlight: false,
    },
    {
        id: 'standard',
        name: 'Standard',
        price: 1500,
        period: 'per month',
        icon: Zap,
        color: 'orange',
        iconBg: 'bg-[#FF6200]/10',
        iconColor: 'text-[#FF6200]',
        description: 'For active merchants scaling their reach and transactions.',
        features: [
            'Unlimited active listings',
            'Real-time order & revenue analytics',
            'Higher search priority placement',
            'Custom price offer & negotiation tools',
            'All Basic features included',
        ],
        cta: 'Upgrade to Standard',
        highlight: true,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 3500,
        period: 'per month',
        icon: Crown,
        color: 'amber',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-500',
        description: 'Maximum exposure, premium badge, and priority resolution.',
        features: [
            'Top-tier priority placement in marketplace',
            'Verified Featured Seller badge on profile',
            'Comprehensive performance analytics',
            'Expedited dispute review & priority support',
            'All Standard features included',
        ],
        cta: 'Upgrade to Pro',
        highlight: false,
    },
];

export default function SellerUpgradePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const supabase = createClient();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [billingAnnual, setBillingAnnual] = useState(false);

    const handleSelectPlan = async (planId: string) => {
        if (planId === 'basic') return; // Free tier

        if (!user) {
            router.push('/login?next=/seller/upgrade');
            return;
        }

        setLoadingPlan(planId);

        try {
            const { error } = await supabase.from('subscription_requests').insert({
                user_id: user.id,
                plan_id: planId,
                billing_cycle: billingAnnual ? 'annual' : 'monthly',
                status: 'pending',
            });

            if (error) throw error;

            toast(
                `Your ${planId === 'standard' ? 'Standard' : 'Pro'} plan upgrade request has been submitted! Our team will contact you shortly to activate your plan.`,
                'success'
            );
            router.push('/seller/dashboard');
        } catch (err: any) {
            console.error(err);
            toast(
                'Request received! Contact our support desk on WhatsApp to confirm immediate activation.',
                'info'
            );
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 pb-28">
            <div className="container px-4 sm:px-6 mx-auto max-w-6xl">

                {/* Header */}
                <div className="mb-12">
                    <Link
                        href="/seller/dashboard"
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>

                    <div className="space-y-3">
                        <Badge className="bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20 font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full">
                            Store Upgrade
                        </Badge>
                        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Expand Your <span className="text-[#FF6200]">Storefront</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-medium max-w-xl">
                            Unlock unlimited inventory, enhanced visibility, and dedicated merchant capabilities.
                        </p>
                    </div>

                    {/* Annual Billing Toggle */}
                    <div className="mt-8 flex items-center gap-3">
                        <span className={cn('text-xs font-bold uppercase tracking-wider transition-colors', !billingAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
                            Monthly
                        </span>
                        <button
                            onClick={() => setBillingAnnual(!billingAnnual)}
                            aria-label={billingAnnual ? 'Switch to monthly billing' : 'Switch to annual billing'}
                            aria-pressed={billingAnnual ? 'true' : 'false'}
                            className={cn(
                                'relative h-6 w-11 rounded-full border transition-all',
                                billingAnnual
                                    ? 'bg-[#FF6200] border-[#FF6200]'
                                    : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                            )}
                        >
                            <span className={cn(
                                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all',
                                billingAnnual ? 'left-6' : 'left-0.5'
                            )} />
                        </button>
                        <span className={cn('text-xs font-bold uppercase tracking-wider transition-colors', billingAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
                            Annual
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Save 20%
                            </span>
                        </span>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        const price = billingAnnual && plan.price > 0
                            ? Math.round(plan.price * 12 * 0.8)
                            : plan.price;
                        const isCurrentPlan = user?.subscriptionPlan === plan.id || (plan.id === 'basic' && !user?.subscriptionPlan);

                        return (
                            <div
                                key={plan.id}
                                className={cn(
                                    'relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300',
                                    plan.highlight
                                        ? 'bg-white dark:bg-slate-900 border-2 border-[#FF6200] shadow-lg shadow-[#FF6200]/5'
                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                                )}
                            >
                                {plan.highlight && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#FF6200] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                        <Sparkles className="h-3 w-3" />
                                        Most Popular
                                    </div>
                                )}

                                <div>
                                    <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center mb-5', plan.iconBg)}>
                                        <Icon className={cn('h-6 w-6', plan.iconColor)} />
                                    </div>

                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">
                                        {plan.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
                                        {plan.description}
                                    </p>

                                    <div className="mb-6">
                                        {plan.price === 0 ? (
                                            <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Free</span>
                                        ) : (
                                            <>
                                                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                                    ₦{price.toLocaleString()}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 ml-1 uppercase">
                                                    /{billingAnnual ? 'year' : 'month'}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="h-px bg-slate-100 dark:bg-slate-800 mb-6" />

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#FF6200]" />
                                                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    disabled={isCurrentPlan || loadingPlan === plan.id}
                                    className={cn(
                                        'w-full h-12 rounded-xl font-bold uppercase tracking-wider text-xs transition-all',
                                        plan.id === 'basic'
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default border-0'
                                            : plan.highlight
                                                ? 'bg-[#FF6200] hover:bg-[#FF7A29] text-white border-0 shadow-sm'
                                                : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 border-0'
                                    )}
                                >
                                    {loadingPlan === plan.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isCurrentPlan ? (
                                        '✓ Active Plan'
                                    ) : (
                                        plan.cta
                                    )}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Note */}
                <div className="p-6 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Need assistance choosing a plan? Contact our merchant support team for customized store setup.{' '}
                        <Link href="/about" className="text-[#FF6200] hover:underline font-bold">Learn more</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

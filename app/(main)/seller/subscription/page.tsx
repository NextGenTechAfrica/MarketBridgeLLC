'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Zap, Crown, ArrowLeft, Sparkles, Shield, TrendingUp, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { SubscriptionPlan } from '@/types/subscription';

export default function PricingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const supabase = createClient();
    const [isAnnual, setIsAnnual] = useState(false);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [currentPlan, setCurrentPlan] = useState<string>('basic');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
        if (user) {
            fetchCurrentSubscription();
        }
    }, [user]);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentSubscription = async () => {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('plan_id')
                .eq('user_id', user?.id)
                .eq('status', 'active')
                .single();

            if (data) {
                setCurrentPlan(data.plan_id);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        }
    };

    const handleSelectPlan = async (planId: string) => {
        if (!user) {
            router.push(`/signup?plan=${planId}`);
            return;
        }

        // MANDATORY EMAIL VERIFICATION CHECK
        if (user.role === 'student_seller' && !user.email_verified) {
            toast('Please verify your email address before subscribing.', 'error');
            router.push('/verify-email');
            return;
        }

        // If user is a buyer, redirect them to onboarding to become a seller first
        if (user.role === 'student_buyer') {
            router.push(`/seller-onboard?role=student_seller&plan=${planId}&cycle=${isAnnual ? 'annual' : 'monthly'}`);
            return;
        }

        if (planId === 'enterprise') {
            window.location.href = 'mailto:ops-support@marketbridge.com.ng?subject=Enterprise%20Plan%20Inquiry';
            return;
        }

        if (planId === 'basic') {
            setLoading(true);
            try {
                // Activate free plan
                const { error: subError } = await supabase
                    .from('subscriptions')
                    .upsert({
                        user_id: user.id,
                        plan_id: 'basic',
                        status: 'active',
                        current_period_start: new Date().toISOString(),
                        current_period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString()
                    }, { onConflict: 'user_id' });

                if (subError) throw subError;

                // Mark onboarding as complete and update profile
                await supabase.from('users').update({
                    subscription_status: 'active',
                    subscription_plan_id: 'basic'
                }).eq('id', user.id);

                toast('Basic Merchant Plan Activated.', 'success');
                router.push('/seller/dashboard');
            } catch (err) {
                console.error('Activation failed:', err);
                toast('Network Error: Manual activation required.', 'error');
            } finally {
                setLoading(false);
            }
            return;
        }

        router.push(`/checkout/subscription?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
    };

    const getPlanIcon = (planId: string) => {
        switch (planId) {
            case 'basic':
                return <Sparkles className="h-5 w-5" />;
            case 'standard':
                return <Zap className="h-5 w-5" />;
            case 'pro':
                return <Crown className="h-5 w-5" />;
            default:
                return <Shield className="h-5 w-5" />;
        }
    };

    const getPlanPrice = (plan: SubscriptionPlan) => {
        return isAnnual ? plan.price_annual : plan.price_monthly;
    };

    const getAnnualSavings = (plan: SubscriptionPlan) => {
        const monthlyCost = plan.price_monthly * 12;
        const annualCost = plan.price_annual;
        return monthlyCost - annualCost;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 pb-28">
            <div className="container px-4 sm:px-6 mx-auto max-w-6xl">

                {/* Header */}
                <div className="text-center mb-16 space-y-6">
                    <Link
                        href="/seller/dashboard"
                        className="inline-flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase tracking-wider mb-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
                    </Link>

                    <div className="space-y-3">
                        <Badge className="bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20 font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full">
                            Merchant Growth Plans
                        </Badge>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Scale Your <span className="text-[#FF6200]">Storefront</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg font-medium max-w-2xl mx-auto">
                            Choose the plan built to maximize your listing visibility, buyer reach, and seller performance.
                        </p>
                    </div>

                    {/* Annual/Monthly Toggle & Merchant Status */}
                    <div className="flex flex-col items-center gap-4 pt-2">
                        <div className="flex items-center justify-center gap-4 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm inline-flex">
                            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                Monthly
                            </span>
                            <Switch
                                checked={isAnnual}
                                onCheckedChange={setIsAnnual}
                                className="data-[state=checked]:bg-[#FF6200]"
                            />
                            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                Annual
                            </span>
                            {isAnnual && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                                    Save 10%
                                </Badge>
                            )}
                        </div>

                        {user?.role === 'student_seller' ? (
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Verified Merchant Account</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                <Shield className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Seller Exclusive Plans</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pricing Cards Grid */}
                {loading ? (
                    <div className="text-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-[#FF6200] mx-auto mb-4" />
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Available Plans...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {plans.map((plan) => {
                            const isCurrentPlan = currentPlan === plan.id;
                            const isFree = plan.id === 'basic';
                            const isPro = plan.id === 'pro' || plan.id === 'beta_campus_founder';
                            const price = getPlanPrice(plan);
                            const savings = isAnnual ? getAnnualSavings(plan) : 0;

                            return (
                                <Card
                                    key={plan.id}
                                    className={`relative overflow-hidden transition-all duration-300 rounded-3xl flex flex-col justify-between ${
                                        isPro
                                            ? 'bg-white dark:bg-slate-900 border-2 border-[#FF6200] shadow-lg shadow-[#FF6200]/5'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    {isPro && (
                                        <div className="bg-[#FF6200] text-white text-center py-1 text-[10px] font-black uppercase tracking-widest">
                                            Most Popular
                                        </div>
                                    )}

                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                                                isPro ? 'bg-[#FF6200]/10 text-[#FF6200]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}>
                                                {getPlanIcon(plan.id)}
                                            </div>
                                            {isCurrentPlan && (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                                                    Current Plan
                                                </Badge>
                                            )}
                                        </div>

                                        <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                            {plan.name}
                                        </CardTitle>

                                        <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                                            {plan.description}
                                        </CardDescription>

                                        <div className="mt-5">
                                            {plan.id === 'pro' && price === 0 ? (
                                                <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                                    Custom
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                                            {price === 0 ? 'Free' : `₦${price.toLocaleString()}`}
                                                        </span>
                                                        {price > 0 && (
                                                            <span className="text-slate-400 text-xs font-bold uppercase">
                                                                /{isAnnual ? 'year' : 'month'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isAnnual && savings > 0 && (
                                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-1">
                                                            Save ₦{savings.toLocaleString()} annually
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 sm:p-8 pt-4 flex-1">
                                        <div className="h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5">
                                                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#FF6200]" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>

                                    <CardFooter className="p-6 sm:p-8 pt-0">
                                        {isCurrentPlan ? (
                                            <Button
                                                disabled
                                                className="w-full h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold uppercase tracking-wider text-xs cursor-not-allowed border-none"
                                            >
                                                Active Plan
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleSelectPlan(plan.id)}
                                                className={`w-full h-12 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                                                    isPro
                                                        ? 'bg-[#FF6200] text-white hover:bg-[#FF7A29] shadow-sm'
                                                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                                                }`}
                                            >
                                                {isFree ? 'Choose Free Plan' : 'Select Plan'}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Features Value Prop */}
                <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 mb-16 shadow-sm">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-8 text-center">
                        Merchant <span className="text-[#FF6200]">Advantage</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <TrendingUp className="h-5 w-5" />,
                                stat: '3x',
                                label: 'Increased Visibility',
                                description: 'Pro stores receive up to 3x higher placement across categories'
                            },
                            {
                                icon: <Zap className="h-5 w-5" />,
                                stat: 'Instant',
                                label: 'Priority Search',
                                description: 'Featured search results ensure faster buyer inquiry response'
                            },
                            {
                                icon: <Shield className="h-5 w-5" />,
                                stat: '100%',
                                label: 'Verified Badge',
                                description: 'Boost credibility and buyer trust with authenticated store status'
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="text-center space-y-2">
                                <div className="h-12 w-12 rounded-xl bg-[#FF6200]/10 text-[#FF6200] flex items-center justify-center mx-auto mb-3">
                                    {item.icon}
                                </div>
                                <div className="text-3xl font-black text-[#FF6200] tracking-tight">
                                    {item.stat}
                                </div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    {item.label}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-center">
                        Frequently Asked Questions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                q: 'Can I cancel or change plans anytime?',
                                a: 'Yes. You can manage or upgrade your subscription plan whenever you need from your seller dashboard.'
                            },
                            {
                                q: 'How are subscription payments processed?',
                                a: 'We accept debit/credit cards, bank transfers, and USSD securely through Paystack.'
                            },
                            {
                                q: 'What happens when my paid plan expires?',
                                a: 'Your account automatically switches to the Free Basic plan so your storefront remains active without interruption.'
                            },
                            {
                                q: 'Is there a limit on free listings?',
                                a: 'The Basic Plan supports up to 5 active listings simultaneously with full escrow protection.'
                            }
                        ].map((faq, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {faq.q}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    {faq.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

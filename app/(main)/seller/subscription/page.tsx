'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Zap, Crown, Rocket, ArrowLeft, Sparkles, Shield, TrendingUp, Loader2, ShieldCheck } from 'lucide-react';
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
            toast('Please verify your email Dashboard before subscribing.', 'error');
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
                        current_period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString() // Permanent-ish
                    }, { onConflict: 'user_id' });

                if (subError) throw subError;

                // Mark onboarding as complete and update profile
                await supabase.from('users').update({
                    subscription_status: 'active',
                    subscription_plan_id: 'basic'
                }).eq('id', user.id);

                toast('Basic Merchant Access Activated.', 'success');
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
                return <Sparkles className="h-6 w-6" />;
            case 'standard':
                return <Zap className="h-6 w-6" />;
            case 'pro':
                return <Crown className="h-6 w-6" />;
            default:
                return <Shield className="h-6 w-6" />;
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
        <div className="min-h-screen bg-background text-foreground transition-all duration-300 pt-28 pb-20 selection:bg-primary selection:text-primary-foreground">
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none z-0" />

            <div className="container px-4 mx-auto relative z-10 max-w-7xl">
                {/* Header */}
                <div className="text-center mb-20 space-y-8">
                    <Link
                        href="/"
                        className="inline-flex items-center text-[#FF6200] hover:text-[#FF7A29] text-[10px] font-black uppercase tracking-[0.2em] mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Core
                    </Link>

                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">
                            Power Your <span className="text-[#FF6200]">Campus Empire</span>
                        </h1>
                        <p className="text-foreground/60 text-lg md:text-xl font-medium leading-relaxed italic max-w-3xl mx-auto">
                            Choose the plan that scales with your ambition. <span className="text-foreground">No hidden fees.</span> Cancel anytime.
                        </p>
                    </div>

                    {/* Annual/Monthly Toggle & Merchant Note */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center justify-center gap-4 glass-card p-4 rounded-3xl border-white/5 inline-flex">
                            <span className={`text-sm font-black uppercase tracking-widest transition-colors ${!isAnnual ? 'text-foreground' : 'text-foreground/30'}`}>
                                Monthly
                            </span>
                            <Switch
                                checked={isAnnual}
                                onCheckedChange={setIsAnnual}
                                className="data-[state=checked]:bg-[#FF6200]"
                            />
                            <span className={`text-sm font-black uppercase tracking-widest transition-colors ${isAnnual ? 'text-foreground' : 'text-foreground/30'}`}>
                                Annual
                            </span>
                            {isAnnual && (
                                <Badge className="bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20 text-[8px] font-black uppercase tracking-widest">
                                    Save 10%
                                </Badge>
                            )}
                        </div>

                        {user?.role === 'student_seller' ? (
                            <div className="flex items-center gap-2 px-6 py-2 bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-full animate-in fade-in zoom-in duration-500">
                                <ShieldCheck className="h-3 w-3 text-[#FF6200]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6200]">Merchant Status Verified: Dashboard Unlocked</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-6 py-2 bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-full animate-pulse">
                                <Shield className="h-3 w-3 text-[#FF6200]" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF6200]">Merchant Exclusive: Plans for Sellers only</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pricing Cards */}
                {loading ? (
                    <div className="text-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-[#FF6200] mx-auto mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Loading Plans...</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-8 mb-20">
                        {plans.map((plan, index) => {
                            const isCurrentPlan = currentPlan === plan.id;
                            const isFree = plan.id === 'basic';
                            const isPro = plan.id === 'pro' || plan.id === 'beta_campus_founder';
                            const price = getPlanPrice(plan);
                            const savings = isAnnual ? getAnnualSavings(plan) : 0;

                            return (
                                <Card
                                    key={plan.id}
                                    className={`w-full max-w-sm relative overflow-hidden transition-all duration-500 ${isPro
                                        ? 'bg-gradient-to-b from-[#FF6200]/10 to-black border-[#FF6200]/30 scale-105 shadow-[0_0_50px_rgba(255,98,0,0.2)] z-20'
                                        : 'bg-zinc-900/40 border-white/5 hover:border-[#FF6200]/20 z-10'
                                        } rounded-[2.5rem]`}
                                >
                                    {isPro && (
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF6200] to-transparent" />
                                    )}

                                    <CardHeader className="p-8 pb-4">
                                        {isPro && (
                                            <Badge className="bg-[#FF6200] text-black border-none text-[8px] font-black uppercase tracking-widest mb-4 w-fit">
                                                Founding Member
                                            </Badge>
                                        )}

                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 ${isPro ? 'bg-[#FF6200]/20 border-[#FF6200]/50' : 'bg-white/5 border-white/10'
                                            } border`}>
                                            <div className={isPro ? 'text-[#FF6200]' : 'text-white/40'}>
                                                {getPlanIcon(plan.id)}
                                            </div>
                                        </div>

                                        <CardTitle className="text-2xl font-black uppercase tracking-tighter italic mb-2">
                                            {plan.name}
                                        </CardTitle>

                                        <CardDescription className="text-foreground/40 text-sm font-medium italic">
                                            {plan.description}
                                        </CardDescription>

                                        <div className="mt-6">
                                            {plan.id === 'pro' && price === 0 ? (
                                                <div className="text-4xl font-black uppercase tracking-tighter italic">
                                                    Custom
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-4xl font-black text-[#FF6200]">
                                                            ₦{price.toLocaleString()}
                                                        </span>
                                                        <span className="text-foreground/30 text-sm font-black uppercase">
                                                            /{isAnnual ? 'year' : 'month'}
                                                        </span>
                                                    </div>
                                                    {isAnnual && savings > 0 && (
                                                        <p className="text-[10px] text-[#FF6200] font-black uppercase tracking-widest mt-2">
                                                            Save ₦{savings.toLocaleString()}/year
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-8 pt-6">
                                        <ul className="space-y-4">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 text-[#FF6200]`} />
                                                    <span className="text-xs text-foreground/60 font-medium leading-relaxed">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>

                                    <CardFooter className="p-8 pt-0">
                                        {isCurrentPlan ? (
                                            <Button
                                                disabled
                                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-foreground/30 font-black uppercase tracking-widest cursor-not-allowed"
                                            >
                                                Current Plan
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleSelectPlan(plan.id)}
                                                className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest transition-all ${isPro
                                                    ? 'bg-[#FF6200] text-black hover:bg-[#FF7A29]'
                                                    : 'bg-white/5 border border-white/10 hover:bg-[#FF6200] hover:text-black hover:border-[#FF6200]'
                                                    }`}
                                            >
                                                {isFree ? 'Get Started' : 'Join Beta'}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Features Comparison */}
                <div className="glass-card p-12 rounded-[3.5rem] border-white/5 mb-20">
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-8 text-center">
                        Why Upgrade? <span className="text-foreground/40">The Numbers</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <TrendingUp className="h-6 w-6" />,
                                stat: '3x',
                                label: 'More Visibility',
                                description: 'Pro merchants get 3x more views on average'
                            },
                            {
                                icon: <Zap className="h-6 w-6" />,
                                stat: '< 2hrs',
                                label: 'Response Time',
                                description: 'Priority support with dedicated assistance'
                            },
                            {
                                icon: <Shield className="h-6 w-6" />,
                                stat: '100%',
                                label: 'Verified Badge',
                                description: 'Build trust with instant verification'
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="text-center space-y-4">
                                <div className="h-14 w-14 rounded-2xl bg-[#FF6200]/10 border border-[#FF6200]/20 flex items-center justify-center mx-auto">
                                    <div className="text-[#FF6200]">{item.icon}</div>
                                </div>
                                <div className="text-4xl font-black text-[#FF6200] uppercase tracking-tighter italic">
                                    {item.stat}
                                </div>
                                <div className="text-sm font-black uppercase tracking-widest text-foreground">
                                    {item.label}
                                </div>
                                <p className="text-xs text-foreground/40 font-medium italic">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="text-center space-y-8">
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">
                        Frequently Asked <span className="text-foreground/40">Questions</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        {[
                            {
                                q: 'Can I cancel anytime?',
                                a: 'Yes! You can cancel your subscription at any time. You\'ll retain access until the end of your billing period.'
                            },
                            {
                                q: 'What payment methods do you accept?',
                                a: 'We accept all major Nigerian debit/credit cards, bank transfers, and USSD payments via Paystack.'
                            },
                            {
                                q: 'Can I upgrade or downgrade my plan?',
                                a: 'Absolutely! You can change your plan at any time. Upgrades are prorated, and downgrades take effect at the next billing cycle.'
                            },
                            {
                                q: 'Is there a free trial?',
                                a: 'The Free Tier is available indefinitely. Paid plans don\'t have a trial, but you can cancel within the first 7 days for a full refund.'
                            }
                        ].map((faq, idx) => (
                            <div key={idx} className="glass-card p-6 rounded-2xl border-white/5">
                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-3">
                                    {faq.q}
                                </h3>
                                <p className="text-xs text-foreground/40 font-medium leading-relaxed">
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

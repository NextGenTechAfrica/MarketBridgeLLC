'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { startConversation } from '@/lib/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import {
    Package,
    ShoppingBag,
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    Truck,
    MessageCircle,
    Eye,
    Zap,
    AlertCircle,
    ArrowRight,
    Loader2,
    RefreshCw,
    User,
    Crown,
    Star,
    Sparkles,
    X,
    Copy,
    Landmark,
    ShieldCheck,
    PlusCircle,
    Check
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { checkAndHandleExpiredTrial } from '@/lib/subscription/utils';

interface Order {
    id: string;
    buyer_id: string;
    listing_id: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    amount: number;
    shipping_address: string | null;
    phone_number: string | null;
    created_at: string;
    buyer?: {
        display_name: string;
        photo_url: string | null;
    };
    listing?: {
        title: string;
        images: string[];
    };
}

interface Offer {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    offered_price: number;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed';
    message: string | null;
    created_at: string;
    buyer?: {
        display_name: string;
        photo_url: string | null;
        email?: string;
    };
    listing?: {
        title: string;
        price: number;
    };
}

interface Stats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
}

interface OfferStats {
    totalPending: number;
}

export default function SellerDashboardPage() {
    const { user, sessionUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const { toast } = useToast();

    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
    });
    const [loading, setLoading] = useState(true);
    const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        bankCode: '',
        accountNumber: '',
        accountName: ''
    });
    const [offers, setOffers] = useState<Offer[]>([]);
    const [offerStats, setOfferStats] = useState<OfferStats>({ totalPending: 0 });
    const [processingOffer, setProcessingOffer] = useState<string | null>(null);
    const [referralStats, setReferralStats] = useState({ totalInvited: 0, coinsEarned: 0 });
    const [revenueTrend, setRevenueTrend] = useState<string>('—');
    const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'loading'>('loading');
    const [trialExpiresAt, setTrialExpiresAt] = useState<Date | null>(null);
    const [showPlanPrompt, setShowPlanPrompt] = useState(false);

    // Ambassador States
    const [ambassadorStatus, setAmbassadorStatus] = useState<'none' | 'pending' | 'approved' | 'declined'>('none');
    const [ambassadorDetails, setAmbassadorDetails] = useState<any>(null);
    const [isAmbassadorModalOpen, setIsAmbassadorModalOpen] = useState(false);
    const [ambassadorCampus, setAmbassadorCampus] = useState('');
    const [ambassadorMotivation, setAmbassadorMotivation] = useState('');
    const [isSubmittingAmbassador, setIsSubmittingAmbassador] = useState(false);

    const [sessionLost, setSessionLost] = useState(false);
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();

    const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
    const [isResolving, setIsResolving] = useState(false);
    const [submittingBank, setSubmittingBank] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (searchParams?.get('subscription') === 'success') {
            toast('Subscription updated successfully! Need help? Contact ops-support@marketbridge.com.ng', 'success');
            router.replace('/seller/dashboard');
        }
    }, [searchParams, router]);

    const fetchBankDetails = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('users')
            .select('bank_name, bank_code, account_number, account_name')
            .eq('id', user.id)
            .single();

        if (data) {
            setBankDetails({
                bankName: data.bank_name || '',
                bankCode: data.bank_code || '',
                accountNumber: data.account_number || '',
                accountName: data.account_name || ''
            });
        }
        fetchBanks();
    };

    const fetchBanks = async () => {
        try {
            const res = await fetch('/api/paystack/banks');
            const data = await res.json();
            if (data.status) {
                setBanks(data.data.map((b: any) => ({ name: b.name, code: b.code })));
            }
        } catch (err) {
            console.error('Failed to fetch banks:', err);
        }
    };

    const resolveAccount = async () => {
        if (bankDetails.accountNumber.length !== 10 || !bankDetails.bankCode) return;

        setIsResolving(true);
        try {
            const res = await fetch(`/api/paystack/resolve?accountNumber=${bankDetails.accountNumber}&bankCode=${bankDetails.bankCode}`);
            const data = await res.json();
            if (data.status) {
                setBankDetails(prev => ({ ...prev, accountName: data.data.account_name }));
            } else {
                toast('Could not resolve account name. Please double-check your account number and bank.', 'error');
            }
        } catch (err) {
            console.error('Resolution error:', err);
        } finally {
            setIsResolving(false);
        }
    };

    useEffect(() => {
        if (bankDetails.accountNumber.length === 10 && bankDetails.bankCode) {
            const timer = setTimeout(() => resolveAccount(), 1000);
            return () => clearTimeout(timer);
        }
    }, [bankDetails.accountNumber, bankDetails.bankCode]);

    const updateBankDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingBank(true);
        try {
            const selectedBank = banks.find(b => b.code === bankDetails.bankCode);

            const res = await fetch('/api/paystack/subaccount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...bankDetails,
                    bankName: selectedBank?.name,
                    businessName: user?.displayName
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast('Payout account linked! Your earnings will now settle automatically.', 'success');
        } catch (err: any) {
            console.error('Failed to update bank details:', err);
            toast(err.message || 'Failed to update payout details', 'error');
        } finally {
            setSubmittingBank(false);
        }
    };

    const checkSubscriptionTrial = async () => {
        if (!user) return;
        try {
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('status, trial_start, trial_end')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sub?.status === 'trialing' && sub.trial_end) {
                const expires = new Date(sub.trial_end);
                setTrialExpiresAt(expires);

                const seenKey = `mb_plan_prompt_${user.id}`;
                if (!sessionStorage.getItem(seenKey) && new Date() < expires) {
                    setShowPlanPrompt(true);
                    sessionStorage.setItem(seenKey, '1');
                }
            }
        } catch (err) {
            console.error('Failed to check subscription trial:', err);
        }
    };

    const fetchAmbassadorStatus = async () => {
        if (!user) return;
        try {
            const { data: appData, error: appError } = await supabase
                .from('ambassador_applications')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (appError) throw appError;

            if (appData) {
                setAmbassadorStatus(appData.status);
                setAmbassadorDetails(appData);
            } else {
                const { data: ambData, error: ambError } = await supabase
                    .from('ambassadors')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (ambError) throw ambError;

                if (ambData) {
                    setAmbassadorStatus('approved');
                    setAmbassadorDetails(ambData);
                }
            }
        } catch (err) {
            console.error('Error fetching ambassador status:', err);
        }
    };

    const handleApplyAmbassador = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!ambassadorCampus || !ambassadorMotivation) {
            toast('Please fill in all fields', 'error');
            return;
        }

        setIsSubmittingAmbassador(true);
        try {
            const { error } = await supabase
                .from('ambassador_applications')
                .insert({
                    user_id: user.id,
                    campus: ambassadorCampus,
                    motivation: ambassadorMotivation,
                    status: 'pending'
                });

            if (error) throw error;

            toast('Application submitted successfully! Our team will review it soon.', 'success');
            setIsAmbassadorModalOpen(false);
            fetchAmbassadorStatus();
        } catch (err: any) {
            toast(err.message || 'Failed to submit application', 'error');
        } finally {
            setIsSubmittingAmbassador(false);
        }
    };

    const checkApplicationStatus = async () => {
        if (!user) return;
        try {
            const [appResult, subResult] = await Promise.all([
                supabase
                    .from('seller_applications')
                    .select('status, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('subscriptions')
                    .select('status, trial_start, trial_end')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            ]);

            const app = appResult.data;
            const sub = subResult.data;

            if (!app) {
                setApplicationStatus('none');
                setLoading(false);
                return;
            }

            const status = app.status as 'pending' | 'approved' | 'rejected';
            setApplicationStatus(status);

            if (status === 'pending') {
                let expires: Date;
                if (sub?.status === 'trialing' && sub.trial_end) {
                    expires = new Date(sub.trial_end);
                } else {
                    const submittedAt = new Date(app.created_at);
                    expires = new Date(submittedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
                }
                setTrialExpiresAt(expires);

                const isTrialActive = new Date() < expires;
                if (isTrialActive) {
                    setSessionLost(false);
                    fetchOrders();
                    fetchBankDetails();
                    fetchOffers();
                    fetchReferralStats();
                    const seenKey = `mb_plan_prompt_${user.id}`;
                    if (!sessionStorage.getItem(seenKey)) {
                        setShowPlanPrompt(true);
                        localStorage.removeItem('mb-preferred-campus');
                    }
                }
            }
        } catch (err) {
            console.error('Failed to check application/subscription status:', err);
            setApplicationStatus('none');
        } finally {
            setLoading(false);
        }
    };

    const fetchReferralStats = async () => {
        if (!user) return;
        try {
            const { count, error: countError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('referred_by_id', user.id);

            const { data: transData, error: transError } = await supabase
                .from('coins_transactions')
                .select('amount')
                .eq('user_id', user.id)
                .in('type', ['referral', 'referral_welcome']);

            if (countError || transError) throw countError || transError;

            const coinsEarned = transData?.reduce((sum, t) => sum + t.amount, 0) || 0;
            setReferralStats({ totalInvited: count || 0, coinsEarned });
        } catch (err) {
            console.error('Failed to fetch referral stats:', err);
        }
    };

    const checkSubscriptionStatus = async () => {
        if (!user) return;
        try {
            const hasExpired = await checkAndHandleExpiredTrial(user.id);
            if (hasExpired) {
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to check subscription status:', err);
        }
    };

    const fetchOrders = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    buyer:users!orders_buyer_id_fkey(display_name, photo_url),
                    listing:listings(title, images)
                `)
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setOrders(data || []);

            const totalOrders = data?.length || 0;
            const pendingOrders = data?.filter((o: Order) => o.status === 'pending').length || 0;
            const completedOrders = data?.filter((o: Order) => o.status === 'completed').length || 0;
            const totalRevenue = data?.filter((o: Order) => o.status === 'completed')
                .reduce((sum: number, o: Order) => sum + o.amount, 0) || 0;

            setStats({
                totalOrders,
                pendingOrders,
                completedOrders,
                totalRevenue,
            });

            // Fetch Financial Stats from sales_transactions
            const { data: financialData } = await supabase
                .from('sales_transactions')
                .select('amount_seller')
                .eq('seller_id', user.id)
                .eq('status', 'success');

            if (financialData) {
                const totalSellerEarnings = financialData.reduce((sum, t) => sum + Number(t.amount_seller), 0);
                const finalRevenue = totalSellerEarnings || totalRevenue;

                // Compute real month-over-month trend
                const now = new Date();
                const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

                const { data: lastMonthData } = await supabase
                    .from('sales_transactions')
                    .select('amount_seller')
                    .eq('seller_id', user!.id)
                    .eq('status', 'success')
                    .gte('created_at', startOfLastMonth)
                    .lte('created_at', endOfLastMonth);

                const { data: thisMonthData } = await supabase
                    .from('sales_transactions')
                    .select('amount_seller')
                    .eq('seller_id', user!.id)
                    .eq('status', 'success')
                    .gte('created_at', startOfThisMonth);

                const lastMonthRev = lastMonthData?.reduce((s, t) => s + Number(t.amount_seller), 0) || 0;
                const thisMonthRev = thisMonthData?.reduce((s, t) => s + Number(t.amount_seller), 0) || 0;

                if (lastMonthRev > 0) {
                    const pct = ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;
                    setRevenueTrend(`${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`);
                } else if (thisMonthRev > 0) {
                    setRevenueTrend('+100%');
                } else {
                    setRevenueTrend('—');
                }

                setStats(prev => ({
                    ...prev,
                    totalRevenue: finalRevenue
                }));
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToOrders = () => {
        if (!user) return;

        const subscription = supabase
            .channel('seller_orders')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `seller_id=eq.${user.id}`,
                },
                () => {
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const fetchOffers = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('offers')
                .select(`
                    *,
                    buyer:users(display_name, photo_url, email),
                    listing:listings(title, price)
                `)
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOffers(data || []);
            setOfferStats({
                totalPending: data?.filter(o => o.status === 'pending').length || 0
            });
        } catch (err) {
            console.error('Failed to fetch offers:', err);
        }
    };

    const subscribeToOffers = () => {
        if (!user) return;
        const subscription = supabase
            .channel('seller_offers')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'offers',
                    filter: `seller_id=eq.${user.id}`,
                },
                () => fetchOffers()
            )
            .subscribe();

        return () => subscription.unsubscribe();
    };

    const handleOfferAction = async (offer: Offer, action: 'accept' | 'reject') => {
        setProcessingOffer(offer.id);
        try {
            if (action === 'accept') {
                const { error: listError } = await supabase
                    .from('listings')
                    .update({
                        current_offered_price: offer.offered_price
                    })
                    .eq('id', offer.listing_id);

                if (listError) throw listError;

                const { error: offerError } = await supabase
                    .from('offers')
                    .update({ status: 'accepted' })
                    .eq('id', offer.id);

                if (offerError) throw offerError;

                try {
                    const conversationId = await startConversation(user!.id, offer.buyer_id, offer.listing_id);
                    await supabase.from('messages').insert({
                        conversation_id: conversationId,
                        sender_id: user!.id,
                        content: `✅ I've accepted your offer of ₦${offer.offered_price.toLocaleString()} for "${offer.listing?.title}". You can now proceed to Buy Now at this rate!`,
                    });
                } catch (e) {
                    console.error("Chat notification failed:", e);
                }

                toast('Offer accepted! Buyer notified via chat.', 'success');
            } else {
                const { error: offerError } = await supabase
                    .from('offers')
                    .update({ status: 'rejected' })
                    .eq('id', offer.id);

                if (offerError) throw offerError;
                toast('Offer rejected.', 'info');
            }
            fetchOffers();
        } catch (err: any) {
            console.error("Offer action failed:", err);
            toast(err.message || 'Action failed. Please try again.', 'error');
        } finally {
            setProcessingOffer(null);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
        setUpdatingOrder(orderId);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            const order = orders.find(o => o.id === orderId);
            if (order) {
                try {
                    const conversationId = await startConversation(user!.id, order.buyer_id, order.listing_id);

                    let message = '';
                    if (newStatus === 'confirmed') {
                        message = `📦 Your order #${orderId.slice(-8).toUpperCase()} has been marked as shipped!`;
                    } else if (newStatus === 'cancelled') {
                        message = `❌ Order #${orderId.slice(-8).toUpperCase()} has been cancelled.`;
                    }

                    if (message) {
                        await supabase.from('messages').insert({
                            conversation_id: conversationId,
                            sender_id: user!.id,
                            content: message,
                        });
                    }
                } catch (chatErr) {
                    console.error('Failed to notify buyer via chat:', chatErr);
                }
            }

            fetchOrders();
            toast('Order status updated', 'success');
        } catch (err) {
            console.error('Failed to update order:', err);
            toast('Failed to update order status. Please try again.', 'error');
        } finally {
            setUpdatingOrder(null);
        }
    };

    const openChat = async (order: Order) => {
        try {
            const conversationId = await startConversation(user!.id, order.buyer_id, order.listing_id);
            router.push(`/seller/chats/${conversationId}`);
        } catch (err) {
            console.error('Failed to open chat:', err);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!sessionUser) {
            setSessionLost(true);
            router.push('/login');
            return;
        }
        if (!user) return;

        const approvedRoles = ['student_seller', 'seller'];
        if (approvedRoles.includes(user.role)) {
            setApplicationStatus('approved');
            setSessionLost(false);
            checkSubscriptionTrial();
            fetchOrders();
            fetchBankDetails();
            fetchOffers();
            fetchReferralStats();
            const unsubscribeOrders = subscribeToOrders();
            const unsubscribeOffers = subscribeToOffers();
            checkSubscriptionStatus();
            fetchAmbassadorStatus();
            return () => {
                if (unsubscribeOrders) unsubscribeOrders();
                if (unsubscribeOffers) unsubscribeOffers();
            };
        }

        const ADMIN_ROLES = ['admin', 'technical_admin', 'operations_admin', 'marketing_admin', 'ceo', 'cofounder', 'cto', 'coo', 'systems_admin', 'it_support'];
        if (user?.role && ADMIN_ROLES.includes(user.role)) {
            router.push('/admin');
            return;
        }

        if (user.role === 'student_buyer') {
            checkApplicationStatus();
            return;
        }

        router.push('/');
    }, [user, sessionUser, authLoading, router]);

    if (authLoading || (loading && applicationStatus === 'loading') || (!mounted && !sessionLost)) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200] mb-3" />
                <p className="text-xs text-muted-foreground font-medium">Loading merchant dashboard...</p>
            </div>
        );
    }

    if (sessionLost) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
                    <AlertCircle className="h-12 w-12 text-[#FF6200] mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Session Expired</h2>
                    <p className="text-xs text-muted-foreground mb-6">Your session has ended. Please log in again to continue.</p>
                    <Button onClick={() => router.push('/login')} className="w-full bg-[#FF6200] hover:bg-[#FF7A29] text-white rounded-xl text-xs font-semibold">
                        Go to Login
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

                {/* ─── 1. GREETING & GROW YOUR SALES BANNER (Image 2 Right) ─── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Good morning, {user?.displayName?.split(' ')[0] || 'David'} 👋
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            Keep going! Your store is doing great. Here&apos;s what&apos;s happening today.
                        </p>
                    </div>

                    {/* Grow Your Sales Card */}
                    <div className="bg-gradient-to-r from-orange-500 to-[#FF5500] text-white px-5 py-3.5 rounded-2xl flex items-center gap-4 shadow-md shadow-orange-500/20">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white">Grow Your Sales</h4>
                            <p className="text-[11px] text-white/80">Students trust student sellers. Keep it up!</p>
                        </div>
                    </div>
                </div>

                {/* Subscription / Trial Banner */}
                <TrialBanner />

                {/* ─── 2. 4 KPI METRICS (Image 2 Right) ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Sales */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-semibold">Total Sales</span>
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <DollarSign className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                            ₦{stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() : '285,000'}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                            <span>↗ +12%</span>
                            <span className="text-slate-400 font-normal">from last week</span>
                        </div>
                    </div>

                    {/* Orders */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-semibold">Orders</span>
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <ShoppingBag className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                            {stats.totalOrders > 0 ? stats.totalOrders : 14}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                            <span>↗ 3</span>
                            <span className="text-slate-400 font-normal">new today</span>
                        </div>
                    </div>

                    {/* Active Listings */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-semibold">Active Listings</span>
                            <div className="w-6 h-6 rounded-lg bg-orange-50 text-[#FF5500] flex items-center justify-center">
                                <Package className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                            {stats.pendingOrders > 0 ? stats.pendingOrders : 8}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600">
                            <span>2</span>
                            <span className="text-slate-400 font-normal">pending review</span>
                        </div>
                    </div>

                    {/* Current Balance */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-semibold">Current Balance</span>
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <DollarSign className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                            ₦142,500
                        </p>
                        <div className="pt-1">
                            <button
                                onClick={() => {
                                    const payoutTab = document.querySelector('[data-state][value="payouts"]') as HTMLElement;
                                    if (payoutTab) payoutTab.click();
                                }}
                                className="w-full py-1.5 bg-[#0B0F19] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── 3. 2-COLUMN MAIN DASHBOARD (Image 2 Right) ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (2 cols): Overview Chart, My Listings, Recent Orders */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Overview Sales Chart Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Overview</h3>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-xs text-slate-500">Sales</span>
                                        <span className="text-lg font-black text-slate-900">₦285,000</span>
                                        <span className="text-xs font-bold text-emerald-600">+12%</span>
                                    </div>
                                </div>
                                <select className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none">
                                    <option>Last 7 days</option>
                                    <option>Last 30 days</option>
                                    <option>This Month</option>
                                </select>
                            </div>

                            {/* Smooth Sales Line Chart (SVG) */}
                            <div className="w-full h-48 pt-2">
                                <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#FF5500" stopOpacity="0.25" />
                                            <stop offset="100%" stopColor="#FF5500" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Horizontal grid lines */}
                                    <line x1="40" y1="20" x2="490" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                                    <line x1="40" y1="60" x2="490" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                                    <line x1="40" y1="100" x2="490" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                                    <line x1="40" y1="140" x2="490" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                                    {/* Y-axis labels */}
                                    <text x="5" y="24" className="text-[10px] fill-slate-400">₦100k</text>
                                    <text x="5" y="64" className="text-[10px] fill-slate-400">₦75k</text>
                                    <text x="5" y="104" className="text-[10px] fill-slate-400">₦50k</text>
                                    <text x="5" y="144" className="text-[10px] fill-slate-400">₦25k</text>

                                    {/* Area Fill */}
                                    <path
                                        d="M 50 135 C 110 110, 150 120, 210 85 C 270 50, 330 65, 390 40 C 430 25, 460 20, 480 15 L 480 155 L 50 155 Z"
                                        fill="url(#salesGrad)"
                                    />

                                    {/* Smooth Line */}
                                    <path
                                        d="M 50 135 C 110 110, 150 120, 210 85 C 270 50, 330 65, 390 40 C 430 25, 460 20, 480 15"
                                        fill="none"
                                        stroke="#FF5500"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />

                                    {/* Dots */}
                                    <circle cx="50" cy="135" r="3.5" fill="#FF5500" />
                                    <circle cx="125" cy="115" r="3.5" fill="#FF5500" />
                                    <circle cx="210" cy="85" r="3.5" fill="#FF5500" />
                                    <circle cx="295" cy="55" r="3.5" fill="#FF5500" />
                                    <circle cx="365" cy="48" r="3.5" fill="#FF5500" />
                                    <circle cx="425" cy="28" r="3.5" fill="#FF5500" />
                                    <circle cx="480" cy="15" r="4.5" fill="#FF5500" stroke="#fff" strokeWidth="2" />

                                    {/* X-axis date labels */}
                                    <text x="42" y="172" className="text-[10px] fill-slate-400 font-medium">Sep 8</text>
                                    <text x="115" y="172" className="text-[10px] fill-slate-400 font-medium">Sep 9</text>
                                    <text x="195" y="172" className="text-[10px] fill-slate-400 font-medium">Sep 10</text>
                                    <text x="280" y="172" className="text-[10px] fill-slate-400 font-medium">Sep 11</text>
                                    <text x="350" y="172" className="text-[10px] fill-slate-400 font-medium">Sep 12</text>
                                    <text x="410" y="172" className="text-[10px] fill-slate-400 font-medium">Sep 13</text>
                                    <text x="465" y="172" className="text-[10px] fill-slate-400 font-medium">Sep 14</text>
                                </svg>
                            </div>
                        </div>

                        {/* My Listings Row Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900">My Listings</h3>
                                <Link href="/seller/listings" className="text-xs font-bold text-slate-500 hover:text-[#FF5500] flex items-center gap-1 transition-colors">
                                    View All <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { title: 'HP Laptop 15', price: '₦380,000', views: 120, sold: 12, img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&auto=format&fit=crop&q=60' },
                                    { title: 'Nike Air Force 1', price: '₦55,000', views: 87, sold: 8, img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300&auto=format&fit=crop&q=60' },
                                    { title: 'Calculus Textbook', price: '₦12,000', views: 64, sold: 5, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=60' },
                                    { title: 'Bluetooth Headphones', price: '₦25,000', views: 52, sold: 4, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=60' },
                                ].map((l, i) => (
                                    <div key={i} className="border border-slate-200/80 rounded-xl overflow-hidden group hover:shadow-sm transition-all bg-white">
                                        <div className="relative h-24 w-full bg-slate-100">
                                            <Image src={l.img} alt={l.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                                        </div>
                                        <div className="p-2.5 space-y-1">
                                            <p className="text-xs font-bold text-slate-900 truncate">{l.title}</p>
                                            <p className="text-xs font-black text-slate-900">{l.price}</p>
                                            <div className="flex items-center justify-between pt-1 text-[10px]">
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-semibold">Active</span>
                                                <span className="text-slate-400">{l.views} views • {l.sold} sold</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Orders Table Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900">Recent Orders</h3>
                                <Link href="/seller/orders" className="text-xs font-bold text-slate-500 hover:text-[#FF5500] flex items-center gap-1 transition-colors">
                                    View All <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                                            <th className="pb-3">Product</th>
                                            <th className="pb-3">Buyer</th>
                                            <th className="pb-3">Amount</th>
                                            <th className="pb-3">Status</th>
                                            <th className="pb-3 text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {orders.length > 0 ? (
                                            orders.slice(0, 4).map((o) => (
                                                <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 font-semibold text-slate-900 max-w-[140px] truncate">
                                                        {o.listing?.title || `Order #${o.id.slice(0, 6)}`}
                                                    </td>
                                                    <td className="py-3 text-slate-500">{o.buyer?.display_name || 'Buyer'}</td>
                                                    <td className="py-3 font-bold text-slate-900">₦{o.amount.toLocaleString()}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                            o.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                            o.status === 'confirmed' ? 'bg-blue-50 text-blue-600' :
                                                            o.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {o.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right text-slate-400">
                                                        {new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            // Reference demo orders from Image 2
                                            [
                                                { product: 'HP Laptop 15', buyer: 'B. Iduoku-Ben', amount: '₦380,000', status: 'Pending', statusClass: 'bg-amber-50 text-amber-600', date: '12 Sep 2025' },
                                                { product: 'Nike Air Force 1', buyer: 'T. Adeyemi', amount: '₦55,000', status: 'Delivered', statusClass: 'bg-emerald-50 text-emerald-600', date: '10 Sep 2025' },
                                                { product: 'Calculus Textbook', buyer: 'S. Ibrahim', amount: '₦12,000', status: 'Delivered', statusClass: 'bg-emerald-50 text-emerald-600', date: '8 Sep 2025' },
                                                { product: 'Bluetooth Headphones', buyer: 'M. Johnson', amount: '₦25,000', status: 'In Transit', statusClass: 'bg-blue-50 text-blue-600', date: '6 Sep 2025' },
                                            ].map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 font-semibold text-slate-900">{row.product}</td>
                                                    <td className="py-3 text-slate-500">{row.buyer}</td>
                                                    <td className="py-3 font-bold text-slate-900">{row.amount}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.statusClass}`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right text-slate-400">{row.date}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1 col): Top Categories, Quick Actions, Student Sellers card */}
                    <div className="space-y-6">
                        {/* Top Selling Categories Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="text-base font-bold text-slate-900">Top Selling Categories</h3>
                            <div className="space-y-3">
                                {[
                                    { name: 'Electronics', pct: 32, barColor: 'bg-[#FF5500]' },
                                    { name: 'Fashion', pct: 22, barColor: 'bg-pink-500' },
                                    { name: 'Books', pct: 15, barColor: 'bg-blue-500' },
                                    { name: 'Accessories', pct: 12, barColor: 'bg-emerald-500' },
                                    { name: 'Others', pct: 19, barColor: 'bg-slate-400' },
                                ].map((cat, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-700">{cat.name}</span>
                                            <span className="text-slate-400">{cat.pct}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className={`${cat.barColor} h-full rounded-full`} style={{ width: `${cat.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-3">
                            <h3 className="text-base font-bold text-slate-900">Quick Actions</h3>
                            <div className="space-y-2">
                                <Link
                                    href="/seller/listings/new"
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <PlusCircle className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#FF5500] transition-colors">Add New Listing</p>
                                        <p className="text-[10px] text-slate-400">Upload a product</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/seller/orders"
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <ShoppingBag className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#FF5500] transition-colors">View Orders</p>
                                        <p className="text-[10px] text-slate-400">Manage your orders</p>
                                    </div>
                                </Link>

                                <button
                                    onClick={() => {
                                        const payoutTab = document.querySelector('[data-state][value="payouts"]') as HTMLElement;
                                        if (payoutTab) payoutTab.click();
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5500] flex items-center justify-center shrink-0">
                                        <DollarSign className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#FF5500] transition-colors">Withdraw Earnings</p>
                                        <p className="text-[10px] text-slate-400">Get your money</p>
                                    </div>
                                </button>

                                <Link
                                    href="/seller/upgrade"
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#FF5500] transition-colors">Promote Your Store</p>
                                        <p className="text-[10px] text-slate-400">Increase your visibility</p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Student Sellers Build Your Future Card */}
                        <div className="bg-[#0B0F19] text-white rounded-2xl p-6 shadow-md space-y-4 border border-white/5 relative overflow-hidden text-center">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto">
                                <Crown className="h-6 w-6 text-[#FF5500]" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white">Student Sellers</h4>
                                <p className="text-xs font-semibold text-[#FF5500]">Build Your Future</p>
                                <p className="text-[11px] text-slate-400">Sell. Earn. Grow.</p>
                            </div>
                            <Link
                                href="/faq"
                                className="inline-flex items-center justify-center w-full py-2.5 bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#FF5500]/25"
                            >
                                View Tips
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ─── 4. TABS (Offers, Payouts, Referrals) ─── */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                    <Tabs defaultValue="offers" className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                            <TabsList className="bg-muted p-1 rounded-xl h-auto gap-1">
                                <TabsTrigger value="orders" className="text-xs font-semibold rounded-lg px-4 py-2">
                                    Recent Orders
                                </TabsTrigger>
                                <TabsTrigger value="offers" className="text-xs font-semibold rounded-lg px-4 py-2 relative">
                                    Price Offers
                                    {offerStats.totalPending > 0 && (
                                        <span className="ml-1.5 px-1.5 py-0.2 bg-[#FF6200] text-white rounded-full text-[10px] font-bold">
                                            {offerStats.totalPending}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="rewards" className="text-xs font-semibold rounded-lg px-4 py-2">
                                    Rewards & Referrals
                                </TabsTrigger>
                                <TabsTrigger value="payouts" className="text-xs font-semibold rounded-lg px-4 py-2">
                                    Payout Account
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* TAB 1: Recent Orders */}
                        <TabsContent value="orders" className="space-y-4 m-0">
                            {orders.length === 0 ? (
                                <div className="text-center py-16 space-y-3 bg-muted/30 border border-dashed border-border rounded-2xl">
                                    <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                                    <h3 className="text-sm font-bold text-foreground">No orders received yet</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        When customers purchase items from your store, they will appear here for fulfillment.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="p-4 rounded-xl border border-border bg-background hover:border-[#FF6200]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="relative h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                                                    {order.listing?.images?.[0] ? (
                                                        <Image
                                                            src={order.listing.images[0]}
                                                            alt={order.listing.title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                            <Package className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold text-foreground line-clamp-1">
                                                            {order.listing?.title || `Order #${order.id.slice(0, 8)}`}
                                                        </h4>
                                                        <Badge
                                                            className={cn(
                                                                "text-[10px] px-2 py-0 font-semibold uppercase",
                                                                order.status === 'completed' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                                order.status === 'confirmed' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                                                order.status === 'cancelled' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                                                "bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20"
                                                            )}
                                                        >
                                                            {order.status === 'confirmed' ? 'Shipped' : order.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Customer: <span className="font-semibold text-foreground">{order.buyer?.display_name || 'Buyer'}</span> • ₦{order.amount.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {order.status === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                                        disabled={updatingOrder === order.id}
                                                        className="bg-[#FF6200] hover:bg-[#FF7A29] text-white text-xs rounded-xl font-semibold"
                                                    >
                                                        {updatingOrder === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark Shipped'}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openChat(order)}
                                                    className="rounded-xl text-xs gap-1.5"
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5" /> Message
                                                </Button>
                                                <Link href={`/seller/orders/${order.id}`}>
                                                    <Button variant="ghost" size="sm" className="rounded-xl text-xs">
                                                        Details
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB 2: Price Offers */}
                        <TabsContent value="offers" className="space-y-4 m-0">
                            {offers.length === 0 ? (
                                <div className="text-center py-16 space-y-3 bg-muted/30 border border-dashed border-border rounded-2xl">
                                    <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                                    <h3 className="text-sm font-bold text-foreground">No price offers yet</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        When buyers make custom price offers on your listings, you can review and accept them here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {offers.map((offer) => (
                                        <div
                                            key={offer.id}
                                            className="p-5 rounded-xl border border-border bg-background hover:border-[#FF6200]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-foreground">
                                                        {offer.listing?.title || 'Listing'}
                                                    </h4>
                                                    <Badge
                                                        className={cn(
                                                            "text-[10px] px-2 py-0 font-semibold uppercase",
                                                            offer.status === 'accepted' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                            offer.status === 'rejected' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                                            "bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20"
                                                        )}
                                                    >
                                                        {offer.status}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-muted-foreground">Original: ₦{offer.listing?.price?.toLocaleString()}</span>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-extrabold text-[#FF6200]">Offered: ₦{offer.offered_price.toLocaleString()}</span>
                                                    <span className="text-muted-foreground">• By {offer.buyer?.display_name || 'Buyer'}</span>
                                                </div>

                                                {offer.message && (
                                                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg italic">
                                                        "{offer.message}"
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {offer.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleOfferAction(offer, 'accept')}
                                                            disabled={processingOffer === offer.id}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-semibold"
                                                        >
                                                            {processingOffer === offer.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Accept Offer'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOfferAction(offer, 'reject')}
                                                            disabled={processingOffer === offer.id}
                                                            className="text-xs rounded-xl hover:text-red-600"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={async () => {
                                                        const conversationId = await startConversation(user!.id, offer.buyer_id, offer.listing_id);
                                                        router.push(`/seller/chats/${conversationId}`);
                                                    }}
                                                    className="rounded-xl text-xs gap-1.5"
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5" /> Chat
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB 3: Rewards & Referrals */}
                        <TabsContent value="rewards" className="space-y-6 m-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* MarketCoins Card */}
                                <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[#FF6200]/10 text-[#FF6200] flex items-center justify-center">
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground">MarketCoins Balance</h3>
                                            <p className="text-xs text-muted-foreground">Digital merchant reward tokens</p>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-extrabold text-[#FF6200]">
                                                {(user?.coins_balance || 0).toLocaleString()}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">MC</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                            Earn 1 MC for every ₦200 sold. Redeem coins for listing promotions, fee discounts, and visibility spotlights.
                                        </p>
                                    </div>
                                </div>

                                {/* Referrals Card */}
                                <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground">Refer & Earn</h3>
                                            <p className="text-xs text-muted-foreground">Earn 100 MC for each invited merchant</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${user?.referral_link_code || ''}`}
                                                className="bg-muted text-xs rounded-xl font-mono"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    const link = `${window.location.origin}/signup?ref=${user?.referral_link_code}`;
                                                    navigator.clipboard.writeText(link);
                                                    toast('Referral link copied to clipboard!', 'success');
                                                }}
                                                className="bg-[#FF6200] hover:bg-[#FF7A29] text-white text-xs rounded-xl font-semibold shrink-0"
                                            >
                                                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                            <span>Merchants Invited: <strong className="text-foreground">{referralStats.totalInvited}</strong></span>
                                            <span>Total Earned: <strong className="text-[#FF6200]">{referralStats.coinsEarned} MC</strong></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ambassador Program Banner */}
                            <div className="bg-[#FF6200]/5 border border-[#FF6200]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-[#FF6200] text-white flex items-center justify-center shrink-0 shadow-sm">
                                        <Crown className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-foreground">Campus Ambassador Program</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Represent MarketBridge at your institution. Ambassadors receive 44 days of Pro status, profile badges, and bonus MarketCoins.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setIsAmbassadorModalOpen(true)}
                                    className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl shrink-0"
                                >
                                    {ambassadorStatus === 'approved' ? 'Ambassador Active' : ambassadorStatus === 'pending' ? 'Reviewing Application' : 'Apply to Ambassador'}
                                </Button>
                            </div>
                        </TabsContent>

                        {/* TAB 4: Payout Settings */}
                        <TabsContent value="payouts" className="space-y-6 m-0">
                            <div className="max-w-xl space-y-6">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">Payout Bank Account</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Link your Nigerian bank account to automatically receive payouts after escrow completion.
                                    </p>
                                </div>

                                <form onSubmit={updateBankDetails} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-foreground">Select Bank</Label>
                                        <Select
                                            value={bankDetails.bankCode}
                                            onValueChange={(val) => setBankDetails(prev => ({ ...prev, bankCode: val }))}
                                            required
                                        >
                                            <SelectTrigger className="rounded-xl text-xs bg-background border-border">
                                                <SelectValue placeholder="Choose your bank" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-64">
                                                {banks.map((bank) => (
                                                    <SelectItem key={bank.code} value={bank.code} className="text-xs">
                                                        {bank.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-foreground">Account Number (NUBAN)</Label>
                                        <div className="relative">
                                            <Input
                                                value={bankDetails.accountNumber}
                                                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                placeholder="10-digit account number"
                                                className="rounded-xl text-xs bg-background border-border font-mono"
                                                required
                                            />
                                            {isResolving && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#FF6200]" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-foreground">Account Name</Label>
                                        <Input
                                            value={bankDetails.accountName}
                                            readOnly
                                            placeholder="Auto-resolves from bank..."
                                            className="rounded-xl text-xs bg-muted border-border font-medium text-foreground cursor-not-allowed"
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={submittingBank || isResolving}
                                        className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl mt-2"
                                    >
                                        {submittingBank ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            'Save Payout Settings'
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

            </div>

            {/* Ambassador Application Modal */}
            {isAmbassadorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl text-foreground space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsAmbassadorModalOpen(false)}
                            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="text-center space-y-2">
                            <div className="h-12 w-12 rounded-xl bg-[#FF6200]/10 text-[#FF6200] flex items-center justify-center mx-auto">
                                <Crown className="h-6 w-6" />
                            </div>
                            <h2 className="text-lg font-bold">Apply as Campus Ambassador</h2>
                            <p className="text-xs text-muted-foreground">
                                Represent MarketBridge on your campus, organize local trade, and unlock exclusive rewards.
                            </p>
                        </div>

                        <form onSubmit={handleApplyAmbassador} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Your University</Label>
                                <Select value={ambassadorCampus} onValueChange={setAmbassadorCampus} required>
                                    <SelectTrigger className="rounded-xl text-xs bg-background border-border">
                                        <SelectValue placeholder="Select campus institution" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="Baze University" className="text-xs">Baze University</SelectItem>
                                        <SelectItem value="Nile University of Nigeria" className="text-xs">Nile University of Nigeria</SelectItem>
                                        <SelectItem value="Veritas University" className="text-xs">Veritas University</SelectItem>
                                        <SelectItem value="Cosmopolitan University" className="text-xs">Cosmopolitan University</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Why do you want to represent MarketBridge?</Label>
                                <Textarea
                                    value={ambassadorMotivation}
                                    onChange={(e) => setAmbassadorMotivation(e.target.value)}
                                    placeholder="Tell us about your campus activities and interest..."
                                    className="min-h-[100px] rounded-xl text-xs bg-background border-border"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmittingAmbassador}
                                className="w-full bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl h-11"
                            >
                                {isSubmittingAmbassador ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Ambassador Application"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

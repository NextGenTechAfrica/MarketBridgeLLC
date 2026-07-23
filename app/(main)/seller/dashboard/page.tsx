'use client';

/** 
 * Deployment Trigger: v1.0.1
 * Seller Dashboard - Full Real Logic & Trial System
 */

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
    RotateCcw,
    ArrowLeft,
    ArrowRight,
    ChevronRight,
    Loader2,
    Mail,
    ShieldAlert,
    RefreshCw,
    User,
    Crown,
    Star,
    Sparkles,
    X,
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
import { SellerGuide } from '@/components/SellerGuide';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { SellerWeatherWidget } from '@/components/seller-weather-widget';
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

    const fetchBankDetails = async () => {
        if (!user) return;
        const { data, error } = await supabase
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

    const [sessionLost, setSessionLost] = useState(false);

    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams?.get('subscription') === 'success') {
            toast('Subscription updated successfully! Need help? Contact ops-support@marketbridge.com.ng', 'success');
            router.replace('/seller/dashboard');
        }
    }, [searchParams, router]);

    useEffect(() => {
        if (authLoading) return;
        if (!sessionUser) {
            setSessionLost(true);
            router.push('/login');
            return;
        }
        if (!user) return;

        const approvedRoles = ['student_seller'];
        if (approvedRoles.includes(user.role)) {
            setApplicationStatus('approved');
            setSessionLost(false);
            // Check subscription/trial status for approved sellers too
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

        // Executive roles MUST use separate accounts for selling
        const ADMIN_ROLES = ['admin', 'technical_admin', 'operations_admin', 'marketing_admin', 'ceo', 'cofounder', 'cto', 'coo', 'systems_admin', 'it_support'];
        if (user?.role && ADMIN_ROLES.includes(user.role)) {
            console.warn('Seller dashboard: Admin attempt blocked');
            router.push('/admin');
            return;
        }

        // Buyers who submitted a seller application — check application status
        if (user.role === 'student_buyer') {
            checkApplicationStatus();
            return;
        }

        // Completely unrelated role — redirect home
        console.warn('Seller dashboard: unrecognized role', user.role);
        router.push('/');
    }, [user, sessionUser, authLoading, router]);

    // Query the subscriptions table — the single source of truth for trial state
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

                // Show the plan prompt once per session
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
            // Check application status
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
                // Check if already an ambassador
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
                // Use subscription trial_end if available (set by the API on submit)
                // Fall back to 14 days from application creation
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
                    // Show plan prompt once per session
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
            // Count users referred by this user
            const { count, error: countError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('referred_by_id', user.id);

            // Sum referral coins from transactions
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
                // If trial was handled, we might want to refresh user data or show a message
                console.log('Trial expiration handled');
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to check subscription status:', err);
        }
    };

    const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
    const [isResolving, setIsResolving] = useState(false);
    const [submittingBank, setSubmittingBank] = useState(false);

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
            toast('Dashboard data synchronized', 'success');
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
                // 1. Update listing price
                const { error: listError } = await supabase
                    .from('listings')
                    .update({
                        current_offered_price: offer.offered_price
                    })
                    .eq('id', offer.listing_id);

                if (listError) throw listError;

                // 2. Update offer status
                const { error: offerError } = await supabase
                    .from('offers')
                    .update({ status: 'accepted' })
                    .eq('id', offer.id);

                if (offerError) throw offerError;

                // 3. Notify buyer via chat (Optional but good)
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

                toast('✅ Offer accepted! Buyer notified via chat.', 'success');
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

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (authLoading || (loading && applicationStatus === 'loading') || (!mounted && !sessionLost)) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 relative overflow-hidden text-zinc-900 dark:text-white transition-colors duration-300">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 dark:opacity-[0.03] pointer-events-none" />
                <div className="relative text-center">
                    <div className="h-24 w-24 rounded-2xl border-2 border-[#FF6200]/20 flex items-center justify-center relative animate-pulse mx-auto">
                        <Zap className="h-10 w-10 text-[#FF6200] animate-bounce" />
                        <div className="absolute inset-0 rounded-2xl border border-[#FF6200] animate-ping opacity-25" />
                    </div>
                    <p className="mt-8 text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-[0.3em] text-xs font-heading">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    if (sessionLost) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-white p-6 relative overflow-hidden transition-colors duration-300">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 dark:opacity-[0.03] pointer-events-none" />
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 shadow-2xl p-8 rounded-[2rem] text-center relative z-10 transition-colors">
                    <AlertCircle className="h-16 w-16 text-[#FF6200] mx-auto mb-6" />
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Session Expired</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-8">Your session has ended. Please log in again to continue.</p>
                    <Button onClick={() => window.location.reload()} className="w-full h-14 bg-[#FF6200] text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#FF7A29] transition-all">
                        Refresh Page
                    </Button>
                    <Button variant="ghost" onClick={() => router.push('/login')} className="w-full mt-4 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-black uppercase tracking-widest text-[10px]">
                        Go to Login
                    </Button>
                </div>
            </div>
        );
    }

    // ─── NEW SELLER: No application yet — prompt them to onboard ───
    if (applicationStatus === 'none') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-white p-6">
                <div className="max-w-lg w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-12 rounded-[3rem] text-center space-y-6">
                    <div className="h-24 w-24 rounded-3xl bg-[#FF6200]/10 border border-[#FF6200]/20 flex items-center justify-center mx-auto">
                        <Package className="h-10 w-10 text-[#FF6200]" />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Complete Your Setup</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                        You haven't submitted your seller application yet. Complete it in under 2 minutes to start selling on campus.
                    </p>
                    <Link href="/seller-onboard">
                        <Button className="w-full h-14 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-black uppercase tracking-widest rounded-2xl text-sm shadow-[0_8px_30px_rgba(255,98,0,0.3)] transition-all hover:scale-105">
                            Start Seller Application <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/marketplace" className="block text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold transition-colors">
                        Browse Marketplace Instead
                    </Link>
                </div>
            </div>
        );
    }

    // ─── PENDING: check trial status ───
    if (applicationStatus === 'pending') {
        const trialActive = trialExpiresAt ? new Date() < trialExpiresAt : false;
        const daysLeft = trialExpiresAt
            ? Math.max(0, Math.ceil((trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0;

        // Trial expired — force upgrade wall
        if (!trialActive) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-white p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#FF6200]/8 blur-[150px] rounded-full pointer-events-none" />
                    <div className="max-w-lg w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-12 rounded-[3rem] text-center space-y-6 relative z-10">
                        <div className="h-24 w-24 rounded-3xl bg-[#FF6200]/10 border border-[#FF6200]/30 flex items-center justify-center mx-auto">
                            <Zap className="h-10 w-10 text-[#FF6200]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF6200] mb-2">Free Trial Ended</p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Pick Your Plan</h2>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                            Your 14-day free trial has ended. Choose a plan to keep selling on MarketBridge and unlock more features.
                        </p>
                        <div className="grid gap-3">
                            <Link href="/seller/upgrade">
                                <Button className="w-full h-14 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_8px_30px_rgba(255,98,0,0.3)] transition-all hover:scale-105">
                                    <Crown className="h-4 w-4 mr-2" /> View Pricing Plans
                                </Button>
                            </Link>
                            <a href="https://wa.me/2349012345678?text=My%20MarketBridge%20seller%20trial%20expired" target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="w-full h-12 border-zinc-200 dark:border-zinc-700 font-black uppercase tracking-widest text-xs">
                                    Contact Support
                                </Button>
                            </a>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium">
                            Plans start at <strong className="text-zinc-700 dark:text-zinc-200">₦2,500/month</strong>. Cancel anytime.
                        </p>
                    </div>
                </div>
            );
        }

        // Trial still active — fall through to render full dashboard below
        // (trialActive is passed to main return via trialExpiresAt/applicationStatus)
    }

    // ─── REJECTED ───
    if (applicationStatus === 'rejected') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-white p-6">
                <div className="max-w-lg w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-2xl p-12 rounded-[3rem] text-center space-y-6">
                    <div className="h-24 w-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                        <AlertCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Application Declined</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                        Unfortunately, your application wasn't approved this time. You can re-apply with updated information.
                    </p>
                    <Link href="/seller-onboard">
                        <Button className="w-full h-14 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-black uppercase tracking-widest rounded-2xl text-sm shadow-[0_8px_30px_rgba(255,98,0,0.3)]">
                            Re-Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <a href="https://wa.me/2349012345678?text=My%20seller%20application%20was%20declined" target="_blank" rel="noopener noreferrer" className="block text-xs text-zinc-400 hover:text-red-500 font-bold transition-colors">
                        Contact support for more info →
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-white relative flex flex-col selection:bg-[#FF6200] selection:text-black font-sans transition-colors duration-300">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 dark:opacity-[0.03] pointer-events-none z-0 transition-opacity duration-300" />

            {/* ─── PLAN PROMPT MODAL (first-time, trial sellers) ─── */}
            {showPlanPrompt && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button
                            onClick={() => setShowPlanPrompt(false)}
                            aria-label="Close"
                            className="absolute top-5 right-5 h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="text-center mb-8">
                            <div className="h-16 w-16 rounded-2xl bg-[#FF6200]/10 border border-[#FF6200]/20 flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="h-8 w-8 text-[#FF6200]" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF6200] mb-1">Welcome to Your Dashboard</p>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">You're on a Free Trial!</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mt-2">
                                Enjoy <strong className="text-zinc-900 dark:text-white">14 days free</strong> — then pick the plan that fits your hustle.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            {[
                                { name: 'Basic', price: '₦0', period: 'Free forever', icon: Star, features: ['5 listings', 'Basic dashboard', 'Messaging'], highlight: false },
                                { name: 'Standard', price: '₦1,500', period: '/month', icon: Zap, features: ['Unlimited listings', 'Analytics', 'Search priority', 'Negotiation tools'], highlight: true },
                                { name: 'Pro', price: '₦3,500', period: '/month', icon: Crown, features: ['Feed priority', 'Featured badge', 'Advanced insights', 'Priority support'], highlight: false },
                            ].map((plan) => (
                                <div key={plan.name} className={`relative rounded-2xl p-5 border ${plan.highlight
                                    ? 'border-[#FF6200] bg-[#FF6200]/5'
                                    : 'border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02]'
                                    }`}>
                                    {plan.highlight && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF6200] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                            Most Popular
                                        </div>
                                    )}
                                    <plan.icon className={`h-6 w-6 mb-3 ${plan.highlight ? 'text-[#FF6200]' : 'text-zinc-500'}`} />
                                    <p className="font-black text-sm uppercase tracking-tight">{plan.name}</p>
                                    <p className="text-xl font-black mt-1">{plan.price}<span className="text-xs font-bold text-zinc-400">{plan.period}</span></p>
                                    <ul className="mt-3 space-y-1">
                                        {plan.features.map(f => (
                                            <li key={f} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                                                <CheckCircle className="h-3 w-3 text-[#FF6200] shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/seller/upgrade" className="flex-1">
                                <Button className="w-full h-12 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-black uppercase tracking-widest rounded-xl text-xs shadow-[0_4px_20px_rgba(255,98,0,0.3)]">
                                    Choose a Plan <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                onClick={() => setShowPlanPrompt(false)}
                                className="flex-1 h-12 border-zinc-200 dark:border-zinc-700 font-black uppercase tracking-widest text-xs"
                            >
                                Continue with Free Trial
                            </Button>
                        </div>
                        <p className="text-center text-[10px] text-zinc-400 mt-4">You can upgrade anytime from your dashboard settings.</p>
                    </div>
                </div>
            )}

            {/* ─── TRIAL COUNTDOWN BANNER (pending sellers on trial) ─── */}
            {applicationStatus === 'pending' && trialExpiresAt && (() => {
                const daysLeft = Math.max(0, Math.ceil((trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                return (
                    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#FF6200] to-amber-500 text-white px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg">
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <Zap className="h-4 w-4 shrink-0" />
                            <span>
                                <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> left on your free trial.
                                {daysLeft <= 3 && ' ⚠️ Trial ending soon!'}
                            </span>
                        </div>
                        <Link href="/seller/upgrade">
                            <Button size="sm" className="h-8 px-5 bg-white text-[#FF6200] hover:bg-zinc-100 font-black uppercase tracking-widest text-[10px] rounded-full shrink-0">
                                Upgrade Now
                            </Button>
                        </Link>
                    </div>
                );
            })()}

            <SellerGuide />
            <div className="container mx-auto px-6 mt-6 relative z-10"><SellerWeatherWidget /></div>

            <div className="container mx-auto py-6 px-6 relative z-10 space-y-12 pb-24">

                {/* Header Section */}
                <div id="tour-header" className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-white/5 pb-12 transition-colors duration-300">
                    <div className="space-y-4">
                        <Button 
                            variant="ghost" 
                            onClick={() => router.push('/')}
                            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-white/40 hover:text-[#FF6200] hover:bg-transparent -ml-4 mb-4 transition-colors"
                        >
                            <ArrowLeft className="h-3 w-3 mr-2" /> Return to Market
                        </Button>
                        <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 dark:text-white/40 font-heading leading-tight transition-colors">Seller Dashboard</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic font-heading flex flex-wrap items-center gap-4">
                            Seller <span className="text-[#FF6200]">Dashboard</span>
                            {ambassadorStatus === 'approved' && (
                                <Badge className="h-10 px-6 bg-[#FF6200] text-black border-4 border-black font-black uppercase italic tracking-widest text-[10px] shadow-[0_4px_20px_rgba(255,98,0,0.5)] animate-in slide-in-from-right duration-500">
                                    <Crown className="h-4 w-4 mr-2" /> Brand Ambassador
                                </Badge>
                            )}
                        </h1>
                        <p className="text-zinc-500 dark:text-white/40 font-medium max-w-xl italic transition-colors">
                            Dashboard for <span className="text-zinc-900 dark:text-white font-bold">{user?.displayName}</span>.
                            Managing <span className="text-zinc-900 dark:text-white font-bold">your active listings</span> across campus.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="h-16 px-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none flex flex-col justify-center shrink-0 transition-all duration-300">
                            <span className="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest border-b border-zinc-100 dark:border-white/5 mb-1 pb-1 font-heading transition-colors">Status</span>
                            <span className="text-sm font-black text-zinc-900 dark:text-white italic uppercase tracking-tighter flex items-center gap-2 font-heading transition-colors">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6200] animate-pulse" /> Connected
                            </span>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Button id="tour-sync" onClick={fetchOrders} className="h-16 px-8 flex-1 md:flex-none bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(255,98,0,0.2)] hover:shadow-[0_8px_30px_rgba(255,98,0,0.3)]">
                                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Subscription Banners */}
                <TrialBanner />

                {/* Ambassador Recruitment Nudge */}
                {ambassadorStatus === 'none' && user?.role !== 'ambassador' && (
                    <div id="tour-vanguard" className="w-full">
                        <div className="w-full">
                        <Link href="/ambassador" className="group">
                            <div className="p-8 rounded-[2.5rem] border border-[#FF6200]/20 bg-[#FF6200]/5 hover:bg-[#FF6200]/10 transition-all flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                                <Crown className="absolute -bottom-6 -right-6 h-32 w-32 text-[#FF6200] opacity-5 rotate-12" />
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="h-16 w-16 rounded-2xl bg-[#FF6200] text-black flex items-center justify-center shrink-0 shadow-[0_4px_20px_rgba(255,98,0,0.3)] group-hover:scale-105 transition-transform">
                                        <Crown className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-white">Own Your Campus</h3>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-white/40 italic">Apply to be a Lead and get 44 days of Pro + 500 MarketCoins free. Lead the movement on your campus.</p>
                                    </div>
                                </div>
                                <Button className="h-14 px-8 bg-[#FF6200] text-black hover:bg-[#FF7A29] font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg relative z-10 shrink-0">
                                    Learn More & Apply
                                </Button>
                            </div>
                        </Link>
                    </div>
                </div>
                )}

                {/* Performance Metrics */}
                <div id="tour-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Revenue Cycle", val: `₦${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: revenueTrend },
                        { label: "Active Orders", val: stats.totalOrders, icon: ShoppingBag, trend: "Stable" },
                        { label: "Pending Verification", val: stats.pendingOrders, icon: Clock, color: "text-[#FF6200]" },
                        { label: "Success Rate", val: `${Math.round((stats.completedOrders / (stats.totalOrders || 1)) * 100)}%`, icon: TrendingUp, color: "text-zinc-900 dark:text-white" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-3xl p-8 group relative overflow-hidden transition-all duration-500 hover:border-[#FF6200]/30 hover:-translate-y-1 dark:hover:bg-white/[0.04]">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:text-[#FF6200] transition-colors">
                                <stat.icon className="h-12 w-12" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-white/40 italic font-heading leading-tight transition-colors">{stat.label}</span>
                                    {stat.trend && <span className="text-[9px] font-black text-[#FF6200] bg-[#FF6200]/10 border border-[#FF6200]/20 px-2 py-0.5 rounded uppercase font-heading">{stat.trend}</span>}
                                </div>
                                <div className={cn("text-3xl font-black uppercase tracking-tighter font-heading transition-colors", stat.color || "text-zinc-900 dark:text-white")}>
                                    {stat.val}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div id="tour-actions" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "New Listing", desc: "List new item on marketplace", href: "/seller/listings/new", icon: Package, primary: true },
                        { label: "Inventory", desc: "Manage and update your items", href: "/seller/listings", icon: Eye },
                        { label: "Messages", desc: "Check incoming customer chats", href: "/seller/chats", icon: MessageCircle },
                        { label: "Upgrade Plan", desc: "Unlock pro features & visibility", href: "/seller/upgrade", icon: Crown, highlight: true },
                    ].map((action, i) => (
                        <Link key={i} href={action.href} className="group h-full">
                            <div className={cn(
                                "p-8 rounded-[2rem] transition-all duration-500 h-full flex flex-col justify-between border hover:-translate-y-1",
                                action.primary
                                    ? "bg-[#FF6200] border-[#FF6200] text-black shadow-[0_8px_30px_rgba(255,98,0,0.3)] hover:scale-105"
                                    : action.highlight
                                        ? "bg-zinc-900 dark:bg-transparent border-zinc-800 dark:border-white/20 text-white hover:border-[#FF6200]/50 hover:bg-zinc-800 dark:hover:bg-white/5 shadow-xl dark:shadow-none"
                                        : "bg-white dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white shadow-sm dark:shadow-none hover:border-[#FF6200]/30 dark:hover:bg-white/[0.04]"
                            )}>
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 mb-6",
                                    action.primary ? "bg-white/20" : action.highlight ? "bg-[#FF6200]/20 text-[#FF6200]" : "bg-zinc-100 dark:bg-zinc-800/50"
                                )}>
                                    <action.icon className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black uppercase tracking-tighter italic font-heading">{action.label}</h4>
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest font-heading lowercase italic opacity-60",
                                        action.highlight ? "text-[#FF6200]" : ""
                                    )}>
                                        {action.desc}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Orders & Offers Container */}
                <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-[3rem] p-10 overflow-hidden transition-colors duration-300">
                    <Tabs defaultValue="orders" className="space-y-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-zinc-200 dark:border-white/5 pb-8 transition-colors duration-300">
                            <div id="tour-tabs" className="flex bg-zinc-50 dark:bg-white/5 p-1.5 rounded-2xl border border-zinc-200 dark:border-white/5 transition-colors duration-300">
                                <TabsList className="bg-transparent gap-2 h-auto p-0 border-none shadow-none text-zinc-500 dark:text-zinc-400">
                                    <TabsTrigger value="orders" className="data-[state=active]:bg-[#FF6200] data-[state=active]:text-black h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all font-heading">Recent Orders</TabsTrigger>
                                    <TabsTrigger value="offers" className="data-[state=active]:bg-[#FF6200] data-[state=active]:text-black h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all font-heading relative">
                                        Price Offers
                                        {offerStats.totalPending > 0 && (
                                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#FF6200] rounded-full text-[8px] flex items-center justify-center text-black border-2 border-black animate-pulse">
                                                {offerStats.totalPending}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="rewards" className="data-[state=active]:bg-[#FF6200] data-[state=active]:text-black h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all font-heading">Rewards & Referrals</TabsTrigger>
                                    <TabsTrigger value="settings" className="data-[state=active]:bg-[#FF6200] data-[state=active]:text-black h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all font-heading">Payout Settings</TabsTrigger>
                                </TabsList>
                            </div>
                            <div className="flex items-center gap-4 text-zinc-400 dark:text-white/40 text-[10px] font-black uppercase tracking-widest font-heading italic transition-colors">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6200] animate-pulse" /> Auto-refresh enabled
                            </div>
                        </div>

                        <TabsContent value="orders" className="space-y-10 focus-visible:outline-none focus:outline-none">
                            <Tabs defaultValue="all" className="space-y-8">
                                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-10 overflow-x-auto border-none shadow-none">
                                    {['all', 'pending', 'confirmed', 'completed'].map(t => (
                                        <TabsTrigger key={t} value={t} className="data-[state=active]:text-[#FF6200] data-[state=active]:border-[#FF6200] bg-transparent border-b-2 border-transparent rounded-none px-0 pb-4 font-black uppercase tracking-widest text-[10px] transition-all font-heading shadow-none">
                                            {t === 'confirmed' ? 'Shipped' : t}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <div className="grid grid-cols-1 gap-6">
                                    <TabsContent value="all" className="space-y-6 m-0 border-none">
                                        {orders.length === 0 ? (
                                                <div className="text-center py-24 bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none border-dashed transition-colors duration-300">
                                                    <Package className="h-16 w-16 text-zinc-300 dark:text-white/10 mx-auto mb-6 transition-colors" />
                                                    <p className="text-zinc-500 dark:text-white/40 font-black uppercase tracking-widest text-xs font-heading italic transition-colors">No orders found</p>
                                            </div>
                                        ) : (
                                            orders.map((order: Order) => (
                                                <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} onOpenChat={openChat} isUpdating={updatingOrder === order.id} />
                                            ))
                                        )}
                                    </TabsContent>
                                    {['pending', 'confirmed', 'completed'].map(status => (
                                        <TabsContent key={status} value={status} className="space-y-6 m-0 border-none">
                                            {orders.filter((o: Order) => o.status === status).length === 0 ? (
                                                <div className="text-center py-24 bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none border-dashed transition-colors duration-300">
                                                    <Package className="h-16 w-16 text-zinc-300 dark:text-white/10 mx-auto mb-6 transition-colors" />
                                                    <p className="text-zinc-500 dark:text-white/40 font-black uppercase tracking-widest text-xs font-heading italic transition-colors">No status orders found</p>
                                                </div>
                                            ) : (
                                                orders.filter((o: Order) => o.status === status).map((order: Order) => (
                                                    <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} onOpenChat={openChat} isUpdating={updatingOrder === order.id} />
                                                ))
                                            )}
                                        </TabsContent>
                                    ))}
                                </div>
                            </Tabs>
                        </TabsContent>

                        <TabsContent value="offers" className="space-y-10 focus-visible:outline-none focus:outline-none">
                            <div className="grid grid-cols-1 gap-6">
                                {offers.length === 0 ? (
                                    <div className="text-center py-24 bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none border-dashed transition-colors duration-300">
                                        <Zap className="h-16 w-16 text-zinc-300 dark:text-white/10 mx-auto mb-6 transition-colors" />
                                        <p className="text-zinc-500 dark:text-white/40 font-black uppercase tracking-widest text-xs font-heading italic transition-colors">No price offers yet</p>
                                    </div>
                                ) : (
                                    offers.map((offer) => (
                                        <div key={offer.id} className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none p-6 flex flex-col md:flex-row gap-8 group/card transition-all duration-500 hover:border-[#FF6200]/20 dark:hover:border-[#FF6200]/30 italic">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-heading transition-colors">Order: #{offer.id.slice(-8).toUpperCase()}</span>
                                                        <Badge className={cn(
                                                            "px-3 py-1 font-black uppercase text-[9px] tracking-widest border font-heading italic transition-colors",
                                                            offer.status === 'pending' ? 'bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20' :
                                                                offer.status === 'accepted' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700' :
                                                                    'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                                                        )}>
                                                            {offer.status}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-600 font-black uppercase font-heading transition-colors">{new Date(offer.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tighter font-heading text-zinc-900 dark:text-white transition-colors">{offer.listing?.title}</h3>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black tracking-widest uppercase transition-colors">Original: ₦{offer.listing?.price?.toLocaleString()}</span>
                                                        <ArrowRight className="h-3 w-3 text-zinc-400 dark:text-zinc-600 transition-colors" />
                                                        <span className="text-lg font-black text-[#FF6200]">Offered: ₦{offer.offered_price.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-xl transition-colors">
                                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-600 font-black uppercase tracking-widest mb-1 transition-colors">Message from Buyer</p>
                                                    <p className="text-xs text-zinc-700 dark:text-zinc-400 font-medium leading-relaxed transition-colors">{offer.message || 'No additional message.'}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden transition-colors">
                                                        {offer.buyer?.photo_url ? <Image src={offer.buyer.photo_url} alt="B" fill className="object-cover" /> : <User className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 transition-colors">Buyer: {offer.buyer?.display_name}</span>
                                                </div>
                                            </div>
                                            <div className="flex md:flex-col justify-end gap-3 shrink-0">
                                                {offer.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleOfferAction(offer, 'accept')}
                                                            disabled={processingOffer === offer.id}
                                                            className="flex-1 md:w-32 h-12 bg-[#FF6200] text-black font-black uppercase tracking-widest text-[10px] hover:bg-[#FF7A29] transition-all shadow-sm"
                                                        >
                                                            {processingOffer === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleOfferAction(offer, 'reject')}
                                                            disabled={processingOffer === offer.id}
                                                            variant="outline"
                                                            className="flex-1 md:w-32 h-12 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 font-black uppercase tracking-widest text-[10px] transition-colors shadow-sm dark:shadow-none"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    onClick={async () => {
                                                        const conversationId = await startConversation(user!.id, offer.buyer_id, offer.listing_id);
                                                        router.push(`/seller/chats/${conversationId}`);
                                                    }}
                                                    variant="ghost"
                                                    className="flex-1 md:w-32 h-12 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-black uppercase tracking-widest text-[10px] gap-2 transition-colors"
                                                >
                                                    <MessageCircle className="h-4 w-4" /> Message
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="rewards" className="divide-y divide-white/5 focus-visible:outline-none focus:outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* MarketCoins Card */}
                                <div className="p-10 rounded-[3rem] border border-zinc-100 dark:border-white/5 bg-white/[0.02] flex flex-col justify-between transition-colors">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-[#FF6200]/10 border border-[#FF6200]/20 flex items-center justify-center">
                                                <Zap className="h-6 w-6 text-[#FF6200]" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black uppercase tracking-tighter italic font-heading">MarketCoins</h3>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Digital Rewards</p>
                                            </div>
                                        </div>

                                        <div className="py-8 border-y border-zinc-100 dark:border-white/5">
                                            <p className="text-[10px] font-black uppercase text-zinc-900/30 dark:text-white/20 tracking-[0.3em] mb-2 font-heading">Active Balance</p>
                                            <div className="flex items-baseline gap-2 font-heading">
                                                <span className="text-6xl font-black text-zinc-900 dark:text-white italic tracking-tighter">{(user?.coins_balance || 0).toLocaleString()}</span>
                                                <span className="text-xl font-black text-[#FF6200] italic">MC</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-medium text-zinc-500 italic leading-relaxed">
                                                Earn 1 MC for every ₦200 you sell. Redeem coins for listing promotions, platform perks, or trading discounts.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline" className="border-zinc-200 text-zinc-600 font-black uppercase text-[8px] tracking-widest">1 MC = Reward System</Badge>
                                                <Badge variant="outline" className="border-zinc-200 text-zinc-600 font-black uppercase text-[8px] tracking-widest">Atomic Redemption</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Refer & Earn Card */}
                                <div className="p-10 rounded-[3rem] border border-zinc-100 dark:border-white/5 bg-white/[0.02] space-y-8 transition-colors">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter italic font-heading">Refer & Earn</h3>
                                        <p className="text-zinc-500 text-xs italic">Expand the network and earn 100 MC for every verified referral.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-heading">Your Referral Code</Label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-[#FAFAFA]/40 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl px-6 flex items-center h-14 font-mono text-lg font-black text-[#FF6200] tracking-widest">
                                                    {user?.referral_link_code || 'PENDING'}
                                                </div>
                                                <Button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/signup?ref=${user?.referral_link_code}`;
                                                        navigator.clipboard.writeText(link);
                                                        toast('Referral link copied to clipboard! 🔗', 'success');
                                                    }}
                                                    className="h-14 px-6 bg-white dark:bg-white/5 text-black dark:text-white font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                                                >
                                                    Copy Link
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-2xl transition-colors">
                                            <div className="flex justify-between items-center mb-4 text-zinc-900/30 dark:text-white/20">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Referral Stats</span>
                                                <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Total Invited</p>
                                                    <p className="text-2xl font-black text-zinc-900 italic font-heading">{referralStats.totalInvited}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Coins Earned</p>
                                                    <p className="text-2xl font-black text-[#FF6200] italic font-heading">{referralStats.coinsEarned} MC</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                                {/* Brand Ambassador Card */}
                                <div className={cn(
                                    "p-10 rounded-[3rem] border transition-all duration-500 flex flex-col justify-between group h-full relative overflow-hidden",
                                    ambassadorStatus === 'approved' 
                                        ? "bg-[#FF6200]/5 border-[#FF6200] shadow-[0_0_30px_rgba(255,98,0,0.1)]" 
                                        : "bg-white/[0.02] border-zinc-100 dark:border-white/5 hover:border-[#FF6200]/30"
                                )}>
                                    <div className="space-y-6 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl border flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                                                ambassadorStatus === 'approved' 
                                                    ? "bg-[#FF6200] text-black border-[#FF6200]" 
                                                    : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-100 dark:border-white/5 text-[#FF6200]"
                                            )}>
                                                <Crown className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black uppercase tracking-tighter italic font-heading">Brand Ambassador</h3>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Campus Growth Expert</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {ambassadorStatus === 'approved' ? (
                                                <div className="p-6 bg-white dark:bg-black/40 border border-[#FF6200]/20 rounded-2xl space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-[#FF6200]" />
                                                        <span className="text-xs font-black uppercase tracking-widest text-[#FF6200]">Active Status</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 italic">
                                                        You are an official MarketBridge Ambassador for <span className="text-zinc-900 dark:text-white font-black">{ambassadorDetails?.campus}</span>.
                                                    </p>
                                                    <div className="pt-2 flex flex-wrap gap-2">
                                                        <Badge className="bg-[#FF6200] text-black font-black uppercase text-[8px] tracking-widest border-0">44 DAYS PRO ACTIVE</Badge>
                                                        <Badge variant="outline" className="border-[#FF6200]/30 text-[#FF6200] font-black uppercase text-[8px] tracking-widest">AMBASSADOR BADGE</Badge>
                                                    </div>
                                                </div>
                                            ) : ambassadorStatus === 'pending' ? (
                                                <div className="p-6 bg-[#FF6200]/5 border border-[#FF6200]/10 rounded-2xl">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="h-4 w-4 text-[#FF6200] animate-pulse" />
                                                        <span className="text-xs font-black uppercase tracking-widest text-[#FF6200]">Review in Progress</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-zinc-500 italic">
                                                        Your application to lead <span className="text-zinc-900 dark:text-white font-bold">{ambassadorDetails?.campus}</span> is being reviewed. You will receive an update via email.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-medium text-zinc-500 italic leading-relaxed">
                                                        Become the face of MarketBridge on your campus. Approved Ambassadors get an exclusive profile badge, 44 days of Pro status, and 500 MarketCoins.
                                                    </p>
                                                    <Button 
                                                        onClick={() => setIsAmbassadorModalOpen(true)}
                                                        className="h-12 w-full bg-white dark:bg-zinc-900 text-black dark:text-white border border-zinc-200 dark:border-white/10 font-black uppercase tracking-widest text-[10px] hover:border-[#FF6200] hover:text-[#FF6200] transition-all"
                                                    >
                                                        Apply Now
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Visual Accent */}
                                    <Crown className="absolute -bottom-6 -right-6 h-32 w-32 text-[#FF6200] opacity-[0.03] rotate-12" />
                                </div>
                                {ambassadorStatus === 'approved' && (
                                    <div className="mt-10 pt-10 border-t border-zinc-100 dark:border-white/5 space-y-6">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-[#FF6200]" />
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] italic">Ambassador Impact</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Network Growth', val: `${referralStats.totalInvited}`, desc: 'Users Onboarded' },
                                                { label: 'Status Multiplier', val: '2.5x', desc: 'Bonus Coins Active' },
                                                { label: 'Reward Pool', val: `${referralStats.coinsEarned + 500}`, desc: 'Total MC Earned' },
                                                { label: 'Campus Rank', val: '#12', desc: 'Top Performer' },
                                            ].map((m, i) => (
                                                <div key={i} className="p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
                                                    <p className="text-[8px] font-black uppercase text-zinc-500 mb-1">{m.label}</p>
                                                    <p className="text-xl font-black text-zinc-900 dark:text-white italic font-heading leading-tight">{m.val}</p>
                                                    <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{m.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="focus-visible:outline-none focus:outline-none">
                            <div className="max-w-xl space-y-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter font-heading italic">Payout Settings</h3>
                                    <p className="text-zinc-500 text-sm italic mb-4">Set up your bank account to receive payments automatically.</p>
                                    <div className="bg-[#FF6200]/5 border border-[#FF6200]/10 p-4 rounded-2xl flex items-start gap-4 mb-8">
                                        <Zap className="h-5 w-5 text-[#FF6200] shrink-0 mt-1" />
                                        <p className="text-[10px] text-[#FF6200] font-black uppercase tracking-widest leading-relaxed">
                                            Beta Feature: Funds are split automatically. You receive the net amount minus platform commission directly to this bank via Paystack settlement.
                                        </p>
                                    </div>
                                </div>
                                <form onSubmit={updateBankDetails} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 font-heading">Select Bank</Label>
                                            <Select
                                                value={bankDetails.bankCode}
                                                onValueChange={(val) => setBankDetails(prev => ({ ...prev, bankCode: val }))}
                                                required
                                            >
                                                <SelectTrigger className="h-14 bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl font-heading text-[10px] font-black uppercase tracking-widest text-left dark:text-white">
                                                    <SelectValue placeholder="SELECT BANK" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-heading text-[10px] font-black uppercase tracking-widest">
                                                    {banks.map((bank) => (
                                                        <SelectItem key={bank.code} value={bank.code} className="focus:bg-[#FF6200] focus:text-black py-3">
                                                            {bank.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 font-heading">Account Number</Label>
                                            <div className="relative">
                                                <Input
                                                    value={bankDetails.accountNumber}
                                                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                    placeholder="0123456789"
                                                    className="h-14 bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200] transition-colors font-mono tracking-widest dark:text-white"
                                                    required
                                                />
                                                {isResolving && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#FF6200]" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 font-heading">Account Name</Label>
                                        <Input
                                            value={bankDetails.accountName}
                                            readOnly
                                            placeholder="AUTO-RESOLVING NAME..."
                                            className="h-14 bg-zinc-50 dark:bg-black/20 border-zinc-200 dark:border-white/5 rounded-xl font-heading text-sm uppercase tracking-widest text-zinc-900 dark:text-white/60 cursor-not-allowed"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={submittingBank || isResolving} className="h-14 px-12 bg-zinc-900 dark:bg-[#FF6200] text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-[#FF7A29] rounded-xl font-black uppercase tracking-widest font-heading transition-all whitespace-nowrap shadow-xl shadow-zinc-900/10 dark:shadow-[#FF6200]/10 group">
                                        {submittingBank ? (
                                            <>
                                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                Save Payout Details <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="border-t border-zinc-100 dark:border-white/5 pt-8 text-center pb-8 transition-colors">
                    <p className="text-[10px] text-zinc-900/30 dark:text-white/20 font-medium leading-relaxed">
                        Beta platform – technical problems? Email <a href="mailto:support@marketbridge.com.ng?subject=Tech%20Support" className="text-[#FF6200] hover:underline">support@marketbridge.com.ng</a><br />
                        Refunds, subscriptions or seller questions? Email <a href="mailto:ops-support@marketbridge.com.ng?subject=Ops%20Support" className="text-[#FF6200] hover:underline">ops-support@marketbridge.com.ng</a>
                    </p>
                </div>
            </div>
            {/* Ambassador Application Modal */}
            {isAmbassadorModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsAmbassadorModalOpen(false)}
                            className="absolute top-6 right-6 h-10 w-10 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="text-center mb-8">
                            <div className="h-16 w-16 rounded-2xl bg-[#FF6200]/10 border border-[#FF6200]/20 flex items-center justify-center mx-auto mb-4">
                                <Crown className="h-8 w-8 text-[#FF6200]" />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter italic font-heading">Campus Ambassador</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mt-2">
                                Represent MarketBridge and grow the community on your campus.
                            </p>
                        </div>

                        <form onSubmit={handleApplyAmbassador} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-heading">Your University</Label>
                                <Select value={ambassadorCampus} onValueChange={setAmbassadorCampus} required>
                                    <SelectTrigger className="h-14 bg-[#FAFAFA]/40 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl font-heading text-[10px] font-black uppercase tracking-widest text-left">
                                        <SelectValue placeholder="SELECT YOUR CAMPUS" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-heading text-[10px] font-black uppercase tracking-widest">
                                        <SelectItem value="Baze University" className="focus:bg-[#FF6200] focus:text-black py-3">Baze University</SelectItem>
                                        <SelectItem value="Nile University of Nigeria" className="focus:bg-[#FF6200] focus:text-black py-3">Nile University of Nigeria</SelectItem>
                                        <SelectItem value="Veritas University" className="focus:bg-[#FF6200] focus:text-black py-3">Veritas University</SelectItem>
                                        <SelectItem value="Cosmopolitan University" className="focus:bg-[#FF6200] focus:text-black py-3">Cosmopolitan University</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-heading">Why should we pick you?</Label>
                                <Textarea 
                                    value={ambassadorMotivation}
                                    onChange={(e) => setAmbassadorMotivation(e.target.value)}
                                    placeholder="Tell us about your campus influence and why you want to be an ambassador..."
                                    className="min-h-[120px] bg-[#FAFAFA]/40 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200] transition-colors p-4 text-sm font-medium"
                                    required
                                />
                            </div>

                            <div className="p-4 bg-[#FF6200]/5 rounded-2xl border border-[#FF6200]/10 space-y-2">
                                <p className="text-[10px] font-black uppercase text-[#FF6200] tracking-widest">Ambassador Rewards</p>
                                <ul className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium space-y-1 italic">
                                    <li className="flex items-center gap-2"><Sparkles className="h-3 w-3" /> Exclusive Ambassador Profile Badge</li>
                                    <li className="flex items-center gap-2"><Zap className="h-3 w-3" /> 44 Days of MarketBridge PRO status</li>
                                    <li className="flex items-center gap-2"><Star className="h-3 w-3" /> 500 MarketCoins instant bonus</li>
                                </ul>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isSubmittingAmbassador}
                                className="w-full h-16 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                {isSubmittingAmbassador ? <Loader2 className="animate-spin h-5 w-5" /> : "Submit Application"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrderCard({
    order,
    onUpdateStatus,
    onOpenChat,
    isUpdating
}: {
    order: Order;
    onUpdateStatus: (id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') => void;
    onOpenChat: (order: Order) => void;
    isUpdating: boolean;
}) {
    const getStatusBadge = (status: string) => {
        const colors = {
            pending: 'bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20',
            confirmed: 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 border-zinc-700 dark:border-white/10',
            completed: 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10',
            cancelled: 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-700 dark:border-white/10',
        } as const;

        return (
            <Badge className={cn("px-3 py-1 font-black uppercase text-[9px] tracking-widest border font-heading italic", colors[status as keyof typeof colors] || colors.pending)}>
                {status === 'pending' && <Clock className="h-3 w-3 mr-1.5" />}
                {status === 'confirmed' && <Truck className="h-3 w-3 mr-1.5" />}
                {status === 'completed' && <CheckCircle className="h-3 w-3 mr-1.5" />}
                {status}
            </Badge>
        );
    };

    return (
        <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none p-6 flex flex-col md:flex-row gap-8 group/card transition-all duration-500 hover:border-[#FF6200]/20">
            <div className="flex-1 flex gap-6 italic">
                {order.listing?.images?.[0] ? (
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900 group-hover/card:border-[#FF6200]/20 transition-all">
                        <Image src={order.listing.images[0]} alt={order.listing.title} fill className="object-cover group-hover/card:scale-110 transition-transform duration-700" />
                    </div>
                ) : (
                    <div className="h-24 w-24 shrink-0 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex items-center justify-center">
                        <Package className="h-8 w-8 text-zinc-900/20 dark:text-white/10" />
                    </div>
                )}

                <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-zinc-900/30 uppercase tracking-widest font-heading">Ref: #{order.id.slice(-8).toUpperCase()}</span>
                        {getStatusBadge(order.status)}
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter truncate font-heading text-zinc-900 dark:text-white">{order.listing?.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5 lowercase font-medium italic"><span className="text-zinc-900/20 dark:text-white/20 underline">buyer:</span> <span className="text-zinc-900/70 dark:text-zinc-300 font-bold">{order.buyer?.display_name}</span></span>
                        <span className="flex items-center gap-1.5 lowercase font-medium italic"><span className="text-zinc-900/20 dark:text-white/20 underline">value:</span> <span className="text-[#FF6200] font-black">₦{order.amount.toLocaleString()}</span></span>
                        <span className="flex items-center gap-1.5 lowercase font-medium italic"><span className="text-zinc-900/20 dark:text-white/20 underline">date:</span> <span className="dark:text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</span></span>
                    </div>
                </div>
            </div>

            <div className="flex md:flex-col justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => onOpenChat(order)} className="flex-1 md:w-40 h-12 rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:border-[#FF6200]/30 hover:bg-white dark:hover:bg-white/10 text-zinc-900 dark:text-white font-black uppercase tracking-widest text-[10px] gap-2 font-heading transition-all">
                    <MessageCircle className="h-4 w-4" /> Message Buyer
                </Button>

                {order.status === 'pending' && (
                    <Select onValueChange={(value: string) => onUpdateStatus(order.id, value as 'pending' | 'confirmed' | 'completed' | 'cancelled')} disabled={isUpdating}>
                        <SelectTrigger className="flex-1 md:w-40 h-12 rounded-xl bg-[#FF6200] border-none text-black font-black uppercase tracking-widest text-[10px] font-heading shadow-lg shadow-[#FF6200]/10 hover:bg-[#FF7A29] transition-all">
                            <SelectValue placeholder="Dispatch" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-heading text-[10px] uppercase font-black tracking-widest">
                            <SelectItem value="confirmed" className="focus:bg-[#FF6200] focus:text-black">Mark Shipped</SelectItem>
                            <SelectItem value="cancelled" className="focus:bg-zinc-100 dark:focus:bg-zinc-800 focus:text-zinc-900 dark:focus:text-white text-[#FF6200]">Cancel Order</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {order.status === 'confirmed' && (
                    <Button 
                        onClick={() => onUpdateStatus(order.id, 'completed')}
                        disabled={isUpdating}
                        className="flex-1 md:w-40 h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-[10px] font-heading hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
                    >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Delivered"}
                    </Button>
                )}
            </div>
        </div>
    );
}

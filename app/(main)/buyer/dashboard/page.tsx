'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
    LayoutDashboard,
    MessageCircle,
    ShoppingBag,
    ShieldCheck,
    Clock,
    ArrowRight,
    MapPin,
    AlertCircle,
    Heart,
    Search,
    Wallet,
    Package,
    TrendingUp,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/dashboard-header';
import { FeaturedListings } from '@/components/FeaturedListings';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const supabase = createClient();

const buyerItems = [
    { label: 'Overview', href: '/buyer/dashboard', icon: LayoutDashboard },
    { label: 'My Orders & Escrow', href: '/orders', icon: Package },
    { label: 'Wishlist', href: '/wishlist', icon: Heart },
    { label: 'Messages', href: '/chats', icon: MessageCircle },
    { label: 'Wallet', href: '/wallet', icon: Wallet },
    { label: 'Disputes', href: '/disputes', icon: AlertCircle },
];

interface BuyerStats {
    activeOrdersCount: number;
    wishlistCount: number;
    unreadMessagesCount: number;
    walletBalance: number;
}

interface OrderSummary {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    listing?: {
        id: string;
        title: string;
        images: string[];
        price: number;
    };
    seller?: {
        display_name: string;
        photo_url?: string;
    };
}

export default function BuyerDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState<BuyerStats>({
        activeOrdersCount: 0,
        wishlistCount: 0,
        unreadMessagesCount: 0,
        walletBalance: 0,
    });
    const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchBuyerData = useCallback(async () => {
        if (!user?.id) return;
        setLoadingData(true);

        try {
            // 1. Fetch active orders
            const { data: ordersData } = await supabase
                .from('orders')
                .select(`
                    id, amount, status, created_at,
                    listing:listings(id, title, images, price),
                    seller:users!orders_seller_id_fkey(display_name, photo_url)
                `)
                .eq('buyer_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            const activeOrders = (ordersData || []).filter(
                (o: any) => o.status === 'pending' || o.status === 'paid' || o.status === 'confirmed'
            );

            setRecentOrders((ordersData as OrderSummary[]) || []);

            // 2. Fetch wallet balance
            const { data: walletData } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .single();

            // 3. Unread message count
            let unreadCount = 0;
            try {
                const { data: unreadData } = await supabase.rpc('get_unread_counts', { p_user_id: user.id });
                if (unreadData) {
                    unreadCount = unreadData.reduce((sum: number, row: any) => sum + (row.unread_count || 0), 0);
                }
            } catch {
                // non-critical
            }

            // 4. Wishlist count
            const wishlistItemsCount = user.wishlist ? user.wishlist.length : 0;

            setStats({
                activeOrdersCount: activeOrders.length,
                wishlistCount: wishlistItemsCount,
                unreadMessagesCount: unreadCount,
                walletBalance: walletData?.balance || 0,
            });
        } catch (err) {
            console.error('Failed to fetch buyer dashboard data:', err);
        } finally {
            setLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/buyer/dashboard');
            return;
        }

        if (user?.id) {
            fetchBuyerData();
        }
    }, [user, authLoading, router, fetchBuyerData]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/marketplace?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">Completed</Badge>;
            case 'paid':
                return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">In Escrow</Badge>;
            case 'confirmed':
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Shipped</Badge>;
            case 'disputed':
                return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">Disputed</Badge>;
            case 'cancelled':
                return <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-xs">Cancelled</Badge>;
            default:
                return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 text-xs capitalize">{status}</Badge>;
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <div className="flex-1 flex flex-col max-w-[100vw] overflow-x-hidden">
                <DashboardHeader title="Buyer Dashboard" sidebarItems={buyerItems} />

                <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                    {/* Welcome Hero Banner */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 p-6 sm:p-8 md:p-10 shadow-lg">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6200]/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6200]/20 border border-[#FF6200]/30 text-xs font-semibold text-[#FF6200]">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Escrow-Protected Marketplace
                                </div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                                    Welcome back, <span className="text-[#FF6200]">{user?.display_name || 'Buyer'}</span>!
                                </h1>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Manage your orders, track escrow payments, save favorites, and connect with verified sellers across Nigeria.
                                </p>
                            </div>

                            {/* Search and Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <Link href="/marketplace">
                                    <Button className="w-full sm:w-auto h-11 px-6 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl shadow-md">
                                        Explore Marketplace
                                    </Button>
                                </Link>
                                <Link href="/orders">
                                    <Button variant="outline" className="w-full sm:w-auto h-11 px-6 border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm rounded-xl">
                                        View Orders
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Search Bar inside Hero */}
                        <form onSubmit={handleSearch} className="relative mt-6 max-w-2xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search products, textbooks, electronics, gadgets, or services..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-11 pr-24 bg-slate-800/80 border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-400 focus-visible:ring-[#FF6200] focus-visible:border-[#FF6200]"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-lg"
                            >
                                Search
                            </Button>
                        </form>
                    </div>

                    {/* Stats KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {/* Active Orders */}
                        <Link href="/orders" className="group">
                            <div className="bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-2">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Active Orders</span>
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                        <Package className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-foreground">
                                    {loadingData ? <Skeleton className="h-8 w-12" /> : stats.activeOrdersCount}
                                </div>
                                <p className="text-[11px] text-muted-foreground">Secured with Escrow</p>
                            </div>
                        </Link>

                        {/* Wallet Balance */}
                        <Link href="/wallet" className="group">
                            <div className="bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-2">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Wallet Balance</span>
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                        <Wallet className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-[#FF6200]">
                                    {loadingData ? <Skeleton className="h-8 w-20" /> : `₦${stats.walletBalance.toLocaleString()}`}
                                </div>
                                <p className="text-[11px] text-muted-foreground">Available for purchases</p>
                            </div>
                        </Link>

                        {/* Saved Wishlist */}
                        <Link href="/wishlist" className="group">
                            <div className="bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-2">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Wishlist</span>
                                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                        <Heart className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-foreground">
                                    {loadingData ? <Skeleton className="h-8 w-12" /> : stats.wishlistCount}
                                </div>
                                <p className="text-[11px] text-muted-foreground">Saved products</p>
                            </div>
                        </Link>

                        {/* Unread Chats */}
                        <Link href="/chats" className="group">
                            <div className="bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-2">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Messages</span>
                                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                        <MessageCircle className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-foreground">
                                    {loadingData ? <Skeleton className="h-8 w-12" /> : stats.unreadMessagesCount}
                                </div>
                                <p className="text-[11px] text-muted-foreground">Conversations with sellers</p>
                            </div>
                        </Link>
                    </div>

                    {/* Featured Listings Section */}
                    <FeaturedListings />

                    {/* Recent Orders / Escrow Activity Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Orders Column */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
                                <Link href="/orders" className="text-xs font-semibold text-[#FF6200] hover:underline flex items-center gap-1">
                                    View All Orders <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>

                            {loadingData ? (
                                <div className="space-y-3">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-6 w-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : recentOrders.length === 0 ? (
                                <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center space-y-3">
                                    <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                                    <h3 className="text-sm font-semibold text-foreground">No Orders Yet</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        When you purchase an item on MarketBridge, payment is held safely in escrow until you confirm delivery.
                                    </p>
                                    <Link href="/marketplace">
                                        <Button size="sm" className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl mt-2">
                                            Start Shopping
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentOrders.map((order) => (
                                        <Link
                                            key={order.id}
                                            href={`/orders/${order.id}`}
                                            className="block bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl p-4 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="relative h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                                                        {order.listing?.images?.[0] ? (
                                                            <Image
                                                                src={order.listing.images[0]}
                                                                alt={order.listing.title || 'Order item'}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                                <Package className="h-6 w-6 opacity-30" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-sm text-foreground truncate">
                                                            {order.listing?.title || `Order #${order.id.slice(0, 8)}`}
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            Seller: {order.seller?.display_name || 'Verified Merchant'}
                                                        </p>
                                                        <span className="text-xs font-bold text-[#FF6200]">
                                                            ₦{order.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                    {getStatusBadge(order.status)}
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Shortcuts & Trust Sidebar */}
                        <div className="space-y-6">
                            {/* Quick Shortcuts */}
                            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Quick Shortcuts
                                </h3>

                                <div className="space-y-2">
                                    <Link
                                        href="/marketplace"
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-medium transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <ShoppingBag className="h-4 w-4 text-[#FF6200]" />
                                            <span>Explore Marketplace</span>
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    </Link>

                                    <Link
                                        href="/wallet"
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-medium transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Wallet className="h-4 w-4 text-emerald-500" />
                                            <span>Deposit & Wallet</span>
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    </Link>

                                    <Link
                                        href="/chats"
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-medium transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MessageCircle className="h-4 w-4 text-blue-500" />
                                            <span>Seller Conversations</span>
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    </Link>

                                    <Link
                                        href="/wishlist"
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-medium transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Heart className="h-4 w-4 text-rose-500" />
                                            <span>Saved Wishlist</span>
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    </Link>
                                </div>
                            </div>

                            {/* Escrow Guarantee Card */}
                            <div className="bg-[#FF6200]/5 border border-[#FF6200]/20 rounded-2xl p-5 space-y-2.5">
                                <div className="flex items-center gap-2 text-[#FF6200]">
                                    <ShieldCheck className="h-5 w-5" />
                                    <span className="text-xs font-bold uppercase tracking-wider">How Escrow Protects You</span>
                                </div>
                                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
                                    <li>Pay safely via card, bank transfer, or wallet.</li>
                                    <li>Funds are held in secure escrow.</li>
                                    <li>Inspect the item before confirming receipt.</li>
                                    <li>If any issue arises, raise a dispute for full resolution.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

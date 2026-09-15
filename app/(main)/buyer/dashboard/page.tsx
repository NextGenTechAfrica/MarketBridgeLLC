'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
    ShoppingBag,
    ShieldCheck,
    ArrowRight,
    Star,
    Laptop,
    Shirt,
    BookOpen,
    Glasses,
    Home as HomeIcon,
    FileText,
    Wrench,
    Grid,
    CheckCircle2,
    Clock,
    Package,
    Sparkles,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const supabase = createClient();

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

const categories = [
    { label: 'Electronics', icon: Laptop, color: 'bg-blue-50 text-blue-600', href: '/marketplace?category=Electronics' },
    { label: 'Fashion', icon: Shirt, color: 'bg-pink-50 text-pink-600', href: '/marketplace?category=Fashion' },
    { label: 'Books', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600', href: '/marketplace?category=Books' },
    { label: 'Accessories', icon: Glasses, color: 'bg-orange-50 text-[#FF5500]', href: '/marketplace?category=Accessories' },
    { label: 'Home & Living', icon: HomeIcon, color: 'bg-indigo-50 text-indigo-600', href: '/marketplace?category=Home' },
    { label: 'Study Materials', icon: FileText, color: 'bg-teal-50 text-teal-600', href: '/marketplace?category=Study' },
    { label: 'Services', icon: Wrench, color: 'bg-amber-50 text-amber-600', href: '/marketplace?category=Services' },
    { label: 'More', icon: Grid, color: 'bg-slate-100 text-slate-600', href: '/marketplace' },
];

const hotDeals = [
    {
        id: '1',
        title: 'HP Laptop 15',
        price: 380000,
        originalPrice: 450000,
        rating: 4.8,
        reviews: 12,
        seller: 'Chioma',
        isVerified: true,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: '2',
        title: 'Nike Air Force 1',
        price: 55000,
        originalPrice: 70000,
        rating: 4.7,
        reviews: 36,
        seller: 'Tobi',
        isVerified: true,
        image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: '3',
        title: 'Calculus Textbook',
        price: 12000,
        originalPrice: null,
        rating: 4.9,
        reviews: 15,
        seller: 'David',
        isVerified: true,
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: '4',
        title: 'Bluetooth Headphones',
        price: 25000,
        originalPrice: 30000,
        rating: 4.6,
        reviews: 18,
        seller: 'Blessing',
        isVerified: true,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60'
    },
];

const recommendedItems = [
    {
        id: '5',
        title: 'Portable Charger',
        price: 10000,
        rating: 4.5,
        reviews: 12,
        seller: 'Emmanuel',
        image: 'https://images.unsplash.com/photo-1609592424364-754f923b723a?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: '6',
        title: 'Gaming Mouse',
        price: 15000,
        rating: 4.7,
        reviews: 14,
        seller: 'Samuel',
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: '7',
        title: 'Backpack',
        price: 28000,
        rating: 4.8,
        reviews: 22,
        seller: 'Grace',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: '8',
        title: 'Wireless Earbuds',
        price: 22000,
        rating: 4.6,
        reviews: 18,
        seller: 'Kelvin',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60'
    },
];

export default function BuyerDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
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
            // 1. Fetch orders from Supabase
            const { data: ordersData } = await supabase
                .from('orders')
                .select(`
                    id, amount, status, created_at,
                    listing:listings(id, title, images, price),
                    seller:users!orders_seller_id_fkey(display_name, photo_url)
                `)
                .eq('buyer_id', user.id)
                .order('created_at', { ascending: false })
                .limit(4);

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

            setStats({
                activeOrdersCount: activeOrders.length,
                wishlistCount: user.wishlist?.length || 0,
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

    return (
        <div className="space-y-8 pb-12">
            {/* ─── 1. TOP HERO BANNER (1:1 with Image 2 Left) ─── */}
            <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0F19] text-white p-7 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5">
                <div className="space-y-4 max-w-lg z-10">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                        Everything You Need <br />
                        <span className="text-[#FF5500]">All in One Place</span>
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                        Buy from verified student sellers. Get great deals, safe transactions and fast support.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#FF5500]/30 active:scale-95"
                        >
                            Explore Now <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                {/* Tech Workspace Cutout Illustration */}
                <div className="relative z-10 w-full sm:w-[320px] h-[180px] sm:h-[200px] flex items-center justify-center">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <Image
                            src="https://images.unsplash.com/photo-1522199755839-a2bacb67c546?w=600&auto=format&fit=crop&q=80"
                            alt="Student workspace with laptop, books, phone and headphones"
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/80 via-transparent to-transparent" />
                    </div>
                </div>

                {/* Subtle Orange Backdrop Glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF5500]/15 rounded-full blur-[90px] pointer-events-none" />
            </div>

            {/* ─── 2. CATEGORY ICONS ROW (Image 2 Left) ─── */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
                {categories.map((cat, i) => (
                    <Link
                        key={i}
                        href={cat.href}
                        className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 text-center transition-all hover:shadow-sm hover:-translate-y-0.5 group"
                    >
                        <div className={`w-11 h-11 rounded-xl ${cat.color} flex items-center justify-center transition-transform group-hover:scale-105`}>
                            <cat.icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 truncate w-full">
                            {cat.label}
                        </span>
                    </Link>
                ))}
            </div>

            {/* ─── 3. HOT DEALS SECTION (Image 2 Left) ─── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        Hot Deals
                    </h2>
                    <Link href="/marketplace" className="text-xs font-bold text-slate-500 hover:text-[#FF5500] flex items-center gap-1 transition-colors">
                        View All <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {hotDeals.map((item) => (
                        <Link
                            key={item.id}
                            href={`/marketplace`}
                            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                        >
                            <div className="relative w-full h-44 bg-slate-100 overflow-hidden">
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#FF5500] transition-colors truncate">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-base font-black text-slate-900">
                                            ₦{item.price.toLocaleString()}
                                        </span>
                                        {item.originalPrice && (
                                            <span className="text-xs text-slate-400 line-through">
                                                ₦{item.originalPrice.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                        <span>{item.rating}</span>
                                        <span className="text-slate-400 font-normal">({item.reviews})</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="truncate">by {item.seller}</span>
                                        {item.isVerified && (
                                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                                                <CheckCircle2 className="h-3 w-3" /> Verified Seller
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ─── 4. RECOMMENDED FOR YOU & SAFE & SECURE (Image 2 Left) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left 3 cols: Recommended Grid */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            Recommended For You
                        </h2>
                        <Link href="/marketplace" className="text-xs font-bold text-slate-500 hover:text-[#FF5500] flex items-center gap-1 transition-colors">
                            View All <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {recommendedItems.map((item) => (
                            <Link
                                key={item.id}
                                href={`/marketplace`}
                                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                            >
                                <div className="relative w-full h-32 bg-slate-100 overflow-hidden">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 truncate">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm font-black text-slate-900 mt-0.5">
                                            ₦{item.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                        <span className="flex items-center gap-0.5 font-bold text-amber-500">
                                            ★ {item.rating}
                                        </span>
                                        <span className="truncate">by {item.seller}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right 1 col: Safe & Secure Card (Image 2 Left) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between shadow-sm space-y-4">
                    <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                            Safe & Secure
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Payments are protected, sellers are verified, and your data is safe.
                        </p>
                    </div>
                    <Link
                        href="/faq"
                        className="inline-flex items-center justify-center w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
                    >
                        Learn More
                    </Link>
                </div>
            </div>

            {/* ─── 5. RECENT ORDERS & POST A REQUEST (Image 2 Left) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900">
                            Your Recent Orders
                        </h2>
                        <Link href="/orders" className="text-xs font-bold text-slate-500 hover:text-[#FF5500] flex items-center gap-1 transition-colors">
                            See All <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {recentOrders.length > 0 ? (
                            recentOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-4"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 relative overflow-hidden shrink-0">
                                            {order.listing?.images?.[0] ? (
                                                <Image
                                                    src={order.listing.images[0]}
                                                    alt={order.listing.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-400 m-3" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                {order.listing?.title || `Order #${order.id.slice(0, 8)}`}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                ₦{order.amount?.toLocaleString()} • <span className="capitalize font-semibold text-[#FF5500]">{order.status}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs text-slate-400 hidden sm:inline">
                                            {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <Link
                                            href={`/orders`}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Default reference preview orders when user hasn't ordered yet
                            [
                                { title: 'HP Laptop 15', price: '₦380,000', status: 'Delivered', date: '12 Sep 2025' },
                                { title: 'Nike Air Force 1', price: '₦55,000', status: 'In Transit', date: '10 Sep 2025' },
                                { title: 'Calculus Textbook', price: '₦12,000', status: 'Delivered', date: '5 Sep 2025' },
                            ].map((o, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{o.title}</p>
                                            <p className="text-[11px] sm:text-xs text-slate-500">
                                                {o.price} • <span className="font-semibold text-emerald-600">{o.status}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[11px] text-slate-400 hidden sm:inline">{o.date}</span>
                                        <Link href="/orders" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Need something specific? Post a Request (Image 2 Left) */}
                <div className="bg-[#0B0F19] text-white rounded-2xl p-6 flex flex-col justify-between shadow-sm space-y-6 border border-white/5 relative overflow-hidden">
                    <div className="space-y-3 z-10">
                        <div className="w-10 h-10 rounded-xl bg-[#FF5500]/15 text-[#FF5500] flex items-center justify-center">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-bold text-white">
                            Need something specific?
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Post a request and let verified campus sellers find it for you.
                        </p>
                    </div>
                    <div className="z-10">
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center justify-center w-full py-3 bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#FF5500]/30 active:scale-95"
                        >
                            Post a Request
                        </Link>
                    </div>

                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5500]/10 rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>
        </div>
    );
}

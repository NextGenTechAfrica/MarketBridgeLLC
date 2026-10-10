'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';
import {
    ArrowRight, ShieldCheck, MapPin, GraduationCap, Clock,
    Store, Sparkles, Check, Smartphone, Zap, Lock, Search,
    ChevronRight, Star, CheckCircle2, TrendingUp, Layers, Heart
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES } from '@/lib/categories';
import { createClient } from '@/lib/supabase/client';
import { ListingCard } from '@/components/listings/ListingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const supabase = createClient();

const CAMPUSES = [
    { id: 'all', name: 'All Campuses', short: 'All' },
    { id: 'baze', name: 'Baze University', short: 'Baze' },
    { id: 'nile', name: 'Nile University of Nigeria', short: 'Nile' },
    { id: 'veritas', name: 'Veritas University', short: 'Veritas' },
    { id: 'uniabuja', name: 'University of Abuja', short: 'UniAbuja' },
];

const POPULAR_SEARCHES = [
    'MacBook Air', 'Calculus textbook', 'Nike Air Force', 'Hostel Mini Fridge', 'Jollof & Chicken', 'iPhone 13', 'Power Bank'
];

export default function HomePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCampus, setSelectedCampus] = useState('all');
    const [trendingListings, setTrendingListings] = useState<any[]>([]);
    const [loadingTrending, setLoadingTrending] = useState(true);

    useEffect(() => {
        fetchTrendingListings();
    }, [selectedCampus]);

    const fetchTrendingListings = async () => {
        setLoadingTrending(true);
        try {
            let query = supabase
                .from('listings')
                .select(`
                    id, title, description, price, category, images, status, location,
                    created_at, condition, campus, is_verified_listing, verification_status,
                    seller:users!listings_dealer_id_fkey(
                        id, display_name, is_verified, store_type, university, photo_url
                    )
                `)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(8);

            if (selectedCampus !== 'all') {
                const campusObj = CAMPUSES.find(c => c.id === selectedCampus);
                if (campusObj) {
                    query = query.ilike('location', `%${campusObj.short}%`);
                }
            }

            const { data, error } = await query;
            if (error) {
                console.warn('Trending listings query error, using fallback:', error);
                // Fallback without relations
                const { data: fallbackData } = await supabase
                    .from('listings')
                    .select('*')
                    .eq('status', 'active')
                    .limit(8);
                setTrendingListings(fallbackData || []);
            } else {
                setTrendingListings(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch trending listings:', err);
        } finally {
            setLoadingTrending(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            router.push('/marketplace');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-[#FF6200] selection:text-white transition-colors">
            <Header />

            <main className="flex-1 w-full flex flex-col items-center">

                {/* ─── 1. HERO SECTION WITH PROMINENT CAMPUS SEARCH (Tokosm Inspiration) ─── */}
                <section className="w-full bg-gradient-to-b from-orange-500/5 via-transparent to-background border-b border-border/50 py-12 md:py-20 px-4 sm:px-6">
                    <div className="max-w-5xl mx-auto text-center space-y-6">

                        {/* Top Trust Pill */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6200]/10 border border-[#FF6200]/20 text-[#FF6200] text-xs font-black uppercase tracking-wider">
                            <ShieldCheck className="h-4 w-4" />
                            <span>#1 Campus Marketplace in Abuja</span>
                        </div>

                        {/* Headline */}
                        <div className="space-y-3">
                            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground font-heading leading-[1.08]">
                                Abuja&apos;s campus marketplace,{' '}
                                <span className="text-[#FF6200]">built for students.</span>
                            </h1>
                            <p className="text-base sm:text-lg text-muted-foreground font-normal max-w-2xl mx-auto leading-relaxed">
                                Buy and sell securely with verified student classmates at Baze, Nile, Veritas and UniAbuja.
                                Hostels delivery in minutes with Zero-Fraud Escrow Protection.
                            </p>
                        </div>

                        {/* Omni Search Bar Card */}
                        <div className="max-w-3xl mx-auto pt-2">
                            <form onSubmit={handleSearch} className="bg-card border-2 border-border focus-within:border-[#FF6200] rounded-3xl p-2 shadow-2xl transition-all">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <div className="flex items-center gap-3 px-3 py-2 flex-1">
                                        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="What are you looking for? (e.g. MacBook, Calculus textbook, Air Force...)"
                                            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="h-12 px-8 bg-[#FF6200] hover:bg-[#E55800] text-white font-black text-sm rounded-2xl shadow-md shadow-[#FF6200]/25 transition-all shrink-0 active:scale-95"
                                    >
                                        Search Market
                                    </Button>
                                </div>
                            </form>

                            {/* Popular Searches Pills */}
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs">
                                <span className="text-muted-foreground font-semibold">Popular:</span>
                                {POPULAR_SEARCHES.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => router.push(`/marketplace?q=${encodeURIComponent(item)}`)}
                                        className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-orange-500/10 hover:text-[#FF6200] text-muted-foreground transition-colors font-medium cursor-pointer"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Campus Filter Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                            {CAMPUSES.map((campus) => (
                                <button
                                    key={campus.id}
                                    type="button"
                                    onClick={() => setSelectedCampus(campus.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        selectedCampus === campus.id
                                            ? 'bg-[#FF6200] text-white shadow-md shadow-[#FF6200]/25 scale-105'
                                            : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-[#FF6200]/40'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {campus.name}
                                    </span>
                                </button>
                            ))}
                        </div>

                    </div>
                </section>

                {/* ─── 2. CATEGORIES GRID (Tokosm Categories Reference) ─── */}
                <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-foreground font-heading">
                                Explore Categories
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Find student essentials across top campus categories</p>
                        </div>
                        <Link href="/marketplace" className="text-xs font-bold text-[#FF6200] hover:underline flex items-center gap-1">
                            <span>All Categories</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
                        {CATEGORIES.map((cat) => (
                            <Link
                                key={cat.id}
                                href={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                                className="group p-3.5 rounded-2xl bg-card border border-border hover:border-[#FF6200]/50 hover:shadow-lg transition-all flex flex-col items-center text-center space-y-2 hover:-translate-y-1"
                            >
                                <div className={`w-12 h-12 rounded-2xl ${cat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                    <cat.icon className={`h-6 w-6 ${cat.color}`} />
                                </div>
                                <span className="text-xs font-bold text-foreground group-hover:text-[#FF6200] transition-colors truncate w-full">
                                    {cat.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ─── 3. TRENDING ON CAMPUS LISTINGS (Live Data from Supabase) ─── */}
                <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                                <h2 className="text-2xl sm:text-3xl font-black text-foreground font-heading">
                                    Trending Deals on Campus
                                </h2>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Verified listings actively traded at {CAMPUSES.find(c => c.id === selectedCampus)?.name || 'Abuja Universities'}
                            </p>
                        </div>

                        <Link
                            href="/marketplace"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border hover:border-[#FF6200] text-xs font-bold text-foreground transition-all shadow-sm"
                        >
                            <span>Browse All</span>
                            <ChevronRight className="h-3.5 w-3.5 text-[#FF6200]" />
                        </Link>
                    </div>

                    {loadingTrending ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                                    <Skeleton className="h-44 w-full rounded-xl" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-5 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : trendingListings.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {trendingListings.map((listing) => (
                                <ListingCard key={listing.id} listing={listing} variant="grid" />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-3 max-w-lg mx-auto">
                            <Store className="h-12 w-12 text-[#FF6200] mx-auto opacity-40" />
                            <h3 className="text-lg font-bold text-foreground">No Active Listings Found</h3>
                            <p className="text-xs text-muted-foreground">Be the first student to list an item at this campus.</p>
                            <Button asChild className="bg-[#FF6200] hover:bg-[#E55800] text-white font-bold rounded-xl text-xs">
                                <Link href="/seller-onboarding">List an Item</Link>
                            </Button>
                        </div>
                    )}
                </section>

                {/* ─── 4. HOW IT WORKS ON CAMPUS (Zero-Fraud Escrow Walkthrough) ─── */}
                <section id="how-it-works" className="w-full bg-zinc-50 dark:bg-[#080D1A] py-16 md:py-24 border-y border-border">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
                            <span className="text-xs font-black uppercase tracking-wider text-[#FF6200] bg-[#FF6200]/10 px-3 py-1 rounded-full">
                                Buyer & Seller Protection
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-heading">
                                How Campus Escrow Works
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Never get scammed on campus again. Every naira is held safely in escrow until you verify your item in person.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Step 1 */}
                            <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-lg font-heading">
                                    01
                                </div>
                                <h3 className="text-base font-bold text-foreground">Find & Stage Order</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Browse textbooks, laptops, wigs, and food from verified classmates at your university.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-lg font-heading">
                                    02
                                </div>
                                <h3 className="text-base font-bold text-foreground">Pay Secure Escrow</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Transfer to MarketBridge Escrow. The seller is notified to prepare your delivery, but funds remain locked.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-lg font-heading">
                                    03
                                </div>
                                <h3 className="text-base font-bold text-foreground">Campus Delivery</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Sellers deliver directly to your hostel or campus faculty within 15–30 minutes. Inspect your item.
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-lg font-heading">
                                    04
                                </div>
                                <h3 className="text-base font-bold text-foreground">Release on Delivery</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Once satisfied, confirm in your dashboard and funds are instantly released to the student seller.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── 5. TURN YOUR HUSTLE INTO A STOREFRONT (Seller Callout) ─── */}
                <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16">
                    <div className="bg-gradient-to-r from-slate-900 to-[#0A1628] rounded-[2.5rem] p-8 sm:p-12 text-white border border-white/10 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="space-y-4 max-w-xl z-10 text-left">
                            <span className="inline-block px-3 py-1 rounded-full bg-[#FF6200]/20 border border-[#FF6200]/40 text-[#FF6200] text-xs font-bold uppercase tracking-wider">
                                Sell on MarketBridge
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-heading">
                                Turn Your Campus Hustle into a Storefront
                            </h2>
                            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                                Already selling tech, baking treats, or styling hair in your hostel?
                                Join hundreds of verified student sellers across Baze, Nile, Veritas & UniAbuja.
                                0% listing fee and immediate campus orders.
                            </p>
                            <div className="pt-2 flex flex-wrap gap-3">
                                <Link
                                    href="/seller-onboarding"
                                    className="px-7 py-3.5 bg-[#FF6200] hover:bg-[#E55800] text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-[#FF6200]/30 active:scale-95"
                                >
                                    Open Your Storefront
                                </Link>
                                <Link
                                    href="/pricing"
                                    className="px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl border border-white/15 transition-all"
                                >
                                    View Pricing & Plans
                                </Link>
                            </div>
                        </div>

                        {/* Interactive Metric Cards */}
                        <div className="relative z-10 w-full max-w-sm flex flex-col gap-3">
                            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl shadow-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                        ₦
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">Student Seller Earnings</p>
                                        <p className="text-[11px] text-slate-300">Same-Day Payouts</p>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-emerald-400">100% Guaranteed</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl shadow-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#FF6200]/20 text-[#FF6200] flex items-center justify-center font-bold">
                                        <GraduationCap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">Verified Student Badge</p>
                                        <p className="text-[11px] text-slate-300">Institutional ID Checked</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-[#FF6200]">Verified</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── 6. MOBILE PWA & QR CODE SECTION ─── */}
                <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center border-t border-border">
                    <div className="max-w-xl mx-auto space-y-4 flex flex-col items-center">
                        <span className="px-3.5 py-1 bg-orange-500/10 text-[#FF6200] border border-[#FF6200]/30 rounded-full text-xs font-bold uppercase tracking-wider">
                            Mobile Optimized
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-heading">
                            MarketBridge in your pocket
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Works seamlessly right in your mobile browser on iOS and Android with fast loading and push notifications.
                        </p>
                        <div className="pt-2">
                            <div className="inline-flex flex-col items-center bg-card border border-border p-5 rounded-3xl shadow-sm">
                                <div className="bg-white p-3 rounded-2xl mb-2.5 shadow-inner">
                                    <QRCode value="https://www.marketbridge.com.ng/marketplace" size={100} />
                                </div>
                                <p className="text-xs font-bold text-foreground">Scan to open on campus</p>
                                <p className="text-[10px] text-[#FF6200] font-semibold mt-0.5">marketbridge.com.ng</p>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
}

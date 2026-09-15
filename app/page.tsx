'use client';

import React from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { 
    ArrowRight, 
    ShieldCheck, 
    MapPin, 
    GraduationCap, 
    Clock, 
    Store,
    Sparkles,
    Check,
    Smartphone,
    Zap,
    Lock
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
    const { user } = useAuth();

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white selection:bg-[#FF6200] selection:text-white transition-colors duration-200">
            <Header />

            <main className="flex-1 w-full flex flex-col items-center">

                {/* ─── 1. HERO SECTION (1:1 with Master Board Screen 1) ─── */}
                <section className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10 md:pt-16 pb-16 md:pb-24 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
                    
                    {/* Left Column: Copy & Actions */}
                    <div className="flex-1 flex flex-col space-y-6 max-w-xl z-10 text-left">
                        <div className="space-y-3">
                            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black leading-[1.08] tracking-tight text-slate-900 dark:text-white">
                                Abuja&apos;s campus marketplace,{' '}
                                <span className="text-[#FF6200]">built for students.</span>
                            </h1>
                            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-200 font-normal leading-relaxed pt-1">
                                Buy and sell with verified students at Baze, Nile, and Veritas. Order food, find textbooks, and book campus services — every transaction protected by escrow, every seller ID-checked.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="pt-2 flex flex-wrap items-center gap-3.5">
                            {!user ? (
                                <>
                                    <Link
                                        href="/signup"
                                        className="inline-flex items-center justify-center px-7 py-3.5 bg-[#FF6200] hover:bg-[#E55800] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#FF6200]/25 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF6200]/30"
                                    >
                                        Get Started
                                    </Link>
                                    <Link
                                        href="/marketplace"
                                        className="inline-flex items-center justify-center px-7 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm rounded-xl transition-all border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6200]"
                                    >
                                        Browse the Market
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    href={user.role === 'student_seller' || user.role === 'seller' ? '/seller/dashboard' : '/buyer/dashboard'}
                                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#FF6200] hover:bg-[#E55800] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#FF6200]/25 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF6200]/30"
                                >
                                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>

                        {/* Trust Badges Strip (High Contrast for both Light & Dark Mode) */}
                        <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                            <span className="flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-[#FF6200]/15 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-[#FF6200] stroke-[3]" />
                                </span>
                                Verified student sellers
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-[#FF6200]/15 flex items-center justify-center">
                                    <ShieldCheck className="w-3 h-3 text-[#FF6200]" />
                                </span>
                                Escrow-protected payments
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-[#FF6200]/15 flex items-center justify-center">
                                    <MapPin className="w-3 h-3 text-[#FF6200]" />
                                </span>
                                Live in Abuja
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Student Hero Visual matching Screen 1 (Rock-solid Picture Display) */}
                    <div className="flex-1 w-full flex items-center justify-center relative min-h-[380px] sm:min-h-[460px] max-w-lg">
                        {/* Ambient Glow */}
                        <div className="absolute w-[320px] sm:w-[400px] h-[320px] sm:h-[400px] rounded-full bg-[#FF6200]/15 blur-3xl pointer-events-none" />

                        {/* Hero Student Composite with pop-out 3D effect */}
                        <div className="relative z-10 w-full max-w-[420px] aspect-square flex items-center justify-center transition-transform hover:scale-[1.02] duration-500">
                            <picture>
                                <source srcSet="/images/hero_student.webp" type="image/webp" />
                                <img
                                    src="/images/hero_student.png"
                                    alt="MarketBridge verified university student smiling and holding study materials in Abuja"
                                    width={500}
                                    height={500}
                                    className="w-full h-auto object-contain drop-shadow-2xl select-none"
                                    loading="eager"
                                />
                            </picture>
                        </div>

                        {/* Floating Trust Badge (Top Right) */}
                        <div className="absolute -top-2 right-2 sm:right-4 z-20 bg-white dark:bg-[#0F172A] px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 flex items-center gap-2.5 animate-float">
                            <div className="w-7 h-7 rounded-xl bg-[#FF6200]/10 flex items-center justify-center text-[#FF6200] shrink-0">
                                <Sparkles className="w-4 h-4 text-[#FF6200]" />
                            </div>
                            <div className="text-left leading-tight">
                                <p className="text-xs font-black text-slate-900 dark:text-white">Real students. Real deals.</p>
                                <p className="text-[10px] font-bold text-[#FF6200] uppercase tracking-wider">Safe & secure</p>
                            </div>
                        </div>

                        {/* Lively Floating Campus Badge (Bottom Left) */}
                        <div 
                            className="absolute -bottom-3 -left-2 sm:left-4 z-20 bg-white dark:bg-[#0F172A] px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 flex items-center gap-2.5 hidden sm:flex animate-float"
                            style={{ animationDelay: '2s' }}
                        >
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                Live on 3 Abuja Campuses
                            </p>
                        </div>
                    </div>

                </section>

                {/* ─── 2. HOW IT WORKS ON CAMPUS (High Contrast Light & Dark) ─── */}
                <section id="how-it-works" className="w-full bg-slate-50 dark:bg-[#080D1A] py-20 border-y border-slate-200 dark:border-white/10">
                    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                        <div className="mb-12 text-left">
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                How It Works on Campus
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1 */}
                            <div className="bg-white dark:bg-[#0F172A] p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-[#FF6200]/40 hover:-translate-y-1 transition-all duration-300 space-y-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF6200]">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Verified Students Only
                                </h3>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                    Every seller passes ID verification against their university enrollment. You&apos;re always trading with a real, verified classmate — never a stranger.
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white dark:bg-[#0F172A] p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-[#FF6200]/40 hover:-translate-y-1 transition-all duration-300 space-y-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF6200]">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Delivered From Campus
                                </h3>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                    Sellers are already in your hostel or faculty. Orders move in minutes, not hours.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white dark:bg-[#0F172A] p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-[#FF6200]/40 hover:-translate-y-1 transition-all duration-300 space-y-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF6200]">
                                    <Store className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Turn Your Hustle into a Storefront
                                </h3>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                    Set up shop in minutes. List textbooks, gadgets, fashion, or food, and start taking orders the same day.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── 3. JOIN MARKETBRIDGE BANNER (No Generic "MB" — Real Campus Deal Stack) ─── */}
                <section className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
                    <div className="w-full bg-[#0B0F19] rounded-[2.5rem] p-8 sm:p-12 md:p-14 text-white border border-white/10 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="space-y-4 max-w-lg z-10 text-left">
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                                Join MarketBridge
                            </h2>
                            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                                Create a free account and start browsing what your campus is selling — food, textbooks, tech, and more, all from verified students near you.
                            </p>
                            <div className="pt-2">
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center justify-center px-8 py-4 bg-[#FF6200] hover:bg-[#E55800] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-[#FF6200]/30 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF6200]/40"
                                >
                                    Get Started — It&apos;s Free
                                </Link>
                            </div>
                        </div>

                        {/* Authentic Live Campus Card Preview (Replaced Generic "MB") */}
                        <div className="relative z-10 w-full max-w-sm flex flex-col gap-3 group">
                            {/* Card 1: Live Campus Deal Preview */}
                            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 transition-transform group-hover:-translate-y-1 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#FF6200]/20 border border-[#FF6200]/30 flex items-center justify-center text-[#FF6200] shrink-0">
                                        <Smartphone className="w-5 h-5 text-[#FF6200]" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-white">MacBook Air M2 256GB</p>
                                        <p className="text-[11px] text-slate-300">Verified Seller • Baze University</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-black text-[#FF6200]">₦650,000</p>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                        <Lock className="w-2.5 h-2.5" /> Protected
                                    </span>
                                </div>
                            </div>

                            {/* Card 2: Fast Delivery Tag */}
                            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 transition-transform group-hover:translate-x-1 duration-300">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs font-semibold text-white">Hostel Delivery • 15 Mins</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                                    Active Now
                                </span>
                            </div>

                            {/* Card 3: Active Campuses */}
                            <div className="flex items-center justify-between gap-2 pt-1 text-[11px] font-medium text-slate-300 px-1">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Baze
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Nile
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Veritas
                                </span>
                            </div>
                        </div>

                        {/* Subtle background glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6200]/10 rounded-full blur-[100px] pointer-events-none" />
                    </div>
                </section>

                {/* ─── 4. MARKETBRIDGE IN YOUR POCKET (With Live QR App Preview) ─── */}
                <section className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16 text-center">
                    <div className="max-w-2xl mx-auto space-y-6 flex flex-col items-center">
                        <span className="inline-block px-3.5 py-1 bg-orange-500/10 text-[#FF6200] border border-[#FF6200]/30 rounded-full text-xs font-bold uppercase tracking-wider">
                            Coming Soon
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            MarketBridge, in your pocket.
                        </h2>
                        <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                            Our native mobile app is on the way. For now, MarketBridge works seamlessly right in your browser on iOS and Android — no install needed.
                        </p>

                        {/* QR Code App Download Preview Card */}
                        <div className="pt-2">
                            <div className="inline-flex flex-col items-center bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                <div className="bg-white p-3 rounded-2xl mb-3 shadow-inner">
                                    <QRCode value="https://marketbridge.com.ng/app/download" size={100} />
                                </div>
                                <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Scan to preview on mobile</p>
                                <p className="text-[10px] font-bold text-[#FF6200] uppercase tracking-wider mt-0.5">marketbridge.com.ng</p>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
}

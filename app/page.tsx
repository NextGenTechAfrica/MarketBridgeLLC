'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    ArrowRight, 
    CheckCircle2, 
    ShieldCheck, 
    MapPin, 
    Smartphone, 
    GraduationCap, 
    Clock, 
    Store,
    Sparkles,
    Check
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
    const { user } = useAuth();

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-[#FF5500] selection:text-white">
            <Header />

            <main className="flex-1 w-full flex flex-col items-center">

                {/* ─── 1. HERO SECTION (1:1 with Master Board Screen 1) ─── */}
                <section className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-12 md:pt-16 pb-16 md:pb-24 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
                    
                    {/* Left Column: Copy & Actions */}
                    <div className="flex-1 flex flex-col space-y-6 max-w-xl z-10">
                        <div className="space-y-3">
                            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black leading-[1.08] tracking-tight text-slate-900">
                                Abuja&apos;s campus marketplace,{' '}
                                <span className="text-[#FF5500]">built for students.</span>
                            </h1>
                            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed pt-1">
                                Buy and sell with verified students at Baze, Nile, and Veritas. Order food, find textbooks, and book campus services — every transaction protected by escrow, every seller ID-checked.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="pt-2 flex flex-wrap items-center gap-3.5">
                            {!user ? (
                                <>
                                    <Link
                                        href="/signup"
                                        className="inline-flex items-center justify-center px-7 py-3.5 bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#FF5500]/25 active:scale-95"
                                    >
                                        Get Started
                                    </Link>
                                    <Link
                                        href="/marketplace"
                                        className="inline-flex items-center justify-center px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-xl transition-all border border-slate-200 shadow-sm active:scale-95"
                                    >
                                        Browse the Market
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    href={user.role === 'student_seller' || user.role === 'seller' ? '/seller/dashboard' : '/buyer/dashboard'}
                                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#FF5500]/25 active:scale-95"
                                >
                                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>

                        {/* Trust Badges Strip */}
                        <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-semibold text-slate-600">
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded-full bg-[#FF5500]/10 flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-[#FF5500] stroke-[3]" />
                                </span>
                                Verified student sellers
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded-full bg-[#FF5500]/10 flex items-center justify-center">
                                    <ShieldCheck className="w-2.5 h-2.5 text-[#FF5500]" />
                                </span>
                                Escrow-protected payments
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded-full bg-[#FF5500]/10 flex items-center justify-center">
                                    <MapPin className="w-2.5 h-2.5 text-[#FF5500]" />
                                </span>
                                Live in Abuja
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Student Hero Visual with Orange Circle Backdrop */}
                    <div className="flex-1 w-full flex items-center justify-center relative min-h-[380px] sm:min-h-[440px] max-w-lg">
                        {/* Circular energetic orange background glow */}
                        <div className="absolute w-[320px] sm:w-[380px] h-[320px] sm:h-[380px] rounded-full bg-gradient-to-tr from-[#FF5500] to-orange-400 opacity-95 pointer-events-none" />
                        
                        {/* Cutout student image */}
                        <div className="relative z-10 w-[300px] sm:w-[360px] h-[400px] sm:h-[480px]">
                            <Image
                                src="/images/hero_student.jpg"
                                alt="Smiling Nigerian university student holding a laptop"
                                fill
                                priority
                                className="object-contain drop-shadow-2xl"
                            />
                        </div>

                        {/* Floating Sticker / Badge */}
                        <div className="absolute -top-2 right-2 sm:right-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#FF5500]" />
                            <div className="text-left leading-tight">
                                <p className="text-[11px] font-black text-slate-900">Real students. Real deals.</p>
                                <p className="text-[9px] font-semibold text-[#FF5500] uppercase tracking-wider">Safe & secure</p>
                            </div>
                        </div>
                    </div>

                </section>

                {/* ─── 2. HOW IT WORKS ON CAMPUS ─── */}
                <section id="how-it-works" className="w-full bg-[#F8F9FA] py-20 border-y border-slate-100">
                    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                        <div className="mb-12">
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                How It Works on Campus
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1 */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5500]">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Verified Students Only
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                                    Every seller passes ID verification against their university enrollment. You&apos;re always trading with a real, verified classmate — never a stranger.
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5500]">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Delivered From Campus
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                                    Sellers are already in your hostel or faculty. Orders move in minutes, not hours.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5500]">
                                    <Store className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Turn Your Hustle into a Storefront
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-normal">
                                    Set up shop in minutes. List textbooks, gadgets, fashion, or food, and start taking orders the same day.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── 3. JOIN MARKETBRIDGE BANNER ─── */}
                <section className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
                    <div className="w-full bg-[#0B0F19] rounded-[2.5rem] p-10 md:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden shadow-2xl">
                        <div className="space-y-4 max-w-lg z-10">
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                                Join MarketBridge
                            </h2>
                            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                                Create a free account and start browsing what your campus is selling — food, textbooks, tech, and more, all from verified students near you.
                            </p>
                            <div className="pt-2">
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center justify-center px-8 py-4 bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-[#FF5500]/30 active:scale-95"
                                >
                                    Get Started — It&apos;s Free
                                </Link>
                            </div>
                        </div>

                        {/* Visual Badge / Mobile Graphic */}
                        <div className="relative z-10 flex items-center justify-center">
                            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/20 flex items-center justify-center p-6 shadow-[0_0_80px_rgba(255,85,0,0.15)]">
                                <div className="w-24 h-24 rounded-full bg-[#FF5500] flex items-center justify-center shadow-2xl">
                                    <span className="text-3xl font-black text-white italic">MB</span>
                                </div>
                            </div>
                        </div>

                        {/* Subtle background glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF5500]/10 rounded-full blur-[100px] pointer-events-none" />
                    </div>
                </section>

                {/* ─── 4. MARKETBRIDGE IN YOUR POCKET (Coming Soon) ─── */}
                <section className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16 text-center">
                    <div className="max-w-2xl mx-auto space-y-4">
                        <span className="inline-block px-3.5 py-1 bg-orange-50 text-[#FF5500] border border-orange-200/60 rounded-full text-xs font-bold uppercase tracking-wider">
                            Coming Soon
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                            MarketBridge, in your pocket.
                        </h2>
                        <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                            Our mobile app is on the way. For now, MarketBridge works great right in your browser — no install needed.
                        </p>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
}

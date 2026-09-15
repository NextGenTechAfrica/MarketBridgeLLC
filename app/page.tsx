'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Store, MapPin, Zap, CheckCircle2, Shield, Users, Star, Smartphone } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'react-qr-code';

export default function HomePage() {
    const { user } = useAuth();

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-[#FF6200] selection:text-white">
            <Header />
            <main className="flex-1 w-full flex flex-col items-center pt-16">

                {/* ─── Hero Section ─── */}
                <section className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-16 pt-16 md:pt-24 pb-20 md:pb-28 flex flex-col md:flex-row items-center gap-10 lg:gap-20 relative">
                    <div className="flex-1 flex flex-col space-y-6 z-10 relative">
                        <div className="inline-flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-[#FF6200] animate-pulse" />
                            <span className="text-xs font-semibold tracking-wide text-[#FF6200]">Live in Abuja</span>
                        </div>
                        <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-black leading-[1] tracking-tight text-foreground">
                            Everything You Need{' '}
                            <span className="text-[#FF6200]">All in One Place</span>
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground font-medium max-w-lg leading-relaxed">
                            Buy from verified sellers. Get great deals, safe transactions and fast support.
                        </p>

                        {!user ? (
                            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <Link
                                    href="/signup"
                                    className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-[#FF6200]/20 group"
                                >
                                    Get Started <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                                <Link
                                    href="/marketplace"
                                    className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-foreground font-semibold text-sm rounded-xl transition-all border border-zinc-200 dark:border-white/10"
                                >
                                    Browse the Market
                                </Link>
                            </div>
                        ) : (
                            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <Link
                                    href={user.role === 'seller' || user.role === 'student_seller' ? '/seller/dashboard' : '/marketplace'}
                                    className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-[#FF6200]/20 group"
                                >
                                    {user.role === 'seller' || user.role === 'student_seller' ? 'Seller Dashboard' : 'Explore Now'} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>
                        )}

                        {/* Trust badges */}
                        <div className="flex flex-wrap items-center gap-5 pt-4">
                            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-[#FF6200]" /> Verified Sellers
                            </span>
                            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <Shield className="w-4 h-4 text-[#FF6200]" /> Escrow Protected
                            </span>
                            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <MapPin className="w-4 h-4 text-[#FF6200]" /> Local Delivery
                            </span>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="flex-1 w-full relative h-[420px] lg:h-[500px] flex items-center justify-center">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#FF6200]/8 rounded-full blur-[100px] pointer-events-none" />
                        
                        {/* Phone Mockup */}
                        <div className="relative z-10 w-[260px] h-[520px] bg-zinc-50 dark:bg-[#0B1120] border-[6px] border-zinc-200 dark:border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center">
                            <div className="absolute top-0 w-28 h-5 bg-zinc-200 dark:bg-white/10 rounded-b-2xl z-20" />
                            <div className="flex-1 w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-[#0F1A2E] dark:to-[#0B1120] p-4 pt-10 space-y-3">
                                <div className="h-5 w-1/3 bg-zinc-200 dark:bg-white/10 rounded-full mb-4 mt-2" />
                                
                                {/* Product Card in Phone */}
                                <div className="bg-white dark:bg-white/5 p-3.5 rounded-2xl shadow-sm border border-zinc-100 dark:border-white/5 w-full">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-11 h-11 bg-[#FF6200]/10 rounded-xl flex items-center justify-center shrink-0">
                                            <ShoppingBag className="w-5 h-5 text-[#FF6200]" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold text-muted-foreground">Delivering</p>
                                            <h4 className="font-bold text-foreground text-sm leading-tight">Jollof & Chicken</h4>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-zinc-50 dark:border-white/5 pt-2.5">
                                        <p className="text-[#FF6200] font-bold">₦3,500</p>
                                        <div className="w-7 h-7 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center">
                                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Service Card in Phone */}
                                <div className="bg-white dark:bg-white/5 p-3.5 rounded-2xl shadow-sm border border-zinc-100 dark:border-white/5 w-full">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-11 h-11 bg-zinc-100 dark:bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                                            <Store className="w-5 h-5 text-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold text-muted-foreground">Service</p>
                                            <h4 className="font-bold text-foreground text-sm leading-tight">MacBook Repair</h4>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-zinc-50 dark:border-white/5 pt-2.5">
                                        <p className="text-muted-foreground font-medium text-xs">Campus A</p>
                                        <div className="w-7 h-7 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center">
                                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Badges */}
                        <div className="absolute right-0 bottom-20 z-20 bg-card text-foreground px-5 py-3.5 rounded-2xl shadow-xl rotate-[4deg] animate-float border border-border hidden sm:block">
                            <div className="flex items-center gap-3">
                                <Zap className="w-5 h-5 text-[#FF6200]" />
                                <div>
                                    <p className="text-[10px] font-medium text-muted-foreground">ETA To You</p>
                                    <p className="font-bold text-lg leading-none mt-0.5">15 Mins</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -left-2 top-36 z-20 bg-card text-foreground px-4 py-3 rounded-2xl shadow-xl -rotate-[5deg] animate-float border border-border hidden sm:flex items-center gap-2.5" style={{ animationDelay: '1s' }}>
                            <div className="h-6 w-6 rounded-full bg-[#FF6200]/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-[#FF6200]" />
                            </div>
                            <p className="font-bold text-sm">Verified Seller</p>
                        </div>
                    </div>
                </section>

                {/* ─── How It Works ─── */}
                <section className="w-full bg-card border-y border-border py-20 md:py-24">
                    <div className="max-w-6xl mx-auto px-6 md:px-10 text-center">
                        <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                            How It Works
                        </h2>
                        <p className="text-muted-foreground max-w-xl mx-auto mb-14">
                            Simple, secure, and designed for your community
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: "Verified Sellers", icon: Shield, bg: "bg-[#FF6200]/10", iconColor: "text-[#FF6200]", desc: "Every seller is verified through our ID verification process. Trade with confidence knowing your peers are authenticated." },
                                { title: "Fast Local Delivery", icon: Zap, bg: "bg-blue-500/10", iconColor: "text-blue-500", desc: "Sellers are nearby — from campus to community. Quick delivery for food, gadgets, fashion, and more." },
                                { title: "Start Your Storefront", icon: Store, bg: "bg-emerald-500/10", iconColor: "text-emerald-500", desc: "Set up a storefront, list your products, and start taking orders. Build your reputation with reviews." }
                            ].map((feat, i) => (
                                <div key={i} className="flex flex-col items-center p-8 bg-background rounded-2xl border border-border hover:border-primary/20 hover:shadow-md transition-all">
                                    <div className={`w-16 h-16 rounded-2xl ${feat.bg} flex items-center justify-center mb-5`}>
                                        <feat.icon className={`w-8 h-8 ${feat.iconColor}`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">{feat.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Join CTA ─── */}
                <section className="w-full max-w-5xl mx-auto px-6 py-20 md:py-28">
                    <div className="bg-[#0A1628] p-10 md:p-16 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6200]/15 rounded-full blur-[80px]" />
                        <div className="relative z-10 flex-1 flex flex-col items-start text-left">
                            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                                Join <span className="text-[#FF6200]">MarketBridge</span>
                            </h2>
                            <p className="text-white/50 text-base max-w-xl mb-6 leading-relaxed">
                                Create a free account and start browsing what your community is selling — food, textbooks, tech, and more, all from verified sellers near you.
                            </p>
                            <Link
                                href="/signup"
                                className="flex items-center gap-2.5 px-7 py-3.5 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-[#FF6200]/20 group"
                            >
                                Sign Up Free <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>

                        {/* QR Code / App promo */}
                        <div className="relative z-10 hidden md:flex flex-col items-center bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                            <div className="bg-white p-3 rounded-xl mb-3 shadow-lg">
                                <QRCode value="https://marketbridge.com.ng/app/download" size={88} />
                            </div>
                            <p className="text-white font-semibold text-xs">Download the App</p>
                            <p className="text-[#FF6200] text-[10px] font-medium mt-0.5">Coming Soon</p>
                        </div>
                    </div>
                </section>

                {/* ─── In Your Pocket ─── */}
                <section className="w-full bg-card border-y border-border py-20 md:py-24">
                    <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1">
                            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                                MarketBridge, <span className="text-[#FF6200]">in your pocket.</span>
                            </h2>
                            <p className="text-muted-foreground text-base max-w-md leading-relaxed mb-6">
                                The marketplace works great right in your browser — no install needed. A native app is coming soon.
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10">
                                    <Smartphone className="h-5 w-5 text-[#FF6200]" />
                                    <span className="text-sm font-medium text-foreground">PWA Ready</span>
                                </div>
                                <span className="text-xs text-muted-foreground">Add to home screen for app-like experience</span>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <div className="w-[220px] h-[440px] bg-zinc-50 dark:bg-[#0B1120] border-[5px] border-zinc-200 dark:border-white/10 rounded-[2.5rem] shadow-xl overflow-hidden flex items-center justify-center">
                                <div className="text-center p-6">
                                    <ShoppingBag className="h-12 w-12 text-[#FF6200] mx-auto mb-4" />
                                    <p className="font-bold text-foreground text-sm">MarketBridge</p>
                                    <p className="text-xs text-muted-foreground mt-1">Your marketplace</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    ShoppingBag, 
    Zap, 
    Store, 
    ArrowRight, 
    Sparkles, 
    CheckCircle2, 
    ShieldCheck, 
    Star,
    ChevronRight,
    Search
} from 'lucide-react';

const CATEGORIES = ['All', 'Food', 'Tech', 'Books', 'Fashion'] as const;

interface PhoneItem {
    id: string;
    category: typeof CATEGORIES[number];
    title: string;
    seller: string;
    price: string;
    tag: string;
    icon: typeof ShoppingBag;
    accentColor: string;
    rating: string;
}

const PHONE_ITEMS: PhoneItem[] = [
    {
        id: '1',
        category: 'Food',
        title: 'Jollof & Grilled Chicken',
        seller: 'Blessing K. • Nile Campus',
        price: '₦3,500',
        tag: 'Delivering',
        icon: ShoppingBag,
        accentColor: 'text-[#FF6200] bg-[#FF6200]/10 border-[#FF6200]/20',
        rating: '4.9'
    },
    {
        id: '2',
        category: 'Tech',
        title: 'MacBook Air M2 (16GB)',
        seller: 'Tunde O. • Baze Campus',
        price: '₦550,000',
        tag: 'Verified Seller',
        icon: Zap,
        accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        rating: '5.0'
    },
    {
        id: '3',
        category: 'Books',
        title: 'Calculus 101 Textbook',
        seller: 'David A. • Veritas Campus',
        price: '₦12,000',
        tag: 'Like New',
        icon: Store,
        accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        rating: '4.8'
    },
    {
        id: '4',
        category: 'Fashion',
        title: 'Nike Air Force 1',
        seller: 'Chioma M. • Abuja Campus',
        price: '₦55,000',
        tag: 'In Stock',
        icon: ShoppingBag,
        accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        rating: '4.7'
    }
];

export function HeroInteractivePhone() {
    const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('All');
    const [activeItemId, setActiveItemId] = useState<string>('1');

    const filteredItems = selectedCategory === 'All' 
        ? PHONE_ITEMS 
        : PHONE_ITEMS.filter(item => item.category === selectedCategory);

    return (
        <div className="relative w-full max-w-[340px] sm:max-w-[380px] flex items-center justify-center select-none">
            {/* Ambient Glow */}
            <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-[#FF6200]/15 dark:bg-[#FF6200]/20 blur-3xl pointer-events-none -z-10" />

            {/* Phone Mockup Frame */}
            <div className="relative z-10 w-[280px] sm:w-[310px] h-[580px] bg-slate-900 border-[7px] border-slate-800 rounded-[3.25rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
                {/* Dynamic Island / Notch */}
                <div className="pt-2.5 pb-1 flex justify-center bg-slate-950">
                    <div className="w-24 h-4 bg-black rounded-full flex items-center justify-between px-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#FF6200]/40 animate-pulse" />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    </div>
                </div>

                {/* Status Bar */}
                <div className="px-5 py-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400 bg-slate-950">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">5G</span>
                    </div>
                </div>

                {/* Inside Screen Content */}
                <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 p-3.5 space-y-3 overflow-hidden">
                    {/* App Header */}
                    <div className="flex items-center justify-between pt-1">
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium">Explore Deals</p>
                            <h3 className="text-sm font-black tracking-tight text-white">
                                Market<span className="text-[#FF6200]">Bridge</span>
                            </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                        </span>
                    </div>

                    {/* Mini Search Simulation */}
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-400">
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px] truncate">Search textbooks, gadgets, food...</span>
                    </div>

                    {/* Interactive Category Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                                        isSelected 
                                            ? 'bg-[#FF6200] text-white shadow-sm shadow-[#FF6200]/30 scale-105' 
                                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>

                    {/* Product Cards Stack (Interactive) */}
                    <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 no-scrollbar">
                        {filteredItems.map((item) => {
                            const isActive = activeItemId === item.id;
                            const IconComponent = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setActiveItemId(item.id)}
                                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                        isActive 
                                            ? 'bg-slate-900 border-[#FF6200]/50 shadow-md shadow-[#FF6200]/10 translate-x-1' 
                                            : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.accentColor}`}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="leading-tight">
                                                <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                                                <p className="text-[9px] text-slate-400 mt-0.5">{item.seller}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-[#FF6200] shrink-0">
                                            {item.price}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/60 text-[9px]">
                                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {item.rating}
                                        </span>
                                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                            <ShieldCheck className="w-3 h-3" /> {item.tag}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Action inside Phone */}
                    <Link
                        href="/marketplace"
                        className="w-full py-2 bg-[#FF6200] hover:bg-[#E55800] text-white rounded-xl text-center text-xs font-bold transition-all shadow-md shadow-[#FF6200]/25 flex items-center justify-center gap-1.5 active:scale-95"
                    >
                        Browse All Marketplace <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {/* ─── Floating Badges (Around the Phone) ─── */}
            
            {/* Top Right Floating Badge */}
            <div className="absolute -top-3 -right-2 sm:-right-6 z-20 bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700/80 flex items-center gap-2 animate-float">
                <div className="w-7 h-7 rounded-xl bg-[#FF6200]/15 flex items-center justify-center text-[#FF6200] shrink-0">
                    <Sparkles className="w-4 h-4 text-[#FF6200]" />
                </div>
                <div className="text-left leading-tight">
                    <p className="text-[11px] font-black text-white">Real students. Real deals.</p>
                    <p className="text-[9px] font-bold text-[#FF6200] uppercase tracking-wider">Safe & secure</p>
                </div>
            </div>

            {/* Bottom Right Floating Badge: ETA */}
            <div className="absolute -bottom-2 -right-2 sm:-right-4 z-20 bg-[#0A1628] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 hidden sm:flex items-center gap-2.5 rotate-[2deg]">
                <Zap className="w-5 h-5 text-[#FF6200]" />
                <div className="text-left">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">ETA To You</p>
                    <p className="text-sm font-black leading-none mt-0.5 text-white">15 Mins</p>
                </div>
            </div>

            {/* Left Floating Badge: Verified Seller */}
            <div 
                className="absolute top-28 -left-3 sm:-left-8 z-20 bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl -rotate-[5deg] border border-slate-700/80 hidden sm:flex items-center gap-2 animate-float"
                style={{ animationDelay: '1.5s' }}
            >
                <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="font-bold text-xs text-white">Verified Seller</p>
            </div>
        </div>
    );
}

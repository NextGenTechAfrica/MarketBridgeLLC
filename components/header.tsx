'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import {
    Menu, User, LogOut, LayoutDashboard, Crown, Zap,
    ShoppingBag, Store, ChevronDown, X, MessageCircle,
    Search, ShoppingCart, MapPin, Bell, Heart, ShieldCheck,
    Smartphone, HelpCircle, Layers, ArrowRight
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLocation } from '@/contexts/LocationContext';
import { NotificationBell } from '@/components/notification/NotificationBell';
import { CATEGORIES } from '@/lib/categories';

export const Header = () => {
    const { user, logout, loading } = useAuth();
    const { itemCount } = useCart();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentNode, setCurrentNode] = useState<string>('Abuja');
    const { setShowDialog } = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('mb-preferred-node');
        if (saved && saved !== 'global') {
            setCurrentNode(saved);
        } else if (saved === 'global') {
            setCurrentNode('Global');
        }
    }, []);

    const handleSignOut = () => {
        logout();
        router.push('/');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname?.startsWith(path);
    };

    return (
        <header className="sticky top-0 left-0 right-0 z-[100] bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 shadow-sm transition-colors">
            {/* ─── 1. Compact Top Utility Bar (Tokosm / Tokopedia Inspiration) ─── */}
            <div className="hidden lg:block border-b border-zinc-100 dark:border-white/5 bg-zinc-50/80 dark:bg-[#080D1A]/80 py-1.5 px-4 sm:px-6 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#FF6200]" />
                            Zero-Fraud Escrow Protection
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live across Baze, Nile, Veritas & UniAbuja
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            type="button"
                            onClick={() => setShowDialog(true)}
                            className="flex items-center gap-1.5 hover:text-[#FF6200] dark:hover:text-[#FF6200] transition-colors font-medium cursor-pointer"
                        >
                            <MapPin className="h-3.5 w-3.5 text-[#FF6200]" />
                            Campus: <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentNode}</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        <Link href="/seller-onboarding" className="hover:text-[#FF6200] transition-colors font-semibold">
                            Sell on MarketBridge
                        </Link>
                        <Link href="/faq" className="hover:text-[#FF6200] transition-colors">
                            How It Works
                        </Link>
                        <Link href="/contact" className="hover:text-[#FF6200] transition-colors">
                            Help & Support
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── 2. Main Navigation Bar ─── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4 lg:gap-6">
                {/* Brand Logo */}
                <div className="flex items-center shrink-0">
                    <Logo size="sm" />
                </div>

                {/* Categories Dropdown (Tokosm Style) */}
                <div className="hidden md:block">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-[#FF6200] dark:hover:text-[#FF6200] hover:bg-zinc-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                            >
                                <Layers className="h-4 w-4 text-[#FF6200]" />
                                <span>Categories</span>
                                <ChevronDown className="h-3 w-3 text-zinc-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuContent
                                align="start"
                                sideOffset={8}
                                className="w-64 bg-white dark:bg-[#0F1A2E] border border-zinc-200 dark:border-white/10 p-2 shadow-2xl rounded-2xl z-[999]"
                            >
                                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-white/5 mb-1">
                                    Campus Categories
                                </div>
                                <div className="max-h-80 overflow-y-auto space-y-1">
                                    {CATEGORIES.map((cat) => (
                                        <DropdownMenuItem asChild key={cat.id} className="rounded-xl cursor-pointer">
                                            <Link
                                                href={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                                                className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group"
                                            >
                                                <div className={`w-7 h-7 rounded-lg ${cat.bg} flex items-center justify-center shrink-0`}>
                                                    <cat.icon className={`h-4 w-4 ${cat.color}`} />
                                                </div>
                                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-[#FF6200]">
                                                    {cat.name}
                                                </span>
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                                <div className="pt-2 mt-1 border-t border-zinc-100 dark:border-white/5 px-2">
                                    <Link
                                        href="/marketplace"
                                        className="text-xs font-bold text-[#FF6200] flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10"
                                    >
                                        <span>View All Marketplace</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenuPortal>
                    </DropdownMenu>
                </div>

                {/* Primary Omni-Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative" role="search">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden="true" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search textbooks, MacBook, jollof, hostels in Abuja..."
                            aria-label="Search products, sellers, or campus categories"
                            className="w-full pl-10 pr-24 py-2.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-foreground placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200] transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#FF6200] hover:bg-[#E55800] text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            Search
                        </button>
                    </div>
                </form>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                    {/* Wishlist Link */}
                    <Link
                        href="/wishlist"
                        aria-label="Saved Wishlist"
                        className="relative p-2.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-[#FF6200] dark:hover:text-[#FF6200] hover:bg-zinc-100 dark:hover:bg-white/5 transition-all hidden sm:flex border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                    >
                        <Heart className="h-4 w-4" />
                    </Link>

                    {/* Cart Icon with Live Badge */}
                    <Link
                        href="/cart"
                        aria-label={`Shopping Cart with ${itemCount} items`}
                        className="relative p-2.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-[#FF6200] dark:hover:text-[#FF6200] hover:bg-zinc-100 dark:hover:bg-white/5 transition-all border border-zinc-200 dark:border-white/10"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        {itemCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-[#FF6200] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-scale-in">
                                {itemCount > 99 ? '99+' : itemCount}
                            </span>
                        )}
                    </Link>

                    {/* Notification Bell */}
                    {user && <NotificationBell />}

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Authenticated User Menu */}
                    {user ? (
                        <div className="flex items-center gap-2">
                            {/* MarketCoins */}
                            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-xl" title="MarketCoins balance">
                                <Zap className="h-3.5 w-3.5 text-[#FF6200]" />
                                <span className="text-xs font-black text-zinc-900 dark:text-white">{(user.coins_balance || 0).toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-[#FF6200] uppercase">MC</span>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all shadow-sm">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#FF6200] to-amber-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-[80px] truncate hidden md:inline">
                                            {user.displayName?.split(' ')[0] || 'Account'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 text-zinc-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuContent
                                        align="end"
                                        sideOffset={8}
                                        className="w-64 bg-white dark:bg-[#0F1A2E] border border-zinc-200 dark:border-white/10 p-1.5 text-zinc-900 dark:text-white z-[999] shadow-2xl rounded-2xl"
                                    >
                                        <div className="px-3 py-3 mb-1 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/5 rounded-xl">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user.displayName || 'MarketBridge User'}</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.email}</p>
                                        </div>

                                        {(user.role === 'student_seller' || user.role === 'seller') && (
                                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                                <Link href="/seller/dashboard" className="flex items-center gap-3 px-3 py-2.5">
                                                    <Store className="h-4 w-4 text-[#FF6200]" />
                                                    <span className="text-sm font-semibold">Seller Dashboard</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        )}

                                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                            <Link href="/buyer/dashboard" className="flex items-center gap-3 px-3 py-2.5">
                                                <ShoppingBag className="h-4 w-4 text-zinc-500" />
                                                <span className="text-sm font-semibold">Buyer Dashboard</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                            <Link href="/orders" className="flex items-center gap-3 px-3 py-2.5">
                                                <ShoppingBag className="h-4 w-4 text-zinc-500" />
                                                <span className="text-sm font-semibold">My Orders & Escrow</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                            <Link href="/chats" className="flex items-center gap-3 px-3 py-2.5">
                                                <MessageCircle className="h-4 w-4 text-zinc-500" />
                                                <span className="text-sm font-semibold">Messages</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                            <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5">
                                                <User className="h-4 w-4 text-zinc-500" />
                                                <span className="text-sm font-semibold">Settings & Profile</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        {['ceo', 'operations_admin', 'marketing_admin', 'systems_admin', 'it_support', 'technical_admin', 'admin'].includes(user.role) && (
                                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                                <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5">
                                                    <Crown className="h-4 w-4 text-[#FF6200]" />
                                                    <span className="text-sm font-semibold text-[#FF6200]">Admin Panel</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        )}

                                        <div className="my-1 border-t border-zinc-100 dark:border-white/5" />

                                        <DropdownMenuItem
                                            onClick={handleSignOut}
                                            className="rounded-xl cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30"
                                        >
                                            <div className="flex items-center gap-3 px-3 py-2.5 w-full">
                                                <LogOut className="h-4 w-4" />
                                                <span className="text-sm font-semibold">Sign out</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenuPortal>
                            </DropdownMenu>
                        </div>
                    ) : (
                        !loading && (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-white hover:text-[#FF6200] dark:hover:text-[#FF6200] transition-colors px-3 py-2 rounded-xl"
                                >
                                    Log In
                                </Link>
                                <Link href="/signup">
                                    <Button size="sm" className="bg-[#FF6200] hover:bg-[#E55800] text-white font-bold text-xs sm:text-sm rounded-xl px-4 sm:px-5 h-9 sm:h-10 transition-all shadow-md shadow-[#FF6200]/25 active:scale-95">
                                        Sign Up
                                    </Button>
                                </Link>
                            </div>
                        )
                    )}

                    {/* Mobile Hamburger Menu */}
                    <button
                        type="button"
                        className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle Navigation Drawer"
                    >
                        {mobileMenuOpen ? <X className="h-4 w-4 text-foreground" /> : <Menu className="h-4 w-4 text-foreground" />}
                    </button>
                </div>
            </div>

            {/* ─── 3. Mobile Slide-down Drawer ─── */}
            {mobileMenuOpen && (
                <div className="fixed top-16 left-0 right-0 z-[99] bg-white dark:bg-[#0B1120] border-b border-zinc-200 dark:border-white/10 px-5 py-6 flex flex-col gap-4 md:hidden shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
                    {/* Location Node Selector */}
                    <button
                        type="button"
                        className="flex items-center justify-between p-3.5 bg-zinc-100 dark:bg-white/5 rounded-2xl text-left border border-zinc-200 dark:border-white/5"
                        onClick={() => { setShowDialog(true); setMobileMenuOpen(false); }}
                    >
                        <div className="flex items-center gap-2.5">
                            <MapPin className="h-4 w-4 text-[#FF6200]" />
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Campus: {currentNode}</span>
                        </div>
                        <span className="text-xs text-[#FF6200] font-semibold">Change</span>
                    </button>

                    {/* Categories shortcut */}
                    <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-1">
                            Browse Categories
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {CATEGORIES.slice(0, 6).map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 hover:border-[#FF6200]/30 transition-all"
                                >
                                    <div className={`w-6 h-6 rounded-md ${cat.bg} flex items-center justify-center shrink-0`}>
                                        <cat.icon className={`h-3 w-3 ${cat.color}`} />
                                    </div>
                                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{cat.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Quick navigation links */}
                    <div className="flex flex-col gap-1 border-t border-zinc-100 dark:border-white/5 pt-3">
                        <Link
                            href="/marketplace"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 hover:text-[#FF6200] rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                        >
                            <span>Marketplace</span>
                            <ArrowRight className="h-4 w-4 text-zinc-400" />
                        </Link>
                        <Link
                            href="/seller-onboarding"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 hover:text-[#FF6200] rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                        >
                            <span>Sell on MarketBridge</span>
                            <ArrowRight className="h-4 w-4 text-zinc-400" />
                        </Link>
                        <Link
                            href="/faq"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 hover:text-[#FF6200] rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                        >
                            <span>How It Works & Escrow</span>
                            <ArrowRight className="h-4 w-4 text-zinc-400" />
                        </Link>
                    </div>

                    {/* Account section */}
                    <div className="border-t border-zinc-100 dark:border-white/5 pt-3">
                        {user ? (
                            <div className="flex flex-col gap-2">
                                <Link
                                    href="/orders"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                                >
                                    <ShoppingBag className="h-4 w-4 text-[#FF6200]" />
                                    My Orders
                                </Link>
                                <Link
                                    href="/settings"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                                >
                                    <User className="h-4 w-4 text-zinc-500" />
                                    Account Settings
                                </Link>
                                <button
                                    onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 text-left rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center py-3 text-zinc-800 dark:text-white font-bold text-sm rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    Log In
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center py-3 bg-[#FF6200] hover:bg-[#E55800] text-white font-bold text-sm rounded-xl shadow-md shadow-[#FF6200]/25 transition-all"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

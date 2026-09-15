'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuth } from '@/contexts/AuthContext';
import {
    Menu, User, LogOut, LayoutDashboard, Crown, Zap,
    ShoppingBag, Store, ChevronDown, X, MessageCircle,
    Search, ShoppingCart, MapPin, Bell
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

export const Header = () => {
    const { user, logout, loading } = useAuth();
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
        <>
            <header className="sticky top-0 left-0 right-0 z-[100] bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/5 h-16 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center gap-4">

                    {/* Logo (visible when no sidebar) */}
                    <div className="flex items-center gap-3 shrink-0 md:hidden">
                        <Logo size="sm" />
                    </div>

                    {/* Logo for desktop (visible only on public pages - sidebar handles it on dashboard) */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <Logo size="sm" />
                    </div>

                    {/* Center Navigation: Screen 1 Navigation Links on Homepage, Search bar on other pages */}
                    {pathname === '/' ? (
                        <nav className="hidden md:flex items-center gap-8 ml-8">
                            <Link href="/marketplace" className="text-sm font-medium text-slate-600 hover:text-[#FF5500] transition-colors">
                                Browse
                            </Link>
                            <Link href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-[#FF5500] transition-colors">
                                How It Works
                            </Link>
                            <Link href="/seller-onboarding" className="text-sm font-medium text-slate-600 hover:text-[#FF5500] transition-colors">
                                Sell on MarketBridge
                            </Link>
                        </nav>
                    ) : (
                        /* Search Bar for Marketplace / Inner Pages */
                        <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:block">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products, sellers, or categories..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/30 focus:border-[#FF5500]/50 transition-all"
                                />
                            </div>
                        </form>
                    )}

                    {/* Right side actions */}
                    <div className="flex items-center gap-3 shrink-0 ml-auto">

                        {/* Location Selector (Shown on inner pages) */}
                        {pathname !== '/' && (
                            <button
                                className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 rounded-xl transition-all group"
                                onClick={() => setShowDialog(true)}
                            >
                                <MapPin className="h-3.5 w-3.5 text-[#FF5500]" />
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                    {currentNode}
                                </span>
                                <ChevronDown className="h-3 w-3 text-zinc-400" />
                            </button>
                        )}

                        {pathname !== '/' && <ThemeToggle />}

                        {user && <NotificationBell />}

                        {/* Cart Link (for buyers / unauthenticated on inner pages) */}
                        {pathname !== '/' && (!user || user.role === 'student_buyer' || user.role === 'buyer') && (
                            <Link
                                href="/cart"
                                className="relative p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all hidden sm:flex"
                            >
                                <ShoppingCart className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </Link>
                        )}

                        {/* Unauthenticated Actions */}
                        {!user && !loading && (
                            <div className="flex items-center gap-3">
                                <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-[#FF5500] transition-colors px-2 py-1">
                                    Login
                                </Link>
                                <Link href="/signup">
                                    <Button size="sm" className="bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-sm rounded-xl px-5 h-10 transition-all shadow-md shadow-[#FF5500]/25 active:scale-95">
                                        Get Started
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* User Menu (Desktop) */}
                        {user && (
                            <div className="hidden md:flex items-center gap-2">
                                {/* MarketCoins */}
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#FF6200]/8 border border-[#FF6200]/15 rounded-xl" title="MarketCoins balance">
                                    <Zap className="h-3.5 w-3.5 text-[#FF6200]" />
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">{(user.coins_balance || 0).toLocaleString()}</span>
                                    <span className="text-[9px] font-bold text-[#FF6200]/80 uppercase">MC</span>
                                </div>

                                {/* Profile Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all shadow-sm group">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#FF6200] to-amber-400 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-[80px] truncate">
                                                {user.displayName?.split(' ')[0] || 'Account'}
                                            </span>
                                            <ChevronDown className="h-3 w-3 text-zinc-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuContent
                                            align="end"
                                            sideOffset={12}
                                            className="w-64 bg-white dark:bg-[#0F1A2E] border border-zinc-200 dark:border-white/10 p-1.5 text-zinc-900 dark:text-white z-[999] shadow-2xl rounded-xl"
                                        >
                                            {/* Account info */}
                                            <div className="px-3 py-3 mb-1 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/5 rounded-lg">
                                                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user.displayName || 'MarketBridge User'}</p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.email}</p>
                                            </div>

                                            {(user.role === 'student_seller' || user.role === 'seller') && (
                                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-white/5 my-0.5">
                                                    <Link href="/seller/dashboard" className="flex items-center gap-3 px-3 py-2.5">
                                                        <Store className="h-4 w-4 text-[#FF6200]" />
                                                        <span className="text-sm font-medium">Seller Dashboard</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}

                                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-white/5 my-0.5">
                                                <Link href="/marketplace" className="flex items-center gap-3 px-3 py-2.5">
                                                    <ShoppingBag className="h-4 w-4 text-zinc-500" />
                                                    <span className="text-sm font-medium">Browse Market</span>
                                                </Link>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-white/5 my-0.5">
                                                <Link href="/chats" className="flex items-center gap-3 px-3 py-2.5">
                                                    <MessageCircle className="h-4 w-4 text-zinc-500" />
                                                    <span className="text-sm font-medium">Messages</span>
                                                </Link>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-white/5 my-0.5">
                                                <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5">
                                                    <User className="h-4 w-4 text-zinc-500" />
                                                    <span className="text-sm font-medium">My Account</span>
                                                </Link>
                                            </DropdownMenuItem>

                                            {['ceo', 'operations_admin', 'marketing_admin', 'systems_admin', 'it_support', 'technical_admin', 'admin'].includes(user.role) && (
                                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-white/5 my-0.5">
                                                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5">
                                                        <Crown className="h-4 w-4 text-[#FF6200]" />
                                                        <span className="text-sm font-medium text-[#FF6200]">Admin Panel</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}

                                            <div className="my-1 border-t border-zinc-100 dark:border-white/5" />

                                            <DropdownMenuItem
                                                onClick={handleSignOut}
                                                className="rounded-lg cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/30 text-red-600 dark:text-red-400 my-0.5"
                                            >
                                                <div className="flex items-center gap-3 px-3 py-2.5 w-full">
                                                    <LogOut className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Log out</span>
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenuPortal>
                                </DropdownMenu>

                                <LayoutDashboard className="hidden" />
                            </div>
                        )}

                        {/* Mobile Hamburger */}
                        <button
                            className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X className="h-4 w-4 text-zinc-900 dark:text-white" /> : <Menu className="h-4 w-4 text-zinc-900 dark:text-white" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Slide-down Menu */}
            {mobileMenuOpen && (
                <div className="fixed top-16 left-0 right-0 z-[99] bg-white dark:bg-[#0B1120] border-b border-zinc-200 dark:border-white/5 px-6 py-6 flex flex-col gap-3 md:hidden shadow-xl">
                    {/* Mobile Search */}
                    <form onSubmit={handleSearch} className="mb-2">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30"
                            />
                        </div>
                    </form>

                    {/* Location on mobile */}
                    <button
                        className="flex items-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-white/5 rounded-xl text-left"
                        onClick={() => { setShowDialog(true); setMobileMenuOpen(false); }}
                    >
                        <MapPin className="h-4 w-4 text-[#FF6200]" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{currentNode}</span>
                        <ChevronDown className="h-3 w-3 text-zinc-400 ml-auto" />
                    </button>

                    <Link
                        href="/marketplace"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Browse Market
                    </Link>

                    <div className="border-t border-zinc-100 dark:border-white/5 pt-3 flex flex-col gap-2">
                        {user ? (
                            <>
                                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium text-sm rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5">
                                    <User className="h-4 w-4" />
                                    My Account
                                </Link>
                                <button onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} className="flex items-center gap-3 px-4 py-3 text-red-500 font-medium text-sm text-left rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10">
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </button>
                            </>
                        ) : (
                            !loading && (
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium text-sm rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5">
                                    <User className="h-4 w-4" />
                                    Sign In
                                </Link>
                            )
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

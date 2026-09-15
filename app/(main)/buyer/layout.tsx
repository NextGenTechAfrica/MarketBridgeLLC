'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarItem, QuickActionItem } from '@/components/sidebar';
import {
    Home,
    Compass,
    Package,
    ShoppingCart,
    MessageCircle,
    Heart,
    Wallet,
    Star,
    ShoppingBag,
    Search,
    MapPin,
    ChevronDown,
    Menu,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/notification/NotificationBell';
import { useLocation } from '@/contexts/LocationContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const buyerItems: SidebarItem[] = [
    { label: 'Home', href: '/buyer/dashboard', icon: Home },
    { label: 'Explore', href: '/marketplace', icon: Compass },
    { label: 'Orders', href: '/orders', icon: Package, badge: 3 },
    { label: 'Cart', href: '/cart', icon: ShoppingCart, badge: 3 },
    { label: 'Messages', href: '/chats', icon: MessageCircle, badge: 2 },
    { label: 'Wishlist', href: '/wishlist', icon: Heart },
    { label: 'Wallet', href: '/wallet', icon: Wallet },
    { label: 'Reviews & Ratings', href: '/reviews', icon: Star },
];

const buyerQuickActions: QuickActionItem[] = [
    { label: 'Buy Something', sublabel: 'Discover great deals', href: '/marketplace', icon: ShoppingBag },
    { label: 'Track Orders', sublabel: 'View your purchases', href: '/orders', icon: Search },
];

export default function BuyerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { setShowDialog } = useLocation();
    const [currentNode, setCurrentNode] = useState('Abuja');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('mb-preferred-node');
        if (saved && saved !== 'global') {
            setCurrentNode(saved);
        }
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF5500]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#F8F9FA] text-slate-900">
            {/* Desktop Fixed Dark Sidebar (Image 2 Left) */}
            <aside className="hidden md:block w-[260px] fixed h-full z-20">
                <Sidebar items={buyerItems} quickActions={buyerQuickActions} title="Buyer Dashboard" />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
                {/* Top Bar (Image 2 Left) */}
                <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8">
                    {/* Mobile Hamburger & Logo */}
                    <div className="flex items-center gap-3 md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-700">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-[260px] bg-[#0B0F19] border-r border-white/5">
                                <Sidebar items={buyerItems} quickActions={buyerQuickActions} title="Buyer Dashboard" />
                            </SheetContent>
                        </Sheet>
                        <span className="font-black text-lg text-slate-900">Market<span className="text-[#FF5500]">Bridge</span></span>
                    </div>

                    {/* Search Bar in Header */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:block">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for products, sellers, or categories..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/30 focus:border-[#FF5500]/50 transition-all"
                            />
                        </div>
                    </form>

                    {/* Right side widgets: Location, Notification, Cart, Avatar */}
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all text-xs font-semibold text-slate-700"
                            onClick={() => setShowDialog(true)}
                        >
                            <MapPin className="h-3.5 w-3.5 text-[#FF5500]" />
                            <span>{currentNode}</span>
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                        </button>

                        <NotificationBell />

                        <Link
                            href="/cart"
                            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF5500] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                0
                            </span>
                        </Link>

                        {/* Avatar */}
                        <Link href="/settings" className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#FF5500] to-amber-400 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white">
                                {(user?.displayName || user?.email || 'B').charAt(0).toUpperCase()}
                            </div>
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

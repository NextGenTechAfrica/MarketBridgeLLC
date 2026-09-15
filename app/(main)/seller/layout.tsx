'use client';

import React from 'react';
import { Sidebar } from '@/components/sidebar';
import {
    Home,
    Package,
    ShoppingBag,
    MessageSquare,
    DollarSign,
    TrendingUp,
    Sparkles,
    Star,
    Settings,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';

const sellerItems = [
    { label: 'Home', href: '/seller/dashboard', icon: Home },
    { label: 'My Listings', href: '/seller/listings', icon: Package },
    { label: 'Orders', href: '/seller/orders', icon: ShoppingBag, badge: 5 },
    { label: 'Messages', href: '/seller/chats', icon: MessageSquare, badge: 3 },
    { label: 'Earnings', href: '/wallet', icon: DollarSign },
    { label: 'Analytics', href: '/seller/dashboard#analytics', icon: TrendingUp },
    { label: 'Promotions', href: '/seller/upgrade', icon: Sparkles },
    { label: 'Reviews', href: '/seller/reviews', icon: Star },
    { label: 'Settings', href: '/seller/settings', icon: Settings },
];

export default function SellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    // The middleware handles protection, but we add an extra layer here
    if (!user || (user.role !== 'student_seller' && user.role !== 'seller')) {
        return <>{children}</>;
    }

    // MANDATORY EMAIL VERIFICATION GATE
    if (!user.email_verified && pathname !== '/verify-email') {
        router.push('/verify-email');
        return null;
    }

    return (
        <div className="flex min-h-screen bg-[#F8F9FA] text-slate-900">
            <div className="hidden md:block w-[260px] fixed h-full z-20">
                <Sidebar items={sellerItems} title="Seller Dashboard" />
            </div>
            <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
                <DashboardHeader title="Seller Dashboard" sidebarItems={sellerItems} />
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}

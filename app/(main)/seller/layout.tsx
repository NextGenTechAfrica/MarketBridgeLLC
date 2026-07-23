'use client';

import React from 'react';
import { Sidebar } from '@/components/sidebar';
import {
    LayoutDashboard,
    PlusCircle,
    Package,
    MessageSquare,
    DollarSign,
    Settings,
    CreditCard
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';

const sellerItems = [
    { label: 'Overview', href: '/seller/dashboard', icon: LayoutDashboard },
    { label: 'New Listing', href: '/seller/listings/new', icon: PlusCircle },
    { label: 'My Inventory', href: '/seller/listings', icon: Package },
    { label: 'Buyer Messages', href: '/seller/chats', icon: MessageSquare },
    { label: 'Sales & Orders', href: '/seller/orders', icon: DollarSign },
    { label: 'Subscription', href: '/seller/subscription', icon: CreditCard },
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
        // We don't redirect here to avoid race conditions with middleware
        // But we don't show the seller sidebar either
        return <>{children}</>;
    }

    // MANDATORY EMAIL VERIFICATION GATE
    if (!user.email_verified && pathname !== '/verify-email') {
        router.push('/verify-email');
        return null;
    }

    return (
        <div className="flex min-h-screen">
            <div className="hidden md:block w-64 fixed h-full z-10">
                <Sidebar items={sellerItems} title="Merchant Dashboard" />
            </div>
            <div className="flex-1 md:ml-64 flex flex-col">
                <DashboardHeader title="Merchant Dashboard" sidebarItems={sellerItems} />
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}

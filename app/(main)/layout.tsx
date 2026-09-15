'use client';

import React from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LocationConsentModal } from '@/components/LocationConsentModal';
import { Zap } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, sessionUser, loading } = useAuth();
    
    const isDashboard = pathname?.startsWith('/seller') || pathname?.startsWith('/settings') || pathname?.startsWith('/buyer');
    const isHome = pathname === '/';

    useEffect(() => {
        if (!loading && user) {
            // Social login users (Google/Facebook) are considered pre-verified or will be updated by the callback upsert.
            // Only redirect manual email signups to the verify-email page.
            const isSocialLogin = sessionUser?.app_metadata?.provider !== 'email';
            
    // Allow temporary sellers to bypass email verification gate
            const isTemp = (user as any).is_temporary_seller === true;
            if (['student_buyer', 'student_seller', 'buyer', 'seller'].includes(user.role) && !user.email_verified && !isSocialLogin && !isTemp) {
                router.push('/verify-email');
            }
        }
    }, [user, loading, router, sessionUser, pathname]);

    return (
        <div className="flex flex-col min-h-screen">
            <LocationConsentModal />

            {!isDashboard && <Header />}
            <main className={`flex-1 pt-16 ${!isDashboard ? 'pb-16 md:pb-0' : ''}`}>{children}</main>
            {!isDashboard && <Footer />}
            {!isDashboard && <MobileBottomNav />}
        </div>
    );
}

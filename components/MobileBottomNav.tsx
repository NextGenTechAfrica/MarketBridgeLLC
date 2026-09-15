'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ShoppingCart, User, Crown, MessageCircle, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

export const MobileBottomNav = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const { itemCount } = useCart();

    // Don't show on certain pages
    const isProtectedPath = pathname?.startsWith('/admin') || pathname?.startsWith('/seller');
    if (isProtectedPath) {
        return null;
    }

    const navItems = [
        {
            href: '/',
            label: 'Home',
            icon: Home,
            show: true,
        },
        {
            href: '/marketplace',
            label: 'Explore',
            icon: Search,
            show: true,
        },
        {
            href: '/chats',
            label: 'Messages',
            icon: MessageCircle,
            show: !!user,
        },
        {
            href: '/cart',
            label: 'Cart',
            icon: ShoppingCart,
            show: (user?.role === 'student_buyer' || user?.role === 'buyer') || !user,
            badge: itemCount,
        },
        {
            href: (() => {
                if (!user) return '/login';
                const role = user.role;
                if (role === 'ceo') return '/admin/ceo';
                if (role === 'operations_admin') return '/admin/operations';
                if (role === 'marketing_admin') return '/admin/marketing';
                if (role === 'systems_admin' || role === 'technical_admin') return '/admin/systems';
                if (role === 'it_support') return '/admin/it-support';
                if (role === 'student_seller' || role === 'seller') return '/seller/dashboard';
                return '/orders';
            })(),
            label: (user && ['ceo', 'operations_admin', 'marketing_admin', 'systems_admin', 'it_support', 'technical_admin', 'admin'].includes(user.role)) ? 'Admin' : (user ? 'Account' : 'Login'),
            icon: (user && ['ceo', 'operations_admin', 'marketing_admin', 'systems_admin', 'it_support', 'technical_admin', 'admin'].includes(user.role)) ? Crown : User,
            show: true,
        },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white dark:bg-[#0B1120] border-t border-zinc-200 dark:border-white/5 h-[72px] px-2 safe-area-bottom">
            <div className="flex h-full items-center justify-around max-w-lg mx-auto">
                {navItems.filter(item => item.show).map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 transition-all relative py-2 px-3 rounded-xl min-w-[56px]",
                                isActive ? "text-[#FF6200]" : "text-zinc-400 dark:text-zinc-500"
                            )}
                        >
                            <div className="relative">
                                <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_2px_4px_rgba(255,98,0,0.3)]")} />
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 h-4 w-4 rounded-full bg-[#FF6200] text-[9px] font-bold text-white flex items-center justify-center">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium",
                                isActive && "font-semibold"
                            )}>{item.label}</span>

                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#FF6200] rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

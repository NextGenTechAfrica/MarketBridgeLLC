'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface SidebarItem {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
}

interface SidebarProps {
    items: SidebarItem[];
    title?: string;
    className?: string;
}

export function Sidebar({ items, title, className }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <div className={cn(
            "pb-6 min-h-screen flex flex-col transition-colors duration-300 w-[260px]",
            "mb-sidebar",
            className
        )}>
            {/* Logo Area */}
            <div className="px-6 pt-7 pb-5">
                <Logo showText={true} className="scale-100" variant="sidebar" />
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {items.map((item) => {
                    const isExact = pathname === item.href;
                    const hasBetterMatch = items.some(otherItem =>
                        otherItem.href !== item.href &&
                        pathname?.startsWith(otherItem.href) &&
                        otherItem.href.length > item.href.length
                    );
                    const isSubPath = pathname?.startsWith(item.href) &&
                        item.href !== '/' &&
                        item.href !== '/admin' &&
                        item.href !== '/ceo' &&
                        item.href !== '/seller/dashboard' &&
                        !hasBetterMatch;
                    const isActive = isExact || isSubPath;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "mb-sidebar-item relative",
                                isActive && "mb-sidebar-item-active"
                            )}
                        >
                            <item.icon className={cn(
                                "h-[18px] w-[18px] shrink-0",
                                isActive ? "text-white" : "opacity-60"
                            )} />
                            <span className="truncate">{item.label}</span>
                            {item.badge && item.badge > 0 && (
                                <span className={cn(
                                    "ml-auto text-[11px] font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-[#FF6200]/15 text-[#FF6200]"
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Quick Actions Section (optional, for buyer sidebar) */}
            {title && (
                <div className="px-4 mt-2 mb-4">
                    <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-40">
                        Quick Actions
                    </p>
                </div>
            )}

            {/* User Profile / Logout */}
            <div className="mt-auto px-4 pt-4 border-t border-white/5">
                {user && (
                    <div className="mb-3 px-4 py-3 rounded-xl flex items-center gap-3 bg-white/5">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#FF6200] to-amber-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {user.displayName?.split(' ')[0] || 'User'}
                            </p>
                            <p className="text-[11px] opacity-50 truncate">
                                {user.role === 'student_seller' || user.role === 'seller' ? 'Seller' : 'Buyer'}
                            </p>
                        </div>
                        <Link href="/settings" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <Settings className="h-4 w-4 opacity-50 hover:opacity-100" />
                        </Link>
                    </div>
                )}
                <button
                    className="mb-sidebar-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => logout()}
                >
                    <LogOut className="h-[18px] w-[18px] shrink-0" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
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

export interface QuickActionItem {
    label: string;
    sublabel: string;
    href: string;
    icon: React.ElementType;
}

interface SidebarProps {
    items: SidebarItem[];
    quickActions?: QuickActionItem[];
    title?: string;
    className?: string;
}

export function Sidebar({ items, quickActions, title, className }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <div className={cn(
            "pb-6 min-h-screen flex flex-col transition-colors duration-300 w-[260px] bg-[#0B0F19] text-white border-r border-white/5",
            className
        )}>
            {/* Logo Area */}
            <div className="px-6 pt-7 pb-6">
                <Logo showText={true} size="md" variant="sidebar" />
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
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
                        item.href !== '/buyer/dashboard' &&
                        !hasBetterMatch;
                    const isActive = isExact || isSubPath;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-[#FF5500] text-white font-semibold shadow-md shadow-[#FF5500]/25"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn(
                                "h-[18px] w-[18px] shrink-0",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                            )} />
                            <span className="truncate">{item.label}</span>
                            {item.badge && item.badge > 0 && (
                                <span className={cn(
                                    "ml-auto text-[11px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center",
                                    isActive
                                        ? "bg-white/25 text-white"
                                        : "bg-[#FF5500]/15 text-[#FF5500]"
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {/* Quick Actions Section (from Image 2) */}
                {quickActions && quickActions.length > 0 && (
                    <div className="pt-6 pb-2">
                        <p className="px-4 mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Quick Actions
                        </p>
                        <div className="space-y-1.5">
                            {quickActions.map((qa, i) => (
                                <Link
                                    key={i}
                                    href={qa.href}
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-[#FF5500] flex items-center justify-center shrink-0 group-hover:bg-[#FF5500] group-hover:text-white transition-colors">
                                        <qa.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                                            {qa.label}
                                        </span>
                                        <span className="text-[10px] text-slate-400 truncate">
                                            {qa.sublabel}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* User Profile / Logout */}
            <div className="mt-auto px-3 pt-3 border-t border-white/5">
                {user && (
                    <div className="mb-2 px-3 py-2.5 rounded-xl flex items-center gap-3 bg-white/[0.04] border border-white/5">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#FF5500] to-amber-400 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                                {user.displayName || 'User'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                                {user.role === 'student_seller' || user.role === 'seller' ? 'Student Seller' : 'Buyer'}
                            </p>
                        </div>
                        <Link
                            href={user.role === 'student_seller' || user.role === 'seller' ? '/seller/settings' : '/settings'}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                        </Link>
                    </div>
                )}
                <button
                    className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    onClick={() => logout()}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
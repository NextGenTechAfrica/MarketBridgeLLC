'use client';
import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, User, Bell, LogOut, Globe, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar, SidebarItem } from '@/components/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/notification/NotificationBell';

interface DashboardHeaderProps {
    title: string;
    sidebarItems: SidebarItem[];
}

export function DashboardHeader({ title, sidebarItems }: DashboardHeaderProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-zinc-200 dark:border-white/5 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md px-4 md:px-8">
            <div className="flex items-center gap-4">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden text-foreground h-10 w-10 rounded-xl">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[260px] bg-background border-r border-border">
                        <Sidebar items={sidebarItems} title={title} className="border-0 shadow-none" />
                    </SheetContent>
                </Sheet>
                <div className="flex flex-col">
                    <h1 className="text-lg md:text-xl font-bold text-foreground">
                        {title}
                    </h1>
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs hidden md:block">
                        Logged in as <span className="font-semibold text-foreground">{user?.displayName}</span>
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Link href="/" className="hidden md:flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-primary transition-all text-xs font-medium bg-zinc-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10">
                    <Globe className="h-3.5 w-3.5" />
                    Marketplace
                </Link>

                <ThemeToggle />
                {user && <NotificationBell />}

                <div className="flex items-center gap-3 pl-3 border-l border-zinc-200 dark:border-white/10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#FF6200] to-amber-400 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition-transform">
                                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={12} className="w-56 bg-white dark:bg-[#0F1A2E] border border-zinc-200 dark:border-white/10 p-1.5 z-[999] rounded-xl shadow-2xl">
                            <div className="px-3 py-3 mb-1 border-b border-zinc-100 dark:border-white/5">
                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Your Profile</p>
                                <p className="text-sm font-bold truncate text-foreground">{user?.displayName}</p>
                            </div>
                            <DropdownMenuItem asChild className="focus:bg-zinc-100 dark:focus:bg-white/5 rounded-lg cursor-pointer py-2.5">
                                <Link href="/settings" className="flex items-center gap-3 w-full px-2">
                                    <User className="h-4 w-4 text-zinc-500" />
                                    <span className="text-sm font-medium">Account Settings</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
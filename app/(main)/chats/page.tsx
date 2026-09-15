'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Search, Loader2, ArrowLeft, ShieldCheck, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Chat {
    id: string;
    participant1_id: string;
    participant2_id: string;
    listing_id: string | null;
    last_message: string | null;
    last_message_at: string | null;
    created_at: string;
    other_user?: {
        id: string;
        display_name: string;
        photo_url: string | null;
        role: string;
        avatar_url?: string;
    };
    listing_title?: string;
    unread_count?: number;
}

export default function ChatsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/chats');
            return;
        }

        if (user) {
            fetchChats();
            const unsubscribe = subscribeToChats();
            return () => {
                unsubscribe();
            };
        }
    }, [user, authLoading]);

    const fetchChats = async () => {
        if (!user) return;

        try {
            const { data: asP1, error: e1 } = await supabase
                .from('conversations')
                .select(`*, other_user:users!participant2_id(id, display_name, photo_url, role, avatar_url), listing:listings(title)`)
                .eq('participant1_id', user.id)
                .order('last_message_at', { ascending: false });

            const { data: asP2, error: e2 } = await supabase
                .from('conversations')
                .select(`*, other_user:users!participant1_id(id, display_name, photo_url, role, avatar_url), listing:listings(title)`)
                .eq('participant2_id', user.id)
                .order('last_message_at', { ascending: false });

            if (e1 || e2) throw (e1 || e2);

            let allChats = [...(asP1 || []), ...(asP2 || [])];

            allChats.sort((a, b) => {
                const dateA = new Date(a.last_message_at || a.created_at).getTime();
                const dateB = new Date(b.last_message_at || b.created_at).getTime();
                return dateB - dateA;
            });

            // Fetch unread counts
            let unreadMap: Record<string, number> = {};
            try {
                const { data: unreadData } = await supabase.rpc('get_unread_counts', { p_user_id: user.id });
                if (unreadData) {
                    for (const row of unreadData) {
                        unreadMap[row.conversation_id] = row.unread_count;
                    }
                }
            } catch {
                // RPC fallback
            }

            const processedChats = allChats.map(c => ({
                ...c,
                listing_title: c.listing?.title,
                other_user: c.other_user ? {
                    ...c.other_user,
                    photo_url: c.other_user.avatar_url || c.other_user.photo_url
                } : undefined,
                unread_count: unreadMap[c.id] || 0
            }));

            setChats(processedChats);
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToChats = () => {
        if (!user) return () => {};

        const channel = supabase
            .channel('chats_list_realtime')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
            }, (payload: any) => {
                const conv = payload.new;
                if (conv.participant1_id === user.id || conv.participant2_id === user.id) {
                    fetchChats();
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'conversations',
            }, (payload: any) => {
                const conv = payload.new;
                if (conv.participant1_id === user.id || conv.participant2_id === user.id) {
                    fetchChats();
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, () => {
                fetchChats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const filteredChats = chats.filter((chat) =>
        chat.other_user?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.listing_title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin h-8 w-8 text-[#FF6200]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
            <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In-App Messaging</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Conversations
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Chat securely with buyers and sellers on MarketBridge.
                        </p>
                    </div>

                    <Link href="/buyer/dashboard">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs">
                            <ArrowLeft className="mr-2 h-3 w-3" /> Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations by user or listing..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-card border-border rounded-xl text-xs focus:ring-[#FF6200] focus:border-[#FF6200]"
                    />
                </div>

                {/* Chats List */}
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                    {filteredChats.length === 0 ? (
                        <div className="text-center py-16 px-4 space-y-4">
                            <div className="h-14 w-14 rounded-2xl bg-[#FF6200]/10 flex items-center justify-center mx-auto text-[#FF6200]">
                                <MessageSquare className="h-7 w-7" />
                            </div>
                            <h3 className="text-base font-bold text-foreground">No conversations found</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                When you contact a seller on a listing, your conversation will appear here.
                            </p>
                            <Link href="/marketplace">
                                <Button className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl mt-2">
                                    Explore Marketplace
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredChats.map((chat) => (
                                <Link
                                    key={chat.id}
                                    href={`/chats/${chat.id}`}
                                    className="flex items-center gap-4 p-4 sm:p-5 hover:bg-muted/50 transition-colors group"
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <Avatar className="h-12 w-12 border border-border">
                                            <AvatarImage src={chat.other_user?.photo_url || ''} />
                                            <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
                                                {chat.other_user?.display_name?.charAt(0).toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        {chat.unread_count! > 0 && (
                                            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-[#FF6200] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                {chat.unread_count}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 truncate">
                                                <h4 className="font-bold text-sm text-foreground truncate group-hover:text-[#FF6200] transition-colors">
                                                    {chat.other_user?.display_name || 'User'}
                                                </h4>
                                                {['seller', 'student_seller'].includes(chat.other_user?.role || '') && (
                                                    <Badge className="bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20 text-[9px] px-1.5 py-0 h-4">
                                                        Seller
                                                    </Badge>
                                                )}
                                            </div>

                                            {chat.last_message_at && (
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                    {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>

                                        {chat.listing_title && (
                                            <p className="text-[11px] font-semibold text-[#FF6200] truncate">
                                                Item: {chat.listing_title}
                                            </p>
                                        )}

                                        <p className={cn(
                                            "text-xs line-clamp-1",
                                            chat.unread_count! > 0 ? "font-bold text-foreground" : "text-muted-foreground"
                                        )}>
                                            {chat.last_message || 'No messages yet'}
                                        </p>
                                    </div>

                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { startConversation } from '@/lib/chat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Loader2, Package, Clock, CheckCircle, XCircle, Truck,
    ArrowLeft, MessageCircle, AlertCircle, ChevronRight, ShieldCheck, MapPin
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Order {
    id: string;
    buyer_id: string;
    seller_id: string;
    listing_id: string;
    status: 'pending' | 'paid' | 'confirmed' | 'disputed' | 'completed' | 'cancelled';
    amount: number;
    shipping_address: string | null;
    phone_number: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    listing?: {
        id: string;
        title: string;
        images: string[];
        price: number;
    };
    seller?: {
        id: string;
        display_name: string;
        photo_url: string | null;
    };
}

export default function OrdersPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/orders');
            return;
        }

        if (user) {
            fetchOrders();
            const unsubscribe = subscribeToOrders();
            return () => {
                unsubscribe();
            };
        }
    }, [user, authLoading]);

    const fetchOrders = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    listing:listings(id, title, images, price),
                    seller:users!orders_seller_id_fkey(id, display_name, photo_url)
                `)
                .eq('buyer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setOrders(data || []);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToOrders = () => {
        if (!user) return () => {};

        const subscription = supabase
            .channel('orders_buyer_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `buyer_id=eq.${user.id}`,
                },
                () => {
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const handleConfirmDelivery = (order: Order) => {
        setSelectedOrder(order);
        setShowConfirmDialog(true);
    };

    const confirmDelivery = async () => {
        if (!selectedOrder) return;

        setConfirmingOrder(selectedOrder.id);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            try {
                const conversationId = await startConversation(user!.id, selectedOrder.seller_id, selectedOrder.listing_id);

                await supabase.from('messages').insert({
                    conversation_id: conversationId,
                    sender_id: user!.id,
                    content: `✅ Order #${selectedOrder.id.slice(-8).toUpperCase()} confirmed! Payment of ₦${selectedOrder.amount.toLocaleString()} has been released.`,
                });
            } catch (chatErr) {
                console.error('Failed to notify seller:', chatErr);
            }

            setShowConfirmDialog(false);
            setSelectedOrder(null);
            toast('Order completed! Escrow funds released to seller.', 'success');
            fetchOrders();
        } catch (err) {
            console.error('Failed to confirm delivery:', err);
            toast('Failed to confirm delivery. Please try again.', 'error');
        } finally {
            setConfirmingOrder(null);
        }
    };

    const openChat = async (order: Order) => {
        try {
            const conversationId = await startConversation(user!.id, order.seller_id, order.listing_id);
            router.push(`/chats/${conversationId}`);
        } catch (err) {
            console.error('Failed to open chat:', err);
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'active') return ['pending', 'paid', 'confirmed'].includes(order.status);
            if (statusFilter === 'completed') return order.status === 'completed';
            if (statusFilter === 'cancelled') return ['cancelled', 'disputed'].includes(order.status);
            return true;
        });
    }, [orders, statusFilter]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Delivered & Completed
                    </Badge>
                );
            case 'paid':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Funds in Escrow
                    </Badge>
                );
            case 'confirmed':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs flex items-center gap-1">
                        <Truck className="h-3 w-3" /> In Transit / Ready
                    </Badge>
                );
            case 'disputed':
                return (
                    <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Under Dispute
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-xs flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Cancelled / Refunded
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 text-xs capitalize flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {status}
                    </Badge>
                );
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
            <div className="container max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Buyer Orders</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            My Orders & Escrow
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Track purchases, inspect items, and release payments safely.
                        </p>
                    </div>

                    <Link href="/buyer/dashboard">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs">
                            <ArrowLeft className="mr-2 h-3 w-3" /> Return to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {[
                        { key: 'all', label: 'All Orders', count: orders.length },
                        { key: 'active', label: 'Active & In Escrow', count: orders.filter(o => ['pending', 'paid', 'confirmed'].includes(o.status)).length },
                        { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
                        { key: 'cancelled', label: 'Cancelled / Disputed', count: orders.filter(o => ['cancelled', 'disputed'].includes(o.status)).length },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key as any)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2",
                                statusFilter === tab.key
                                    ? "bg-[#FF6200] text-white shadow-sm"
                                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            )}
                        >
                            <span>{tab.label}</span>
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded-full",
                                statusFilter === tab.key ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4 shadow-sm">
                        <div className="h-16 w-16 rounded-2xl bg-[#FF6200]/10 flex items-center justify-center mx-auto text-[#FF6200]">
                            <Package className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No orders in this category</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                            Browse verified listings on MarketBridge to start shopping with escrow protection.
                        </p>
                        <Link href="/marketplace">
                            <Button className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl">
                                Explore Marketplace
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-card border border-border hover:border-[#FF6200]/30 rounded-3xl p-5 sm:p-6 transition-all shadow-sm space-y-5"
                            >
                                {/* Order Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">Order ID:</span>
                                        <Link href={`/orders/${order.id}`} className="font-mono font-bold text-sm text-foreground hover:text-[#FF6200] transition-colors">
                                            #{order.id.slice(-8).toUpperCase()}
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(order.status)}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Body */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    {/* Item Image & Title */}
                                    <div className="md:col-span-7 flex items-center gap-4">
                                        <div className="relative h-20 w-20 rounded-2xl bg-muted overflow-hidden shrink-0 border border-border">
                                            {order.listing?.images?.[0] ? (
                                                <Image
                                                    src={order.listing.images[0]}
                                                    alt={order.listing.title || 'Product'}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <Package className="h-8 w-8 opacity-30" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1 min-w-0">
                                            <Link href={`/orders/${order.id}`} className="font-bold text-base text-foreground hover:text-[#FF6200] transition-colors line-clamp-1">
                                                {order.listing?.title || 'Marketplace Item'}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                Seller: <span className="font-semibold text-foreground">{order.seller?.display_name || 'Verified Merchant'}</span>
                                            </p>
                                            <p className="text-sm font-extrabold text-[#FF6200]">
                                                ₦{order.amount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
                                        {order.status === 'confirmed' || order.status === 'paid' ? (
                                            <Button
                                                onClick={() => handleConfirmDelivery(order)}
                                                disabled={confirmingOrder === order.id}
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                                            >
                                                {confirmingOrder === order.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                ) : (
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                                )}
                                                Confirm Receipt
                                            </Button>
                                        ) : null}

                                        <Button
                                            onClick={() => openChat(order)}
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl text-xs"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                            Message
                                        </Button>

                                        {['paid', 'confirmed', 'completed'].includes(order.status) && (
                                            <Link href={`/orders/${order.id}/dispute`}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-xl text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                                >
                                                    Dispute
                                                </Button>
                                            </Link>
                                        )}

                                        <Link href={`/orders/${order.id}`}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl text-xs hover:border-[#FF6200] hover:text-[#FF6200]"
                                            >
                                                Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirm Delivery Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="rounded-2xl max-w-md bg-card border-border text-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold">Confirm Item Delivery & Release Escrow</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            By confirming delivery, you acknowledge that you have received the item in satisfactory condition. The escrow funds (₦{selectedOrder?.amount.toLocaleString()}) will be immediately released to the seller.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelivery}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                        >
                            Confirm & Release Payment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

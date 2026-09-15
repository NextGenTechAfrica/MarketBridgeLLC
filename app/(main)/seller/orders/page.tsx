'use client';

import React, { useState, useEffect } from 'react';
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
    Loader2,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    MessageCircle,
    AlertCircle,
    ChevronRight,
    ShieldCheck
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

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user) {
            fetchOrders();
            subscribeToOrders();
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
        if (!user) return;

        const subscription = supabase
            .channel('orders')
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

    const handleConfirmDelivery = async (order: Order) => {
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

            toast('Delivery confirmed and funds released!', 'success');
            setShowConfirmDialog(false);
            setSelectedOrder(null);
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
            router.push(`/seller/chats/${conversationId}`);
        } catch (err) {
            console.error('Failed to open chat:', err);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-semibold"><Clock className="h-3 w-3 mr-1" /> Awaiting Payment</Badge>;
            case 'paid':
                return <Badge className="bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20 text-[10px] font-semibold"><ShieldCheck className="h-3 w-3 mr-1" /> Escrow Secured</Badge>;
            case 'confirmed':
                return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-semibold"><Truck className="h-3 w-3 mr-1" /> In Transit</Badge>;
            case 'completed':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold"><CheckCircle className="h-3 w-3 mr-1" /> Delivered</Badge>;
            case 'disputed':
                return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] font-semibold"><AlertCircle className="h-3 w-3 mr-1" /> Disputed</Badge>;
            case 'cancelled':
                return <Badge className="bg-muted text-muted-foreground border-border text-[10px] font-semibold"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
            default:
                return <Badge className="text-[10px] font-semibold">{status}</Badge>;
        }
    };

    if (authLoading || loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-28 bg-card border border-border rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Sales & Orders</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Track transactions and fulfillment progress with escrow protection.
                        </p>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="text-center py-20 space-y-4 bg-card border border-dashed border-border rounded-2xl">
                        <Package className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-foreground">No Orders Found</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Transaction records and order fulfillments will appear here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-card border border-border hover:border-[#FF6200]/30 rounded-2xl p-5 shadow-sm transition-all space-y-4"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <span>Order <strong className="text-foreground">#{order.id.slice(-8).toUpperCase()}</strong></span>
                                        <span>•</span>
                                        <span>{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div>{getStatusBadge(order.status)}</div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                                            {order.listing?.images?.[0] ? (
                                                <Image
                                                    src={order.listing.images[0]}
                                                    alt={order.listing.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                    <Package className="h-6 w-6" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-bold text-sm text-foreground line-clamp-1">
                                                {order.listing?.title || 'Product'}
                                            </h3>
                                            <p className="text-xs font-semibold text-[#FF6200]">
                                                ₦{order.amount.toLocaleString()}
                                            </p>
                                            {order.seller && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Merchant: {order.seller.display_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        {order.status === 'confirmed' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleConfirmDelivery(order)}
                                                disabled={confirmingOrder === order.id}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                                            >
                                                {confirmingOrder === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Receipt'}
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openChat(order)}
                                            className="rounded-xl text-xs gap-1.5"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" /> Message
                                        </Button>

                                        {['paid', 'confirmed', 'completed'].includes(order.status) && (
                                            <Link href={`/seller/orders/${order.id}/dispute`}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-xl text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                                >
                                                    Dispute
                                                </Button>
                                            </Link>
                                        )}

                                        <Link href={`/seller/orders/${order.id}`}>
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
                        <AlertDialogTitle className="text-base font-bold">Confirm Delivery & Release Escrow</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            By confirming delivery, you authorize the permanent release of ₦{selectedOrder?.amount.toLocaleString()} to the seller.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelivery}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                        >
                            Confirm & Release Funds
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

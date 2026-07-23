'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { startConversation } from '@/lib/chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Package, Clock, CheckCircle, XCircle, Truck, ArrowLeft, MessageCircle, AlertCircle, ChevronRight } from 'lucide-react';
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
            // Update order status to completed
            const { error } = await supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            // Send notification message to seller
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
            fetchOrders();
        } catch (err) {
            console.error('Failed to confirm delivery:', err);
            toast('Failed to confirm delivery. Please try again.', 'error');
        } finally {
            setConfirmingOrder(null);
        }
    };

    // ... (getStatusIcon, getStatusVariant, getStatusText skipped as they are unchanged)

    const openChat = async (order: Order) => {
        try {
            const conversationId = await startConversation(user!.id, order.seller_id, order.listing_id);
            router.push(`/seller/chats/${conversationId}`);
        } catch (err) {
            console.error('Failed to open chat:', err);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4" />;
            case 'paid':
                return <AlertCircle className="h-4 w-4" />;
            case 'disputed':
                return <AlertCircle className="h-4 w-4 text-destructive" />;
            case 'confirmed':
                return <Truck className="h-4 w-4" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'pending':
                return 'secondary';
            case 'paid':
                return 'default';
            case 'disputed':
                return 'destructive';
            case 'confirmed':
                return 'default';
            case 'completed':
                return 'outline';
            case 'cancelled':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Waiting for Payment';
            case 'paid':
                return 'Payment in Escrow';
            case 'disputed':
                return 'Under Dispute';
            case 'confirmed':
                return 'In Transit';
            case 'completed':
                return 'Delivered/Released';
            case 'cancelled':
                return 'Cancelled/Refunded';
            default:
                return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };



    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 relative selection:bg-[#FF6200] selection:text-black pt-28 pb-32">
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none z-0" />

            <div className="container mx-auto px-6 max-w-5xl relative z-10">
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-heading">Secure Escrow Tracking</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic font-heading">
                            My <span className="text-[#FF6200]">Orders</span>
                        </h1>
                        <p className="text-zinc-500 font-medium italic">
                            Tracking <span className="text-zinc-900 font-bold">{orders.length} active cycles</span> in the trust System.
                        </p>
                    </div>

                    <Link href="/">
                        <Button variant="outline" className="h-12 border-zinc-200 text-zinc-500 hover:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all font-heading">
                            <ArrowLeft className="mr-2 h-3 w-3" /> Return Home
                        </Button>
                    </Link>
                </div>
                {orders.length === 0 ? (
                    <div className="text-center py-40 space-y-8 bg-white border border-zinc-200 rounded-[3rem]">
                        <div className="h-24 w-24 rounded-full bg-[#FF6200]/10 flex items-center justify-center mx-auto border border-[#FF6200]/20">
                            <Package className="h-10 w-10 text-[#FF6200]" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic font-heading">No cycles found</h3>
                            <p className="text-zinc-500 font-medium mt-2">Start shopping to initiate the trust System.</p>
                        </div>
                        <Button asChild className="h-14 px-10 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest font-heading border-none">
                            <Link href="/listings">Launch Marketplace</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white border border-zinc-200 shadow-sm p-10 rounded-[3rem] border-zinc-100 hover:border-[#FF6200]/20 transition-all duration-500 overflow-hidden">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-zinc-100">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cycle ID</p>
                                        <Link href={`/seller/orders/${order.id}`} className="hover:text-[#FF6200] transition-colors">
                                            <h3 className="text-3xl font-black uppercase tracking-tighter italic font-heading">#{order.id.slice(-8).toUpperCase()}</h3>
                                        </Link>
                                    </div>
                                    <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 ${order.status === 'completed' ? 'bg-[#FF6200]/10 border-[#FF6200]/20 text-[#FF6200]' :
                                        order.status === 'disputed' ? 'bg-[#FF6200]/10 border-[#FF6200]/20 text-[#FF6200]' :
                                            order.status === 'cancelled' ? 'bg-zinc-200 border-zinc-300 text-zinc-500' :
                                                'bg-[#FF6200]/10 border-[#FF6200]/20 text-[#FF6200]'
                                        }`}>
                                        {getStatusIcon(order.status)}
                                        <span className="text-xs font-black uppercase tracking-widest leading-none">{getStatusText(order.status)}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                                    <div className="md:col-span-3 space-y-8">
                                        <div className="flex gap-8 group">
                                            <div className="h-32 w-32 shrink-0 rounded-3xl overflow-hidden border border-zinc-200 relative">
                                                {order.listing?.images?.[0] ? (
                                                    <Image
                                                        src={order.listing.images[0]}
                                                        alt={order.listing.title ?? 'Product image'}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full bg-zinc-100 flex items-center justify-center">
                                                        <Package className="h-8 w-8 text-zinc-900/10" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="space-y-2">
                                                    <Link href={`/seller/orders/${order.id}`} className="hover:text-[#FF6200] transition-colors block">
                                                        <h4 className="text-2xl font-black uppercase tracking-tighter italic font-heading line-clamp-1">{order.listing?.title || 'Product'}</h4>
                                                    </Link>
                                                    <p className="text-xs font-black uppercase tracking-widest text-[#FF6200] italic">
                                                        Auth Date: {new Date(order.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                {order.seller && (
                                                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl w-fit pr-6">
                                                        <div className="h-8 w-8 rounded-full bg-[#FF6200]/10 flex items-center justify-center border border-[#FF6200]/20 overflow-hidden">
                                                            {order.seller.photo_url ? (
                                                                <img src={order.seller.photo_url} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <MessageCircle className="h-4 w-4 text-[#FF6200]" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest italic">{order.seller.display_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {order.shipping_address && (
                                            <div className="bg-[#FAFAFA]/50 border border-zinc-100 p-6 rounded-3xl space-y-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Destination Endpoint</p>
                                                <p className="text-sm text-zinc-600 font-medium italic">{order.shipping_address}</p>
                                                {order.phone_number && (
                                                    <div className="flex items-center gap-2 text-[#FF6200] text-[10px] font-black uppercase tracking-widest">
                                                        <MessageCircle className="h-3 w-3" />
                                                        {order.phone_number}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-8">
                                        <div className="text-right space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cycle Value</p>
                                            <p className="text-4xl font-black text-[#FF6200] italic font-heading tracking-tighter">₦{order.amount.toLocaleString()}</p>
                                        </div>
                                        <Button
                                            asChild
                                            className="w-full h-12 bg-black text-white hover:bg-zinc-800 rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading border-none flex items-center justify-center gap-2"
                                        >
                                            <Link href={`/seller/orders/${order.id}`}>
                                                Track Order <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        {/* Escrow Status & Actions */}
                                        {(order.status === 'pending') && (
                                            <div className="bg-[#FF6200]/5 border border-[#FF6200]/20 rounded-[2rem] p-8 space-y-4">
                                                <div className="flex items-center gap-3 text-[#FF6200]">
                                                    <Clock className="h-5 w-5 animate-pulse" />
                                                    <span className="text-xs font-black uppercase tracking-widest">Awaiting Verification</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 leading-relaxed font-medium italic">
                                                    Our System is currently verifying the funds for this cycle. Once verified, the amount will be held in secure escrow and released on delivery.
                                                </p>
                                            </div>
                                        )}

                                        {order.status === 'paid' && (
                                            <div className="space-y-6">
                                                <div className="bg-[#FF6200]/10 border border-[#FF6200]/30 rounded-[2rem] p-8 space-y-4">
                                                    <div className="flex items-center gap-3 text-[#FF6200]">
                                                        <AlertCircle className="h-5 w-5" />
                                                        <span className="text-xs font-black uppercase tracking-widest">System: Escrow Active</span>
                                                    </div>
                                                    <p className="text-xs text-zinc-600 leading-relaxed font-medium italic">
                                                        ₦{order.amount.toLocaleString()} is securely held in escrow. The seller has been notified to dispatch. Funds will only be released on delivery.
                                                    </p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => openChat(order)}
                                                        className="flex-1 h-14 border-zinc-200 hover:border-[#FF6200]/40 rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading"
                                                    >
                                                        <MessageCircle className="mr-2 h-4 w-4" />
                                                        Contact Seller
                                                    </Button>
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        className="flex-1 h-14 text-zinc-500 hover:text-[#FF6200] hover:bg-[#FF6200]/5 rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading"
                                                    >
                                                        <Link href={`/seller/orders/${order.id}/dispute`}>
                                                            <AlertCircle className="mr-2 h-4 w-4" />
                                                            Open Dispute
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <div className="space-y-6">
                                                <div className="bg-[#FF6200]/20 border border-[#FF6200]/40 rounded-[2rem] p-8 space-y-4">
                                                    <div className="flex items-center gap-3 text-[#FF6200]">
                                                        <Truck className="h-5 w-5" />
                                                        <span className="text-xs font-black uppercase tracking-widest">System: In Transit</span>
                                                    </div>
                                                    <p className="text-xs text-zinc-900 leading-relaxed font-bold italic">
                                                        Shipment confirmed. Verify receipt to release the payload.
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    <Button
                                                        onClick={() => handleConfirmDelivery(order)}
                                                        disabled={confirmingOrder === order.id}
                                                        className="w-full h-16 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest font-heading border-none shadow-[0_20px_40px_rgba(255,98,0,0.2)]"
                                                    >
                                                        {confirmingOrder === order.id ? (
                                                            <>
                                                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                                                Authorizing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="mr-3 h-5 w-5" />
                                                                Confirm Receipt
                                                            </>
                                                        )}
                                                    </Button>
                                                    <div className="flex gap-4">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => openChat(order)}
                                                            className="flex-1 h-14 border-zinc-100 text-zinc-500 rounded-2xl"
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            asChild
                                                            variant="ghost"
                                                            className="flex-[3] h-14 text-zinc-900/30 hover:text-[#FF6200] font-black uppercase tracking-widest text-[9px]"
                                                        >
                                                            <Link href={`/seller/orders/${order.id}/dispute`}>
                                                                Flag issues/Dispute
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {order.status === 'completed' && (
                                            <div className="bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-[2rem] p-8 space-y-2">
                                                <div className="flex items-center gap-3 text-[#FF6200]">
                                                    <CheckCircle className="h-5 w-5" />
                                                    <span className="text-xs font-black uppercase tracking-widest">System Terminated: Successful</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium italic">
                                                    Payload of ₦{order.amount.toLocaleString()} has been released to the seller.
                                                </p>
                                            </div>
                                        )}
                                        {order.status === 'disputed' && (
                                            <div className="bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-[2rem] p-8 space-y-4">
                                                <div className="flex items-center gap-3 text-[#FF6200]">
                                                    <AlertCircle className="h-5 w-5" />
                                                    <span className="text-xs font-black uppercase tracking-widest">System Intervention: Active Dispute</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 leading-relaxed font-medium italic">
                                                    Trust & Safety team is reviewing the cycle logs. Funds are held in cold storage until resolution.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {order.notes && (
                                    <div className="mt-8 pt-8 border-t border-zinc-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-900/30 mb-2">Merchant Notes</p>
                                        <p className="text-xs text-zinc-500 italic leading-relaxed">{order.notes}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="bg-zinc-100 border-zinc-200 rounded-[2rem] p-10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Authorize Payload Release?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-500 font-medium italic py-4">
                            You are about to authorize the permanent release of <span className="text-zinc-900 font-bold">₦{selectedOrder?.amount.toLocaleString()}</span> to the seller.
                            Confirm only if the asset has been received in the expected condition.
                            <br /><br />
                            <span className="text-[#FF6200] uppercase text-[10px] font-black tracking-widest">System Warning: This action is non-reversible.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-4">
                        <AlertDialogCancel className="h-14 px-8 border-zinc-200 text-zinc-500 hover:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-[10px]">Abort</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelivery} className="h-14 px-10 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest text-[10px] border-none">
                            Release Funds
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

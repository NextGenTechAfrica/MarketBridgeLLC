'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { startConversation } from '@/lib/chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
    Loader2,
    Package,
    Clock,
    CheckCircle2,
    Truck,
    ArrowLeft,
    MessageCircle,
    AlertCircle,
    Check,
    Calendar,
    ShieldCheck,
    CreditCard,
    ChevronRight,
    MapPin,
    Phone
} from 'lucide-react';

interface Order {
    id: string;
    buyer_id: string;
    seller_id: string;
    listing_id: string;
    status: 'pending_verification' | 'pending' | 'paid' | 'confirmed' | 'disputed' | 'completed' | 'cancelled';
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
        description: string;
    };
    seller?: {
        id: string;
        display_name: string;
        photo_url: string | null;
    };
}

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmingOrder, setConfirmingOrder] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);

    const orderId = params?.id as string;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user && orderId) {
            fetchOrder();
            subscribeToOrder();
        }
    }, [user, authLoading, orderId]);

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    listing:listings(id, title, images, price, description),
                    seller:users!orders_seller_id_fkey(id, display_name, photo_url)
                `)
                .eq('id', orderId)
                .single();

            if (error) throw error;

            // Transform listing if returned as array
            const transformedOrder = {
                ...data,
                listing: Array.isArray(data.listing) ? data.listing[0] : data.listing,
                seller: Array.isArray(data.seller) ? data.seller[0] : data.seller
            };

            setOrder(transformedOrder);
        } catch (err) {
            console.error('Failed to fetch order:', err);
            toast('Failed to load order details.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const subscribeToOrder = () => {
        if (!orderId) return;

        const subscription = supabase
            .channel(`order-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`,
                },
                () => {
                    fetchOrder();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const handleConfirmDelivery = async () => {
        if (!order) return;
        setConfirmingOrder(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', order.id);

            if (error) throw error;

            try {
                const conversationId = await startConversation(user!.id, order.seller_id, order.listing_id);
                await supabase.from('messages').insert({
                    conversation_id: conversationId,
                    sender_id: user!.id,
                    content: `✅ Order #${order.id.slice(-8).toUpperCase()} confirmed! Payment of ₦${order.amount.toLocaleString()} has been released to your wallet.`,
                });
            } catch (chatErr) {
                console.error('Failed to send chat notification:', chatErr);
            }

            toast('Delivery confirmed and funds released!', 'success');
            setShowConfirmDialog(false);
            fetchOrder();
        } catch (err) {
            console.error('Failed to confirm delivery:', err);
            toast('Failed to confirm delivery.', 'error');
        } finally {
            setConfirmingOrder(false);
        }
    };

    const openChat = async () => {
        if (!order || !user) return;
        setChatLoading(true);
        try {
            const conversationId = await startConversation(user.id, order.seller_id, order.listing_id);
            router.push(`/seller/chats/${conversationId}`);
        } catch (err) {
            console.error('Failed to open chat:', err);
            toast('Failed to initiate conversation.', 'error');
        } finally {
            setChatLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
                <span className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading Order Details...</span>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 text-[#FF6200] flex items-center justify-center mb-6">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Order Not Found</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-sm font-medium">This order does not exist or you do not have permission to view it.</p>
                <Button asChild className="bg-[#FF6200] text-white hover:bg-[#FF7A29] font-black uppercase tracking-widest text-xs rounded-xl h-12 px-6 border-none">
                    <Link href="/seller/orders">Back to Orders</Link>
                </Button>
            </div>
        );
    }

    // Determine Timeline Steps status
    const getStepStatus = (step: 'paid' | 'preparing' | 'shipped' | 'delivered') => {
        const { status } = order;

        if (status === 'cancelled') return 'pending';

        switch (step) {
            case 'paid':
                if (status === 'pending_verification' || status === 'pending') return 'active';
                return 'completed';
            case 'preparing':
                if (status === 'pending_verification' || status === 'pending') return 'pending';
                if (status === 'paid') return 'active';
                return 'completed';
            case 'shipped':
                if (status === 'pending_verification' || status === 'pending' || status === 'paid') return 'pending';
                if (status === 'confirmed') return 'active';
                return 'completed';
            case 'delivered':
                if (status === 'completed') return 'completed';
                return 'pending';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Funds in Escrow</Badge>;
            case 'confirmed':
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Shipped / In Transit</Badge>;
            case 'completed':
                return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Completed</Badge>;
            case 'pending_verification':
            case 'pending':
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Awaiting Confirmation</Badge>;
            case 'disputed':
                return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Disputed / Held</Badge>;
            case 'cancelled':
                return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Cancelled</Badge>;
            default:
                return <Badge variant="outline" className="font-black text-[10px] uppercase tracking-wider px-3 py-1">{status}</Badge>;
        }
    };

    // Calculate if order is within 48h of completion for dispute filing
    const isWithin48HoursOfDelivery = () => {
        if (order.status !== 'completed') return false;
        const deliveryTime = new Date(order.updated_at).getTime();
        const now = new Date().getTime();
        const fortyEightHoursInMs = 48 * 60 * 60 * 1000;
        return (now - deliveryTime) < fortyEightHoursInMs;
    };

    const timelineSteps = [
        {
            key: 'paid' as const,
            title: 'Payment Secured',
            description: 'Funds safely processed and held in escrow protection.',
            icon: CreditCard,
        },
        {
            key: 'preparing' as const,
            title: 'Preparing Order',
            description: 'Item is being inspected, packaged, and readied.',
            icon: Package,
        },
        {
            key: 'shipped' as const,
            title: 'Shipped / In Transit',
            description: 'Order dispatched and en route to the destination.',
            icon: Truck,
        },
        {
            key: 'delivered' as const,
            title: 'Delivered & Released',
            description: 'Receipt confirmed and payment released from escrow.',
            icon: CheckCircle2,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 pb-28">
            <div className="container mx-auto px-4 sm:px-6 max-w-5xl">

                {/* Header Navigation */}
                <div className="mb-8 flex items-center justify-between">
                    <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-[#FF6200] transition-colors group">
                        <Link href="/seller/orders" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Orders
                        </Link>
                    </Button>
                    {getStatusBadge(order.status)}
                </div>

                {/* Main Grid: Info Cards & Vertical Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Order Details & Escrow Box */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Title & Metadata */}
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6200]">
                                Order #{order.id.slice(-10).toUpperCase()}
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Order Details
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Placed on {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>

                        {/* Product Card */}
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex flex-col sm:flex-row gap-5">
                                    <div className="h-24 w-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-800">
                                        {order.listing?.images?.[0] ? (
                                            <Image
                                                src={order.listing.images[0]}
                                                alt={order.listing.title}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between space-y-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                                                {order.listing?.title || 'Listing Item'}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-0.5">
                                                {order.listing?.description || 'No description provided.'}
                                            </p>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Price</p>
                                                <p className="text-2xl font-black text-[#FF6200] tracking-tight">₦{order.amount.toLocaleString()}</p>
                                            </div>
                                            {order.seller && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <div className="h-5 w-5 rounded-full overflow-hidden bg-[#FF6200]/10 flex items-center justify-center text-[10px] font-bold text-[#FF6200]">
                                                        {order.seller.photo_url ? (
                                                            <img src={order.seller.photo_url} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            order.seller.display_name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{order.seller.display_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Escrow Status Alert Box */}
                        <div className="bg-[#FF6200]/5 dark:bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-2xl p-6 space-y-3">
                            <div className="flex items-center gap-2.5 text-[#FF6200]">
                                <ShieldCheck className="h-5 w-5 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider">Escrow Protection Active</span>
                            </div>

                            {order.status === 'pending_verification' && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                    Manual payment confirmation is currently in review. Once verified, funds will be secured in escrow and the seller will dispatch your item.
                                </p>
                            )}

                            {order.status === 'paid' && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                    Payment of <span className="font-bold text-slate-900 dark:text-white">₦{order.amount.toLocaleString()}</span> is secured in MarketBridge Escrow. The seller has been notified to dispatch the order.
                                </p>
                            )}

                            {order.status === 'confirmed' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                                        The item is in transit. Please verify the parcel upon arrival before confirming delivery to release funds from escrow.
                                    </p>
                                    <div>
                                        <Button
                                            onClick={() => setShowConfirmDialog(true)}
                                            className="w-full h-12 bg-[#FF6200] text-white hover:bg-[#FF7A29] rounded-xl font-bold uppercase tracking-wider text-xs border-none shadow-sm"
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Receipt & Release Funds
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {order.status === 'completed' && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    This order has successfully completed. Payment was released to the seller's wallet.
                                </p>
                            )}

                            {order.status === 'disputed' && (
                                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-medium">
                                    This transaction is currently under dispute review. Funds will remain secured in escrow until resolved.
                                </p>
                            )}

                            {order.status === 'cancelled' && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    This order was cancelled and any associated payment has been refunded.
                                </p>
                            )}
                        </div>

                        {/* Shipping & Delivery Info */}
                        {order.shipping_address && (
                            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-6 space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Delivery Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Destination Address</p>
                                                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mt-0.5">{order.shipping_address}</p>
                                            </div>
                                        </div>
                                        {order.phone_number && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contact Phone</p>
                                                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mt-0.5">{order.phone_number}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Note */}
                        {order.notes && (
                            <div className="p-5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Buyer Notes</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{order.notes}</p>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={openChat}
                                disabled={chatLoading}
                                className="flex-1 h-12 border-slate-200 dark:border-slate-700 hover:border-[#FF6200] rounded-xl font-bold uppercase tracking-wider text-xs"
                            >
                                {chatLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF6200]" />
                                ) : (
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                )}
                                Message Seller
                            </Button>

                            {/* Open Dispute Button */}
                            {((['paid', 'confirmed'].includes(order.status)) || (order.status === 'completed' && isWithin48HoursOfDelivery())) && (
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="flex-1 h-12 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                                >
                                    <Link href={`/seller/orders/${order.id}/dispute`}>
                                        <AlertCircle className="mr-2 h-4 w-4" /> Open Dispute
                                    </Link>
                                </Button>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Vertical Timeline */}
                    <div className="space-y-6">
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-6 space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Fulfillment Timeline</h3>

                                <div className="relative pl-6 space-y-8">
                                    {/* Vertical connecting line */}
                                    <div className="absolute left-[17px] top-3 bottom-3 w-[2px] bg-slate-100 dark:bg-slate-800" />

                                    {timelineSteps.map((step) => {
                                        const stepStatus = getStepStatus(step.key);
                                        const StepIcon = step.icon;

                                        return (
                                            <div key={step.key} className="relative flex gap-4 items-start group">
                                                {/* Step indicator circle */}
                                                <div className="absolute -left-[27px] top-0.5 z-10 flex items-center justify-center">
                                                    {stepStatus === 'completed' ? (
                                                        <div className="h-6 w-6 rounded-full bg-emerald-500 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
                                                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                        </div>
                                                    ) : stepStatus === 'active' ? (
                                                        <div className="h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-2 border-[#FF6200] flex items-center justify-center shadow-md animate-pulse">
                                                            <div className="h-2 w-2 rounded-full bg-[#FF6200]" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                                            <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <StepIcon className={`h-4 w-4 ${stepStatus === 'completed' ? 'text-emerald-500' : stepStatus === 'active' ? 'text-[#FF6200]' : 'text-slate-300 dark:text-slate-600'}`} />
                                                        <h4 className={`text-xs font-bold uppercase tracking-wider ${
                                                            stepStatus === 'completed' ? 'text-slate-900 dark:text-slate-100' :
                                                            stepStatus === 'active' ? 'text-[#FF6200]' : 'text-slate-400'
                                                        }`}>
                                                            {step.title}
                                                        </h4>
                                                    </div>
                                                    <p className={`text-[11px] leading-relaxed ${stepStatus === 'completed' || stepStatus === 'active' ? 'text-slate-500 dark:text-slate-400 font-medium' : 'text-slate-400/80 dark:text-slate-600'}`}>
                                                        {step.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>

            </div>

            {/* Confirm Receipt Modal */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Authorize Escrow Release?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-medium py-3 text-sm">
                            You are about to authorize the permanent release of <span className="text-slate-900 dark:text-white font-bold">₦{order.amount.toLocaleString()}</span> to the seller.
                            Confirm only if the item has arrived and meets your expectation.
                            <br /><br />
                            <span className="text-[#FF6200] font-bold text-xs">Note: Once released, this transaction cannot be reversed.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-3">
                        <AlertDialogCancel className="h-11 px-5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-wider text-xs">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelivery} disabled={confirmingOrder} className="h-11 px-6 bg-[#FF6200] text-white hover:bg-[#FF7A29] rounded-xl font-bold uppercase tracking-wider text-xs border-none">
                            {confirmingOrder ? 'Releasing...' : 'Release Funds'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

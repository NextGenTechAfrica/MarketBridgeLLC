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
            router.push(`/chats/${conversationId}`);
        } catch (err) {
            console.error('Failed to open chat:', err);
            toast('Failed to initiate conversation.', 'error');
        } finally {
            setChatLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
                <span className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-400">Loading Cycle Logs...</span>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="h-16 w-16 text-[#FF6200] mb-6" />
                <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter mb-2">Order Not Found</h1>
                <p className="text-zinc-500 mb-8 max-w-sm">This order does not exist or you do not have permission to view it.</p>
                <Button asChild className="bg-[#FF6200] text-black hover:bg-[#FF7A29] font-black uppercase tracking-widest text-xs rounded-2xl h-14 px-8 border-none">
                    <Link href="/orders">Back to Orders</Link>
                </Button>
            </div>
        );
    }

    // Determine Timeline Steps status
    // Step statuses can be: 'completed', 'active', 'pending'
    const getStepStatus = (step: 'paid' | 'preparing' | 'shipped' | 'delivered') => {
        const { status } = order;
        
        if (status === 'cancelled') return 'pending';
        if (status === 'disputed') {
            // Keep status visually frozen but alert active dispute
        }

        switch (step) {
            case 'paid':
                if (status === 'pending_verification' || status === 'pending') return 'active';
                return 'completed'; // paid, confirmed, completed, disputed
            case 'preparing':
                if (status === 'pending_verification' || status === 'pending') return 'pending';
                if (status === 'paid') return 'active';
                return 'completed'; // confirmed, completed
            case 'shipped':
                if (status === 'pending_verification' || status === 'pending' || status === 'paid') return 'pending';
                if (status === 'confirmed') return 'active';
                return 'completed'; // completed
            case 'delivered':
                if (status === 'completed') return 'completed';
                return 'pending';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending_verification':
                return 'Awaiting Verification';
            case 'pending':
                return 'Awaiting Payment';
            case 'paid':
                return 'Funds in Escrow';
            case 'confirmed':
                return 'Shipped / In Transit';
            case 'completed':
                return 'Delivered / Completed';
            case 'cancelled':
                return 'Cancelled / Refunded';
            case 'disputed':
                return 'Disputed / Held';
            default:
                return status.toUpperCase();
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
            description: 'Funds successfully processed and held in escrow.',
            icon: CreditCard,
        },
        {
            key: 'preparing' as const,
            title: 'Preparing Order',
            description: 'Seller is packaging and preparing your item.',
            icon: Package,
        },
        {
            key: 'shipped' as const,
            title: 'Shipped / In Transit',
            description: 'Order dispatched by seller and is on the way.',
            icon: Truck,
        },
        {
            key: 'delivered' as const,
            title: 'Delivered & Released',
            description: 'Item received and funds released to the seller.',
            icon: CheckCircle2,
        },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
            <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
                {/* Header Navigation */}
                <div className="flex items-center justify-between pt-4 border-b border-border pb-4">
                    <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-[#FF6200] transition-colors">
                        <Link href="/orders" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Orders
                        </Link>
                    </Button>
                    <Badge className="bg-[#FF6200]/10 border border-[#FF6200]/25 text-[#FF6200] text-xs px-3 py-1 font-semibold">
                        {getStatusText(order.status)}
                    </Badge>
                </div>

                {/* Main Grid: Info Cards & Vertical Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Order Details & Escrow Box */}
                    <div className="md:col-span-2 space-y-6">
                        
                        {/* Title & Metadata */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Order ID: #{order.id.slice(-12).toUpperCase()}</p>
                            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic font-heading">
                                Order <span className="text-[#FF6200]">Details</span>
                            </h1>
                            <div className="flex items-center gap-4 text-zinc-500 text-xs font-medium italic mt-2">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        {/* Product Card */}
                        <Card className="bg-white border border-zinc-200/80 shadow-sm rounded-[2.5rem] overflow-hidden hover:shadow-md transition-all duration-300">
                            <CardContent className="p-8">
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="h-28 w-28 shrink-0 rounded-2xl overflow-hidden border border-zinc-100 relative bg-zinc-50">
                                        {order.listing?.images?.[0] ? (
                                            <Image
                                                src={order.listing.images[0]}
                                                alt={order.listing.title}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <Package className="h-8 w-8 text-zinc-200" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between space-y-4">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight italic font-heading line-clamp-1">
                                                {order.listing?.title || 'Unknown Listing'}
                                            </h3>
                                            <p className="text-xs text-zinc-400 font-medium line-clamp-2 mt-1 italic">
                                                {order.listing?.description || 'No description provided.'}
                                            </p>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Price</p>
                                                <p className="text-2xl font-black text-[#FF6200] font-heading tracking-tighter">₦{order.amount.toLocaleString()}</p>
                                            </div>
                                            {order.seller && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-100">
                                                    <div className="h-5 w-5 rounded-full overflow-hidden bg-[#FF6200]/10 flex items-center justify-center text-[10px] font-bold">
                                                        {order.seller.photo_url ? (
                                                            <img src={order.seller.photo_url} className="h-full w-full object-cover" />
                                                        ) : (
                                                            order.seller.display_name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{order.seller.display_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Escrow Status Alert Box */}
                        <div className="bg-[#FF6200]/5 border border-[#FF6200]/15 rounded-[2.5rem] p-8 space-y-4">
                            <div className="flex items-center gap-3 text-[#FF6200]">
                                <ShieldCheck className="h-6 w-6" />
                                <span className="text-xs font-black uppercase tracking-widest font-heading">Secure Escrow Protocol</span>
                            </div>
                            
                            {order.status === 'pending_verification' && (
                                <p className="text-xs text-zinc-600 leading-relaxed font-medium italic">
                                    Your manual payment proof is currently under review by our operations team. Once verified, funds will be locked in escrow and the seller will dispatch your item.
                                </p>
                            )}

                            {(order.status === 'paid') && (
                                <p className="text-xs text-zinc-600 leading-relaxed font-medium italic">
                                    Payment of <span className="font-bold text-zinc-900">₦{order.amount.toLocaleString()}</span> has been safely secured in escrow. The seller has been notified to dispatch the item. Funds will only be released when you confirm receipt.
                                </p>
                            )}

                            {order.status === 'confirmed' && (
                                <div className="space-y-4">
                                    <p className="text-xs text-zinc-900 font-bold italic leading-relaxed">
                                        The seller has shipped the item! Please verify the contents before releasing the funds from escrow.
                                    </p>
                                    <div className="pt-2">
                                        <Button
                                            onClick={() => setShowConfirmDialog(true)}
                                            className="w-full h-14 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading border-none shadow-md"
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Receipt & Release Funds
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {order.status === 'completed' && (
                                <p className="text-xs text-zinc-500 leading-relaxed font-medium italic">
                                    This transaction cycle has completed. The locked funds have been successfully released to the seller's wallet.
                                </p>
                            )}

                            {order.status === 'disputed' && (
                                <p className="text-xs text-[#FF6200] leading-relaxed font-medium italic">
                                    This transaction is currently under review by our trust & safety department. Funds will remain locked in escrow until the dispute is resolved.
                                </p>
                            )}

                            {order.status === 'cancelled' && (
                                <p className="text-xs text-zinc-500 leading-relaxed font-medium italic">
                                    This transaction was cancelled. The funds have been returned to the buyer.
                                </p>
                            )}
                        </div>

                        {/* Shipping & Delivery Info */}
                        {order.shipping_address && (
                            <Card className="bg-white border border-zinc-200/80 shadow-sm rounded-[2.5rem] overflow-hidden">
                                <CardContent className="p-8 space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Delivery Endpoint</h3>
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="h-10 w-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Destination Address</p>
                                                <p className="text-sm text-zinc-700 font-medium mt-1">{order.shipping_address}</p>
                                            </div>
                                        </div>
                                        {order.phone_number && (
                                            <div className="flex gap-4">
                                                <div className="h-10 w-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                                                    <Phone className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Contact Number</p>
                                                    <p className="text-sm text-zinc-700 font-medium mt-1">{order.phone_number}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Note */}
                        {order.notes && (
                            <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Additional Notes</p>
                                <p className="text-xs text-zinc-500 italic font-medium">{order.notes}</p>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button
                                variant="outline"
                                onClick={openChat}
                                disabled={chatLoading}
                                className="flex-1 h-14 border-zinc-200 hover:border-[#FF6200]/40 rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading"
                            >
                                {chatLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF6200]" />
                                ) : (
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                )}
                                Message Seller
                            </Button>

                            {/* Open Dispute Button (available when status is 'paid', 'confirmed' or 'completed' within 48h) */}
                            {((['paid', 'confirmed'].includes(order.status)) || (order.status === 'completed' && isWithin48HoursOfDelivery())) && (
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="flex-1 h-14 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading transition-colors"
                                >
                                    <Link href={`/orders/${order.id}/dispute`}>
                                        <AlertCircle className="mr-2 h-4 w-4" /> Open Dispute
                                    </Link>
                                </Button>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Vertical Timeline */}
                    <div className="space-y-8">
                        <Card className="bg-white border border-zinc-200/80 shadow-sm rounded-[2.5rem] overflow-hidden">
                            <CardContent className="p-8 md:p-10 space-y-8">
                                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Order Progress</h3>
                                
                                <div className="relative pl-6 space-y-12">
                                    {/* Vertical connecting line */}
                                    <div className="absolute left-[17px] top-4 bottom-4 w-[2px] bg-zinc-100" />

                                    {timelineSteps.map((step, idx) => {
                                        const stepStatus = getStepStatus(step.key);
                                        const StepIcon = step.icon;

                                        return (
                                            <div key={step.key} className="relative flex gap-6 items-start group">
                                                {/* Step indicator circle */}
                                                <div className="absolute -left-[27px] top-1 z-10 flex items-center justify-center">
                                                    {stepStatus === 'completed' ? (
                                                        <div className="h-6 w-6 rounded-full bg-[#FF6200] text-black border-2 border-white flex items-center justify-center shadow-sm">
                                                            <Check className="h-3 w-3 stroke-[3]" />
                                                        </div>
                                                    ) : stepStatus === 'active' ? (
                                                        <div className="h-6 w-6 rounded-full bg-white border-2 border-[#FF6200] flex items-center justify-center shadow-md animate-pulse">
                                                            <div className="h-2 w-2 rounded-full bg-[#FF6200]" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center shadow-sm">
                                                            <div className="h-2 w-2 rounded-full bg-zinc-200" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <StepIcon className={`h-4 w-4 ${stepStatus === 'completed' || stepStatus === 'active' ? 'text-[#FF6200]' : 'text-zinc-300'}`} />
                                                        <h4 className={`text-xs font-black uppercase tracking-wider ${
                                                            stepStatus === 'completed' ? 'text-zinc-900 line-through decoration-zinc-300' :
                                                            stepStatus === 'active' ? 'text-[#FF6200]' : 'text-zinc-400'
                                                        }`}>
                                                            {step.title}
                                                        </h4>
                                                    </div>
                                                    <p className={`text-[11px] leading-relaxed italic ${stepStatus === 'completed' || stepStatus === 'active' ? 'text-zinc-500 font-medium' : 'text-zinc-400'}`}>
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
                <AlertDialogContent className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Authorize Escrow Release?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-500 font-medium italic py-4">
                            You are about to authorize the permanent release of <span className="text-zinc-900 font-bold">₦{order.amount.toLocaleString()}</span> to the seller. 
                            Confirm only if the asset has been received in the expected condition.
                            <br /><br />
                            <span className="text-[#FF6200] uppercase text-[10px] font-black tracking-widest font-heading">System Warning: This action is non-reversible.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-4">
                        <AlertDialogCancel className="h-14 px-8 border-zinc-200 text-zinc-500 hover:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading">Abort</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelivery} disabled={confirmingOrder} className="h-14 px-10 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest text-[10px] font-heading border-none">
                            {confirmingOrder ? 'Releasing...' : 'Release Funds'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

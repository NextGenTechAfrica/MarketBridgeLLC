'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const DISPUTE_REASONS = [
    'Item not received',
    'Item significantly not as described',
    'Damaged item',
    'Wrong item sent',
    'Counterfeit item',
    'Other'
];

export default function DisputePage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const [order, setOrder] = useState<{
        id: string;
        amount: number;
        status: string;
        listing_id: string;
        listing: { title: string; images: string[] };
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        reason: '',
        description: ''
    });

    useEffect(() => {
        if (params?.id) {
            fetchOrder();
        }
    }, [params?.id]);

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, amount, status, listing_id,
                    listing:listings(title, images)
                `)
                .eq('id', params?.id)
                .single();

            if (error) throw error;

            // Handle case where listing might be returned as an array or object
            const transformedData = {
                ...data,
                listing: Array.isArray(data.listing) ? data.listing[0] : data.listing
            };

            setOrder(transformedData as any);
        } catch (err: unknown) {
            console.error('Fetch order error:', err);
            setError('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.reason || !formData.description) {
            setError('Please fill in all fields');
            return;
        }

        if (!user || !order) return;

        setSubmitting(true);
        setError('');

        try {
            // 1. Create Dispute Record
            const { error: disputeError } = await supabase
                .from('disputes')
                .insert({
                    order_id: order.id,
                    filed_by_id: user.id,
                    reason: formData.reason,
                    description: formData.description,
                    status: 'open'
                });

            if (disputeError) throw disputeError;

            // 2. Update Order Status to 'disputed'
            const { error: orderError } = await supabase
                .from('orders')
                .update({ status: 'disputed' })
                .eq('id', order.id);

            if (orderError) throw orderError;

            // 3. Notify Admins (Future: Insert into notifications table)
            // For now, just rely on Admin Dashboard polling/real-time

            router.push('/seller/orders');
        } catch (err: unknown) {
            console.error('Dispute error:', err);
            const message = err instanceof Error ? err.message : 'Failed to file dispute';
            setError(message);
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-black text-[#FF6600]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-3 font-mono text-sm uppercase tracking-widest">Accessing Secure Records...</span>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="h-16 w-16 text-[#FF6200] mb-6" />
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 font-heading">Notice Lost</h1>
                <p className="text-white/40 mb-8 max-w-sm">Order record not found in the secure database.</p>
                <Button asChild variant="outline" className="border-white/10 text-white font-mono uppercase tracking-widest text-xs">
                    <Link href="/seller/orders">Return to Orders</Link>
                </Button>
            </div>
        );
    }

    // Only allow dispute if paid or confirmed (not completed, cancelled, or already disputed)
    if (!['paid', 'confirmed'].includes(order.status)) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
                <ShieldAlert className="h-16 w-16 text-yellow-500 mb-6" />
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 font-heading">Action Denied</h1>
                <p className="text-white/40 mb-8 max-w-sm">
                    Disputes can only be filed for active orders currently in escrow.
                    <br /><span className="mt-2 block text-xs uppercase tracking-widest text-white/20">Current Status: {order.status}</span>
                </p>
                <Button asChild variant="outline" className="border-white/10 text-white font-mono uppercase tracking-widest text-xs">
                    <Link href="/seller/orders">Return to Orders</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 font-sans selection:bg-[#FF6200]/30 selection:text-white">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none z-0" />

            <div className="max-w-2xl mx-auto relative z-10">
                <Button variant="ghost" asChild className="mb-8 pl-0 hover:bg-transparent hover:text-[#FF6600] transition-colors group">
                    <Link href="/seller/orders" className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/40">
                        <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Abort Sequence
                    </Link>
                </Button>

                <div className="glass-card border border-[#FF6200]/20 bg-[#FF6200]/[0.02] p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />

                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-16 w-16 rounded-full bg-[#FF6200]/10 flex items-center justify-center border border-[#FF6200]/20 shrink-0 animate-pulse">
                            <ShieldAlert className="h-8 w-8 text-[#FF6200]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter italic font-heading text-white">
                                File <span className="text-[#FF6200]">Dispute</span>
                            </h1>
                            <p className="text-xs font-mono text-white/40 uppercase tracking-widest mt-1">
                                Escrow Hold Initiation
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/50 border border-white/5 rounded-xl p-4 mb-8 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 font-heading">Transaction Value</p>
                            <p className="text-2xl font-black text-white font-heading">₦{order.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 font-heading">Order Ref</p>
                            <p className="text-sm font-mono text-white/60">#{order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-lg p-4 mb-8 text-xs font-mono text-[#FF6200] flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-xs font-black uppercase tracking-widest text-white/40 font-heading">Nature of Issue</Label>
                            <Select
                                value={formData.reason}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                            >
                                <SelectTrigger className="bg-black border-white/10 h-12 text-white/70 focus:ring-red-500/50 focus:border-[#FF6200]/50">
                                    <SelectValue placeholder="Select Reason for Dispute" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-white/10 text-white/70">
                                    {DISPUTE_REASONS.map((reason) => (
                                        <SelectItem key={reason} value={reason} className="focus:bg-white/5 cursor-pointer">
                                            {reason}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-white/40 font-heading">Evidence / Statement</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the issue in detail. Why are you filing this dispute?"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={6}
                                required
                                className="bg-black border-white/10 text-white/70 placeholder:text-white/20 resize-none focus:ring-red-500/50 focus:border-[#FF6200]/50"
                            />
                            <p className="text-[10px] font-mono text-white/30">
                                NOTICE: Filing a false dispute may result in account termination. All evidence will be reviewed by MarketBridge Operation Command.
                            </p>
                        </div>

                        <Button type="submit" className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm font-heading rounded-none transition-all clip-path-slant" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Encrypting & Submitting...
                                </>
                            ) : (
                                'Initiate Dispute System'
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

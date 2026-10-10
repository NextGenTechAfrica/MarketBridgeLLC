'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ShieldCheck, Zap, Loader2, ArrowLeft, Building2,
    UploadCloud, CheckCircle2, Copy, Check, Clock, Info, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const Separator = ({ className }: { className?: string }) => (
    <div className={cn("h-[1px] w-full bg-border", className)} />
);

const supabase = createClient();

export default function CheckoutPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { items, total, clearCart } = useCart();
    const { toast } = useToast();

    const [actionLoading, setActionLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [copiedAccount, setCopiedAccount] = useState(false);

    // Form State
    const [paymentRef, setPaymentRef] = useState('');
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [useCoins, setUseCoins] = useState(false);

    const maxRedeemable = Math.min(user?.coins_balance || 0, total);

    // Bank Details State (Default: Moniepoint Escrow Account)
    const [bankDetails, setBankDetails] = useState({
        account_number: '9022858358',
        bank_name: 'Moniepoint MFB',
        account_name: 'MarketBridge Escrow'
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/checkout');
        }
        if (!authLoading && items.length === 0) {
            router.push('/cart');
        }
    }, [user, authLoading, items, router]);

    // Fetch dynamic bank settings
    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'bank_details')
                .single();

            if (data?.value) {
                setBankDetails(data.value);
            }
        };
        fetchSettings();
    }, []);

    const handleCopyAccount = () => {
        if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(bankDetails.account_number);
            setCopiedAccount(true);
            toast('Account number copied to clipboard', 'success');
            setTimeout(() => setCopiedAccount(false), 2500);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (!user) {
            toast('User not authenticated. Please log in.', 'error');
            return;
        }

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);

            setProofUrl(data.publicUrl);
            toast('Receipt uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading receipt:', error);
            toast('Failed to upload receipt. Please try again.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!user || items.length === 0) return;
        if (!paymentRef || !proofUrl || !agreed) {
            toast('Please complete all verification fields and confirm transfer.', 'error');
            return;
        }

        setActionLoading(true);

        try {
            const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    items: items.map(item => ({
                        listingId: item.listingId,
                        quantity: item.quantity,
                        price: item.price,
                        sellerId: item.sellerId
                    })),
                    totalAmount: useCoins ? total - maxRedeemable : total,
                    coinsRedeemed: useCoins ? maxRedeemable : 0,
                    proofUrl,
                    paymentRef
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Order creation failed');
            }

            const data = await response.json();

            clearCart();
            toast('Order submitted successfully! Escrow verification underway.', 'success');
            router.push(`/orders?new=${data.orderId}`);

        } catch (err: any) {
            console.error('Checkout error:', err);
            toast(err.message || 'Failed to place order. Please try again.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    if (authLoading || (items.length === 0 && !authLoading)) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#FF6200]" />
                <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading secure checkout...</p>
            </div>
        );
    }

    const payableTotal = useCoins ? Math.max(0, total - maxRedeemable) : total;

    return (
        <div className="min-h-screen bg-background text-foreground py-8 md:py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">

                {/* Back Button */}
                <div>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4 text-[#FF6200]" />
                        <span>Back to Cart</span>
                    </button>
                </div>

                {/* Page Title & Escrow Explanation */}
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6200]/10 border border-[#FF6200]/20 text-[#FF6200] text-xs font-bold">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Zero-Fraud Escrow Transfer</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground font-heading">
                        Order <span className="text-[#FF6200]">Escrow Checkout</span>
                    </h1>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        To ensure 0% buyer transaction fees, transfer the exact order amount directly to our verified escrow account.
                        Funds remain safely locked until you inspect and receive your items on campus.
                    </p>
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">

                    {/* Left Column: Escrow Bank Details & Payment Proof */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Escrow Bank Account Card */}
                        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-[#FF6200]">
                                    MarketBridge Escrow Account
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> 0% Fee
                                </span>
                            </div>

                            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-border space-y-4">
                                <div>
                                    <span className="text-xs text-muted-foreground">Account Number</span>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-3xl font-black text-foreground tracking-tight font-mono">
                                            {bankDetails.account_number}
                                        </p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCopyAccount}
                                            className="rounded-xl border-border text-xs font-bold gap-1.5"
                                        >
                                            {copiedAccount ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copiedAccount ? 'Copied' : 'Copy'}
                                        </Button>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Bank Name</span>
                                        <p className="font-bold text-foreground text-sm mt-0.5">{bankDetails.bank_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Account Name</span>
                                        <p className="font-bold text-foreground text-sm mt-0.5">{bankDetails.account_name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Form */}
                            <div className="space-y-5 pt-2">
                                <h3 className="text-base font-black text-foreground font-heading">
                                    Payment Verification
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ref" className="text-xs font-bold text-foreground">
                                            Transaction Reference or Sender Name
                                        </Label>
                                        <Input
                                            id="ref"
                                            value={paymentRef}
                                            onChange={(e) => setPaymentRef(e.target.value)}
                                            placeholder="e.g. Ref: 20261010-XYZ or John Doe"
                                            className="h-12 rounded-xl text-sm bg-background border-border"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-foreground">
                                            Upload Transfer Receipt (Screenshot)
                                        </Label>
                                        <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-[#FF6200]/50 transition-colors cursor-pointer relative bg-zinc-50/50 dark:bg-white/5">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="h-8 w-8 text-[#FF6200] animate-spin" />
                                                    <p className="text-xs font-bold text-[#FF6200]">Uploading receipt...</p>
                                                </div>
                                            ) : proofUrl ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Receipt Attached</p>
                                                    <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] underline text-[#FF6200] z-10 relative">
                                                        Preview uploaded image
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <UploadCloud className="h-8 w-8 text-[#FF6200]" />
                                                    <p className="text-xs font-bold text-foreground">Click or drag screenshot here</p>
                                                    <p className="text-[10px] text-muted-foreground">PNG, JPG or JPEG up to 5MB</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Agreement Checkbox */}
                                    <div className="flex items-start gap-3 pt-2">
                                        <input
                                            type="checkbox"
                                            id="agree"
                                            checked={agreed}
                                            onChange={(e) => setAgreed(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-border text-[#FF6200] focus:ring-[#FF6200] cursor-pointer"
                                        />
                                        <label htmlFor="agree" className="text-xs text-muted-foreground leading-snug cursor-pointer select-none">
                                            I confirm that I have transferred exactly <strong className="text-foreground">₦{payableTotal.toLocaleString()}</strong> to the MarketBridge Escrow account above.
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Order Summary & Place Order */}
                    <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
                            <div>
                                <h3 className="text-xl font-black text-foreground font-heading">
                                    Summary of Staged Items
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {items.length} product listing{items.length !== 1 ? 's' : ''} in this order
                                </p>
                            </div>

                            {/* Items list preview */}
                            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {items.map((item) => (
                                    <div key={item.listingId} className="flex items-center gap-3.5 p-2.5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-border/70">
                                        <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden relative shrink-0">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.title} fill className="object-cover" />
                                            ) : (
                                                <Building2 className="h-6 w-6 text-muted-foreground m-auto" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                                            <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-xs font-black text-[#FF6200] font-heading shrink-0">
                                            ₦{(item.price * item.quantity).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <Separator />

                            {/* MarketCoins Discount if available */}
                            {user?.coins_balance && user.coins_balance > 0 ? (
                                <div className="p-3 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-[#FF6200]/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                            <Zap className="h-3.5 w-3.5 text-[#FF6200]" />
                                            <span>Redeem MarketCoins ({user.coins_balance} MC)</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={useCoins}
                                            onChange={(e) => setUseCoins(e.target.checked)}
                                            className="h-4 w-4 rounded border-border text-[#FF6200] focus:ring-[#FF6200] cursor-pointer"
                                        />
                                    </div>
                                    {useCoins && (
                                        <div className="flex justify-between items-center text-xs text-[#FF6200] font-bold pt-1">
                                            <span>Coin Discount</span>
                                            <span>-₦{maxRedeemable.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {/* Total Breakdown */}
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Items Subtotal</span>
                                    <span className="font-bold text-foreground">₦{total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Escrow Processing</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Free (0%)</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-2 border-t border-border">
                                    <span className="text-sm font-bold text-foreground">Total To Transfer</span>
                                    <span className="text-3xl font-black text-[#FF6200] font-heading">
                                        ₦{payableTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <Button
                                    type="button"
                                    onClick={handleConfirmPayment}
                                    disabled={actionLoading || uploading || !proofUrl || !paymentRef || !agreed}
                                    className="w-full h-14 bg-[#FF6200] hover:bg-[#E55800] text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#FF6200]/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <ShieldCheck className="h-5 w-5 mr-2" />
                                    )}
                                    Submit Escrow Payment
                                </Button>
                                <p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
                                    Moderators verify the transfer immediately and notify the student seller to arrange campus delivery.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

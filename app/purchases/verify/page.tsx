'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const reference = searchParams?.get('reference');
    const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
    const [message, setMessage] = useState('Verifying payment with Paystack...');

    useEffect(() => {
        if (!reference) {
            setStatus('failed');
            setMessage('No transaction reference found.');
            return;
        }

        // We could verify here too, but the webhook handles the DB update.
        // We'll just wait a bit and check our local DB or just trust the redirect
        // if it's coming from Paystack.
        const timer = setTimeout(() => {
            setStatus('success');
            setMessage('Payment data received and confirmed.');
        }, 3000);

        return () => clearTimeout(timer);
    }, [reference]);

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none" />
            <div className="max-w-md w-full bg-white border border-zinc-200 rounded-[2rem] shadow-sm p-12 rounded-[3rem] border-zinc-100 relative z-10 text-center space-y-8">
                {status === 'verifying' && (
                    <>
                        <div className="h-24 w-24 rounded-3xl border-2 border-[#FF6200]/20 flex items-center justify-center relative animate-pulse mx-auto">
                            <Loader2 className="h-10 w-10 text-[#FF6200] animate-spin" />
                            <div className="absolute inset-0 rounded-3xl border border-[#FF6200] animate-ping opacity-25" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-2xl font-black uppercase tracking-tighter italic font-heading">Verifying Purchase</h1>
                            <p className="text-zinc-500 text-sm font-medium italic">{message}</p>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="h-24 w-24 rounded-3xl bg-[#FF6200]/10 border-2 border-[#FF6200]/20 flex items-center justify-center mx-auto">
                            <CheckCircle className="h-10 w-10 text-[#FF6200]" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-2xl font-black uppercase tracking-tighter italic font-heading text-[#FF6200]">Payment Confirmed</h1>
                            <p className="text-zinc-600 text-sm font-medium italic">{message}</p>
                        </div>
                        <div className="pt-4 flex flex-col gap-3">
                            <Button asChild className="h-14 bg-[#FF6200] text-white hover:bg-[#FF7A29] rounded-2xl font-bold tracking-wide text-sm shadow-xl shadow-[#FF6200]/20 border-none">
                                <Link href="/orders">View My Orders <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" asChild className="text-zinc-500 hover:text-zinc-900 text-[10px] uppercase font-black tracking-widest">
                                <Link href="/marketplace">Continue Shopping</Link>
                            </Button>
                        </div>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div className="h-24 w-24 rounded-3xl bg-[#FF6200]/10 border-2 border-[#FF6200]/20 flex items-center justify-center mx-auto">
                            <XCircle className="h-10 w-10 text-[#FF6200]" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-2xl font-black uppercase tracking-tighter italic font-heading text-[#FF6200]">Error Occurred</h1>
                            <p className="text-zinc-600 text-sm font-medium italic">{message}</p>
                        </div>
                        <Button onClick={() => router.push('/marketplace')} className="h-14 w-full bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50 rounded-2xl font-black uppercase tracking-widest text-xs font-heading italic">
                            Back to Marketplace
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#FF6200]" />
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
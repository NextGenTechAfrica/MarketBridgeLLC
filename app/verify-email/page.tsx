'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, MailCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { refreshUser } = useAuth();
    const supabase = createClient();
    
    const email = searchParams?.get('email') || '';
    const [cooldown, setCooldown] = useState(0);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleResend = async () => {
        if (cooldown > 0 || !email) return;

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            });

            if (error) throw error;
            toast('Verification link resent to your email!', 'success');
            setCooldown(60);
        } catch (error: any) {
            toast(error.message || 'Failed to resend link', 'error');
        }
    };

    const handleCheckVerification = async () => {
        setVerifying(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email_confirmed_at) {
                await refreshUser();
                // We don't have role stored safely locally, but they'll be redirected by middleware or we can just push to marketplace
                router.push('/marketplace');
            } else {
                toast('Your email has not been verified yet. Please check your inbox.', 'error');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 py-8 md:py-12 bg-[#0a0a0a] text-white relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] max-w-[600px] h-[300px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
            <div className="w-full max-w-lg bg-[#1a1a1a] border border-[#2a2a2a] shadow-2xl rounded-3xl p-8 md:p-12 relative z-10 text-center space-y-6">
                
                <div className="mx-auto w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20 mb-6">
                    <MailCheck className="w-10 h-10 text-orange-500" />
                </div>
                
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic font-heading leading-none">
                    Check Your <span className="text-orange-500">Email</span>
                </h2>
                
                <p className="text-gray-400 font-bold text-sm leading-relaxed">
                    We've sent a verification link to <br/>
                    <span className="text-white font-black">{email}</span>
                </p>

                <p className="text-[10px] text-gray-500 uppercase tracking-widest pb-4">
                    Click the link in the email to activate your account.
                </p>

                <div className="flex flex-col gap-4">
                    <Button 
                        onClick={handleCheckVerification} 
                        disabled={verifying}
                        className="w-full h-14 bg-orange-500 text-black hover:bg-orange-600 font-black uppercase tracking-widest rounded-xl"
                    >
                        {verifying ? <Loader2 className="animate-spin h-5 w-5" /> : (
                            <>I've verified my email <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                    
                    <Button 
                        onClick={handleResend} 
                        disabled={cooldown > 0}
                        variant="outline"
                        className="w-full h-14 font-black uppercase tracking-widest rounded-xl border-[#2a2a2a] bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
                    >
                        {cooldown > 0 ? `Resend Link (${cooldown}s)` : 'Resend Link'}
                    </Button>

                    <div className="pt-2">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { Loader2, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const supabase = createClient();
    const { toast } = useToast();

    // ─── Preserved exactly: Supabase password reset flow ─────────────────────
    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setIsSent(true);
            toast('Recovery Code Sent', 'success');
        } catch (err: any) {
            toast(err.message || 'Request failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#F7F7F7] dark:bg-[#0B1120]">
            {/* Left branding panel */}
            <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#0A1628] p-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsla(23,100%,50%,0.12)_0%,_transparent_60%)] pointer-events-none" />
                <div className="relative z-10">
                    <Logo variant="sidebar" size="md" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            Secure &<br />
                            <span className="text-[#FF6200]">always accessible.</span>
                        </h2>
                        <p className="text-white/50 text-sm leading-relaxed">
                            We'll send a secure reset link to your email address so you can regain access immediately.
                        </p>
                    </div>
                </div>
                <p className="relative z-10 text-white/20 text-xs">A platform operated by NextGen Tech</p>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-[400px]">
                    {/* Mobile logo */}
                    <div className="lg:hidden mb-8 flex justify-center">
                        <Logo size="lg" />
                    </div>

                    {isSent ? (
                        /* ── Success state ── */
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A password reset link has been sent to <span className="font-medium text-foreground">{email}</span>. Check your inbox and follow the link.
                                </p>
                            </div>
                            <Button
                                onClick={() => setIsSent(false)}
                                variant="outline"
                                className="h-10 font-semibold text-sm rounded-xl border-zinc-200 dark:border-white/10 px-6"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Send again
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                <Link href="/login" className="text-[#FF6200] font-semibold hover:underline flex items-center justify-center gap-1">
                                    <ArrowLeft className="h-3 w-3" /> Return to Login
                                </Link>
                            </p>
                        </div>
                    ) : (
                        /* ── Form state ── */
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
                                <p className="text-sm text-muted-foreground">
                                    Enter your email address and we'll send you a reset link.
                                </p>
                            </div>

                            <form onSubmit={handleReset} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full h-11 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl shadow-[0_4px_20px_rgba(255,98,0,0.25)] flex items-center justify-center gap-2 transition-all"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    ) : (
                                        <>Send Reset Link <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-muted-foreground">
                                <Link
                                    href="/login"
                                    className="text-[#FF6200] font-semibold hover:underline flex items-center justify-center gap-1.5"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

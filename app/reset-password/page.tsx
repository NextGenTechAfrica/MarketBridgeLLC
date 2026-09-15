'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

function ResetPasswordContent() {
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();

    // ─── Preserved exactly: Supabase updateUser + validation + redirect ───────
    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== passwordConfirm) {
            toast('Passwords do not match', 'error');
            return;
        }

        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passRegex.test(password)) {
            toast('Password must be at least 8 characters with 1 uppercase letter, 1 lowercase letter, and 1 number.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setIsSuccess(true);
            toast('Security credentials updated', 'success');

            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            toast(err.message || 'Update failed', 'error');
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
                            Your account,<br />
                            <span className="text-[#FF6200]">secured.</span>
                        </h2>
                        <p className="text-white/50 text-sm leading-relaxed">
                            Choose a strong password to keep your MarketBridge account safe.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {[
                            'At least 8 characters',
                            'One uppercase letter',
                            'One number',
                        ].map(rule => (
                            <div key={rule} className="flex items-center gap-2.5 text-sm text-white/50">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6200] shrink-0" />
                                {rule}
                            </div>
                        ))}
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

                    {isSuccess ? (
                        /* ── Success state ── */
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-foreground">Password updated</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Your password has been updated successfully. Redirecting you to login…
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-[#FF6200]" />
                                Redirecting…
                            </div>
                        </div>
                    ) : (
                        /* ── Form state ── */
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
                                <p className="text-sm text-muted-foreground">
                                    Enter your new password below. Make it strong.
                                </p>
                            </div>

                            <form onSubmit={handleReset} className="space-y-4">
                                {/* New password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full h-11 pl-10 pr-11 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={passwordConfirm}
                                            onChange={(e) => setPasswordConfirm(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Password match indicator */}
                                {passwordConfirm.length > 0 && (
                                    <p className={`text-xs font-medium flex items-center gap-1.5 ${password === passwordConfirm ? 'text-emerald-500' : 'text-red-400'}`}>
                                        {password === passwordConfirm
                                            ? <><CheckCircle2 className="h-3.5 w-3.5" /> Passwords match</>
                                            : 'Passwords do not match'}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isLoading || !password || password !== passwordConfirm}
                                    className="w-full h-11 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl shadow-[0_4px_20px_rgba(255,98,0,0.25)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    ) : (
                                        <>Update Password <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-muted-foreground">
                                Remember your password?{' '}
                                <Link href="/login" className="text-[#FF6200] font-semibold hover:underline">Sign In</Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}

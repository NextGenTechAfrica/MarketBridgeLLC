'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2, Lock, User as UserIcon, Globe, AlertTriangle, ArrowRight, ArrowLeft, Store, ShieldAlert } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { normalizeIdentifier } from '@/lib/auth/utils';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ThemeToggle';

type Step = 'role' | 'buyer-credentials' | 'seller-google';
type Role = 'buyer' | 'seller';

function LoginContent() {
    const supabase = createClient();
    const { signInWithGoogle, refreshUser, user, sessionUser, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams?.get('redirect') || searchParams?.get('next');

    const [currentStep, setCurrentStep] = useState<Step>('role');
    const [role, setRole] = useState<Role>('buyer');
    const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoadingRole, setGoogleLoadingRole] = useState<Role | null>(null);
    const [expandedRole, setExpandedRole] = useState<Role | null>(null);
    const [error, setError] = useState('');
    const [requireCaptcha, setRequireCaptcha] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        if (!loading && sessionUser && user) {
            const dest = redirectUrl || getRoleDestination(user.role);
            router.replace(dest);
        }
    }, [user, sessionUser, loading, router, redirectUrl]);

    useEffect(() => {
        const emailParam = searchParams?.get('email');
        if (emailParam) { setFormData(prev => ({ ...prev, email: decodeURIComponent(emailParam) })); setCurrentStep('buyer-credentials'); }
        const roleParam = searchParams?.get('role');
        if (roleParam === 'seller' || roleParam === 'student_seller') { setRole('seller'); setActiveTab('seller'); }
        else if (roleParam === 'buyer' || roleParam === 'student_buyer') { setRole('buyer'); setActiveTab('buyer'); }
    }, [searchParams]);

    function getRoleDestination(r: string) {
        if (r === 'ceo') return '/admin/ceo';
        if (r === 'operations_admin') return '/admin/operations';
        if (r === 'marketing_admin') return '/admin/marketing';
        if (r === 'systems_admin' || r === 'technical_admin') return '/admin/systems';
        if (r === 'it_support') return '/admin/it-support';
        if (['admin'].includes(r)) return '/admin';
        if (r === 'seller' || r === 'student_seller') return '/seller/dashboard';
        return '/marketplace';
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); if (error) setError(''); };

    const handleGoogleLogin = async (selectedRole: Role) => {
        setGoogleLoadingRole(selectedRole);
        setError('');
        try {
            const mappedRole = selectedRole === 'seller' ? 'seller' : 'buyer';
            const next = redirectUrl || (selectedRole === 'seller' ? '/seller/dashboard' : '/marketplace');
            await signInWithGoogle(`${window.location.origin}/auth/callback?role=${mappedRole}&next=${next}`);
        } catch (err: any) { setError(err.message || 'Google Sign-In failed.'); setGoogleLoadingRole(null); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const { loginSchema } = await import('@/lib/validations');
        const parsed = loginSchema.safeParse(formData);
        if (!parsed.success) {
            setError(parsed.error.errors[0].message);
            return;
        }

        setIsLoading(true);
        try {
            const emailToUse = normalizeIdentifier(formData.email);
            const { data: userRecord } = await supabase.from('users').select('id, login_attempts, locked_until').eq('email', emailToUse).maybeSingle();
            if (userRecord?.locked_until) {
                const lockTime = new Date(userRecord.locked_until).getTime();
                if (Date.now() < lockTime) { setError(`Account locked. Try again in ${Math.ceil((lockTime - Date.now()) / 60000)} minutes.`); setIsLoading(false); return; }
            }
            const loginPromise = supabase.auth.signInWithPassword({ email: emailToUse, password: formData.password });
            const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timed out.')), 8000));
            const { data, error: signInError } = await Promise.race([loginPromise, timeoutPromise as any]);

            if (signInError) {
                const msg = signInError.message?.toLowerCase() ?? '';
                if (userRecord && (msg.includes('invalid login') || msg.includes('invalid credentials'))) {
                    const attemptsCount = (userRecord.login_attempts || 0) + 1;
                    let updates: any = { login_attempts: attemptsCount };
                    if (attemptsCount >= 5) { updates.locked_until = new Date(Date.now() + 15 * 60000).toISOString(); setError('Account locked for 15 minutes.'); }
                    else if (attemptsCount >= 3) { setRequireCaptcha(true); setError('Incorrect email or password.'); }
                    else { setError('Incorrect email or password.'); }
                    await supabase.from('users').update(updates).eq('email', emailToUse);
                } else if (msg.includes('email not confirmed')) { setError('Please verify your email first.'); }
                else { setError(signInError.message || 'Login failed.'); }
                return;
            }
            if (userRecord?.login_attempts && userRecord.login_attempts > 0) { await supabase.from('users').update({ login_attempts: 0, locked_until: null }).eq('email', emailToUse); }
            if (!data?.user) { setError('Login failed.'); return; }

            let userRole = data.user.user_metadata?.role as string;
            const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).maybeSingle();
            if (!userData?.role) {
                const meta = data.user.user_metadata || {};
                const healedRole = meta.role || 'buyer';
                await supabase.from('users').upsert({ id: data.user.id, email: data.user.email ?? '', role: healedRole, display_name: `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || data.user.email?.split('@')[0] || 'User', email_verified: !!data.user.email_confirmed_at, is_verified: false, is_verified_seller: false, coins_balance: healedRole === 'buyer' ? 100 : 0 }, { onConflict: 'id' });
                userRole = healedRole;
            } else { userRole = userData.role || userRole; }
            refreshUser(data.user.id).catch(err => console.warn('Context sync error:', err));
            router.replace(redirectUrl || getRoleDestination(userRole));
        } catch (err: any) { setError(err.message || 'Login failed.'); }
        finally { setIsLoading(false); }
    };

    if (loading) {
        return <div className="min-h-screen bg-[#0A1628] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" /></div>;
    }

    // ─── Shared layout wrapper ────────────────────────────────────────────────
    const AuthShell = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen flex bg-[#F7F7F7] dark:bg-[#0B1120]">
            {/* Left panel — branding */}
            <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#0A1628] p-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsla(23,100%,50%,0.12)_0%,_transparent_60%)] pointer-events-none" />
                <div className="relative z-10">
                    <Logo variant="sidebar" size="md" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            Nigeria's trusted<br />
                            <span className="text-[#FF6200]">marketplace.</span>
                        </h2>
                        <p className="text-white/50 text-sm leading-relaxed">
                            Buy and sell securely with verified sellers across campuses and communities.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {[
                            { label: 'Escrow-protected payments' },
                            { label: 'Verified sellers' },
                            { label: 'Trusted campus community' },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-2.5 text-sm text-white/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6200] shrink-0" />
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>
                <p className="relative z-10 text-white/20 text-xs">A platform operated by NextGen Tech</p>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto relative">
                <div className="absolute top-5 right-5 z-20">
                    <ThemeToggle />
                </div>
                <div className="w-full max-w-[420px]">
                    {/* Mobile logo */}
                    <div className="lg:hidden mb-8 flex justify-center">
                        <Logo size="lg" />
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );

    // ─── STEP 1: Role Selector ────────────────────────────────────────────────
    if (currentStep === 'role') {
        return (
            <AuthShell>
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                        <p className="text-sm text-muted-foreground">Sign in to your MarketBridge account</p>
                    </div>

                    {/* Buyer / Seller tab */}
                    <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl border border-zinc-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => { setActiveTab('buyer'); setRole('buyer'); }}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                                activeTab === 'buyer'
                                    ? "bg-white dark:bg-[#0F1A2E] text-foreground shadow-sm border border-zinc-200 dark:border-white/10"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <UserIcon className="h-4 w-4" />
                            Buyer
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('seller'); setRole('seller'); }}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                                activeTab === 'seller'
                                    ? "bg-white dark:bg-[#0F1A2E] text-foreground shadow-sm border border-zinc-200 dark:border-white/10"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Store className="h-4 w-4" />
                            Seller
                        </button>
                    </div>

                    {activeTab === 'buyer' ? (
                        <div className="space-y-3">
                            {/* Google */}
                            <Button
                                type="button"
                                onClick={() => handleGoogleLogin('buyer')}
                                disabled={googleLoadingRole === 'buyer'}
                                className="w-full h-11 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 shadow-sm font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all"
                            >
                                {googleLoadingRole === 'buyer' ? <Loader2 className="animate-spin h-4 w-4" /> : (
                                    <>
                                        <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                        Continue with Google
                                    </>
                                )}
                            </Button>

                            <div className="relative flex items-center justify-center py-1">
                                <div className="absolute inset-x-0 h-px bg-zinc-200 dark:bg-white/10" />
                                <span className="relative bg-[#F7F7F7] dark:bg-[#0B1120] px-3 text-xs text-muted-foreground">or</span>
                            </div>

                            <Button
                                type="button"
                                onClick={() => { setRole('buyer'); setCurrentStep('buyer-credentials'); }}
                                variant="outline"
                                className="w-full h-11 font-semibold text-sm rounded-xl text-zinc-900 dark:text-white border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10"
                            >
                                Sign in with Email
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-[#FF6200]/5 border border-[#FF6200]/20 rounded-xl">
                                <p className="text-sm text-foreground/70 leading-relaxed">
                                    Sellers sign in with their verified university Google account to access their store.
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => handleGoogleLogin('seller')}
                                disabled={googleLoadingRole === 'seller'}
                                className="w-full h-11 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(255,98,0,0.25)] transition-all"
                            >
                                {googleLoadingRole === 'seller' ? <Loader2 className="animate-spin h-4 w-4" /> : (
                                    <>
                                        <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                        Sign in with Google
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {error && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                        No account?{' '}
                        <Link href="/signup" className="text-[#FF6200] font-semibold hover:underline">Create one free</Link>
                    </p>
                </div>
            </AuthShell>
        );
    }

    // ─── STEP 2b: Seller Google-Only (direct deep-link) ───────────────────────
    if (currentStep === 'seller-google') {
        return (
            <AuthShell>
                <div className="space-y-6">
                    <button
                        type="button"
                        onClick={() => setCurrentStep('role')}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-foreground">Seller Sign In</h1>
                        <p className="text-sm text-muted-foreground">Sign in with your verified university Google account</p>
                    </div>

                    {error && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <Button
                        type="button"
                        onClick={() => handleGoogleLogin('seller')}
                        disabled={googleLoadingRole !== null}
                        className="w-full h-11 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(255,98,0,0.25)] transition-all"
                    >
                        {googleLoadingRole ? <Loader2 className="animate-spin h-4 w-4" /> : (
                            <>
                                <Globe className="h-4 w-4" /> Sign In with Google
                            </>
                        )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        No seller account?{' '}
                        <Link href="/signup?role=seller" className="text-[#FF6200] font-semibold hover:underline">Sign Up as Seller</Link>
                    </p>
                </div>
            </AuthShell>
        );
    }

    // ─── STEP 2a: Buyer Email/Password Form ───────────────────────────────────
    return (
        <AuthShell>
            <div className="space-y-6">
                <button
                    type="button"
                    onClick={() => setCurrentStep('role')}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
                    <p className="text-sm text-muted-foreground">Enter your email and password</p>
                </div>

                {error && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Email Address</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                autoFocus
                                placeholder="you@example.com"
                                className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Password</label>
                            <Link href="/forgot-password" className="text-xs text-[#FF6200] hover:underline font-medium">Forgot password?</Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
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

                    {/* Remember me */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember"
                            className="h-4 w-4 rounded border-zinc-300 dark:border-white/20 text-[#FF6200] cursor-pointer accent-[#FF6200]"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">Remember me</label>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl shadow-[0_4px_20px_rgba(255,98,0,0.25)] flex items-center justify-center gap-2 transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                </form>

                <div className="relative flex items-center justify-center py-1">
                    <div className="absolute inset-x-0 h-px bg-zinc-200 dark:bg-white/10" />
                    <span className="relative bg-[#F7F7F7] dark:bg-[#0B1120] px-3 text-xs text-muted-foreground">or</span>
                </div>

                <Button
                    type="button"
                    onClick={() => handleGoogleLogin(role)}
                    disabled={googleLoadingRole !== null}
                    className="w-full h-11 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 shadow-sm font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all"
                >
                    {googleLoadingRole ? <Loader2 className="animate-spin h-4 w-4" /> : (
                        <>
                            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Continue with Google
                        </>
                    )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    No account?{' '}
                    <Link href="/signup" className="text-[#FF6200] font-semibold hover:underline">Create one free</Link>
                </p>
            </div>
        </AuthShell>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A1628] flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-[#FF6200]" /></div>}>
            <LoginContent />
        </Suspense>
    );
}

'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { normalizeIdentifier } from '@/lib/auth/utils';
import { Loader2, ArrowRight, ArrowLeft, User as UserIcon, Globe, Mail, GraduationCap, AlertTriangle, ShieldCheck, Store, Lock } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

type Step = 'role' | 'buyer-form' | 'seller-google';
type Role = 'student_buyer' | 'student_seller';

// ─── Preserved exactly from original ─────────────────────────────────────────
const UNIVERSITIES = [
    'Baze University', 'Nile University of Nigeria', 'Veritas University',
    'African University of Science & Technology', 'European University of Nigeria',
    'Philomath University', 'Cosmopolitan University',
    'Prime University Abuja', 'Bingham University', 'Other'
];

const APPROVED_UNIVERSITIES = [
    { name: 'Nile University', domain: 'nileuniversity.edu.ng' },
    { name: 'Baze University', domain: 'bazeuniversity.edu.ng' },
    { name: 'Veritas University', domain: 'veritas.edu.ng' },
    { name: 'AUST', domain: 'aust.edu.ng' },
    { name: 'Evangel University', domain: 'eun.edu.ng' },
    { name: 'Philomath University', domain: 'philomath.edu.ng' },
    { name: 'Cosmopolitan University', domain: 'cosmopolitan.edu.ng' },
    { name: 'Prime University', domain: 'primeuniversity.edu.ng' },
    { name: 'Bingham University', domain: 'binghamuni.edu.ng' },
];

function SignupContent() {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signInWithGoogle } = useAuth();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState<Step>('role');
    const [role, setRole] = useState<Role>('student_buyer');
    const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');
    const [loadingBuyerGoogle, setLoadingBuyerGoogle] = useState(false);
    const [loadingSellerGoogle, setLoadingSellerGoogle] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sellerError, setSellerError] = useState('');
    const [sellerErrorEmail, setSellerErrorEmail] = useState('');

    const [formData, setFormData] = useState({
        fullName: '', email: '', password: '', passwordConfirm: '',
        university: '', otherUniversity: '',
        terms: false
    });

    // ─── Preserved exactly: handle errors from callback redirect ─────────────
    useEffect(() => {
        const err = searchParams?.get('seller_error') || searchParams?.get('error');
        const msg = searchParams?.get('message');
        const email = searchParams?.get('email');

        if (err === 'invalid_domain' || err === 'unapproved_university') {
            setSellerError(
                err === 'invalid_domain'
                    ? `Only verified Abuja private university emails ending in .edu.ng are accepted. Your email ${email || ''} does not qualify.`
                    : `Your email domain is from an unapproved university. Please check our supported list.`
            );
            setSellerErrorEmail(email || '');
            setCurrentStep('role');
            setActiveTab('seller');
            setRole('student_seller');
        } else if (err || msg) {
            setSellerError(msg || err || 'Authentication failed. Please try again.');
        }
    }, [searchParams]);

    // ─── Preserved exactly: handle role param from URL ────────────────────────
    useEffect(() => {
        const roleParam = searchParams?.get('role');
        if (roleParam === 'seller' || roleParam === 'student_seller') {
            setActiveTab('seller');
            setRole('student_seller');
        }
    }, [searchParams]);

    const clearError = () => {
        setSellerError('');
        setLoadingBuyerGoogle(false);
        setLoadingSellerGoogle(false);
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        url.searchParams.delete('seller_error');
        window.history.replaceState({}, '', url.toString());
    };

    // ─── Preserved exactly: safety timeout for spinner ────────────────────────
    useEffect(() => {
        if (loadingBuyerGoogle || loadingSellerGoogle) {
            const timer = setTimeout(() => {
                setLoadingBuyerGoogle(false);
                setLoadingSellerGoogle(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [loadingBuyerGoogle, loadingSellerGoogle]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    // ─── Preserved exactly: Google auth handler ───────────────────────────────
    const handleGoogleAuth = async (targetRole: Role) => {
        if (targetRole === 'student_buyer') setLoadingBuyerGoogle(true);
        else setLoadingSellerGoogle(true);

        setSellerError('');
        try {
            await signInWithGoogle(`${window.location.origin}/auth/callback?role=${targetRole}`);
        } catch (error: any) {
            toast(error.message || 'Google Auth failed', 'error');
            setLoadingBuyerGoogle(false);
            setLoadingSellerGoogle(false);
        }
    };

    // ─── Preserved exactly: signup form handler ───────────────────────────────
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.passwordConfirm) { toast('Passwords do not match.', 'error'); return; }
        if (!formData.terms) { toast('You must accept the terms and conditions.', 'error'); return; }

        let finalUniversity: string | null = null;
        if (formData.university === 'Other') {
            if (!formData.otherUniversity.trim()) {
                toast('Please specify your university.', 'error');
                return;
            }
            finalUniversity = formData.otherUniversity.trim();
        } else if (formData.university) {
            finalUniversity = formData.university;
        }

        const { signupSchema } = await import('@/lib/validations');
        const [firstName, ...rest] = formData.fullName.trim().split(' ');
        const lastName = rest.join(' ') || 'User';

        const parsed = signupSchema.safeParse({
            email: formData.email,
            password: formData.password,
            firstName: firstName || '',
            lastName
        });

        if (!parsed.success) {
            toast(parsed.error.errors[0].message, 'error');
            return;
        }

        const normalizedEmail = normalizeIdentifier(formData.email);

        setIsLoading(true);
        try {
            const { data: existingUser } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
            if (existingUser) { toast('Account already exists. Please log in.', 'error'); router.push(`/login?email=${encodeURIComponent(normalizedEmail)}`); return; }

            const { data, error } = await supabase.auth.signUp({
                email: normalizedEmail, password: formData.password,
                options: { data: { full_name: formData.fullName, role: 'buyer' }, emailRedirectTo: `${window.location.origin}/auth/callback` }
            });
            if (error) throw error;
            if (data.user) {
                const dbRole = 'buyer';

                const { error: upsertError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    email: normalizedEmail,
                    display_name: formData.fullName.trim(),
                    role: dbRole,
                    university: finalUniversity,
                    email_verified: false,
                    is_verified: false,
                    onboarding_complete: true,
                    created_at: new Date().toISOString()
                });

                if (upsertError) {
                    console.error('Signup Profile Upsert Error:', upsertError);
                    throw new Error(`Database error saving new user profile: ${upsertError.message}`);
                }

                router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
            }
        } catch (error: any) { toast(error.message || 'Registration failed', 'error'); }
        finally { setIsLoading(false); }
    };

    // ─── Shared layout wrapper ────────────────────────────────────────────────
    const AuthShell = ({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) => (
        <div className="min-h-screen flex bg-[#F7F7F7] dark:bg-[#0B1120]">
            {/* Left branding panel */}
            <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#0A1628] p-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsla(23,100%,50%,0.12)_0%,_transparent_60%)] pointer-events-none" />
                <div className="relative z-10">
                    <Logo variant="sidebar" size="md" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            Join Nigeria's trusted<br />
                            <span className="text-[#FF6200]">marketplace.</span>
                        </h2>
                        <p className="text-white/50 text-sm leading-relaxed">
                            Whether you're buying or selling, MarketBridge connects you with a trusted community.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {[
                            { label: 'Free to create an account' },
                            { label: 'Escrow-protected payments' },
                            { label: 'Verified seller community' },
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

            {/* Right form panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto">
                <div className="w-full max-w-[440px] py-8">
                    <div className="lg:hidden mb-8 flex justify-center">
                        <Logo size="lg" />
                    </div>
                    {title && (
                        <div className="mb-6 space-y-1">
                            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );

    // ─── STEP 1: Role Selection ───────────────────────────────────────────────
    if (currentStep === 'role') {
        return (
            <AuthShell title="Create your account" subtitle="Join MarketBridge — it's free">
                <div className="space-y-5">
                    {/* Error from callback redirect */}
                    {sellerError && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm mb-1">
                                <AlertTriangle className="h-4 w-4 shrink-0" /> Authentication Failed
                            </div>
                            <p className="text-sm text-red-600/80 dark:text-red-400/80 leading-relaxed">{sellerError}</p>
                            <button onClick={clearError} className="mt-2 text-sm text-[#FF6200] font-semibold flex items-center gap-1 hover:underline">
                                Try Again <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>
                    )}

                    {/* Buyer / Seller tab */}
                    <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl border border-zinc-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => { setActiveTab('buyer'); setRole('student_buyer'); }}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                                activeTab === 'buyer'
                                    ? "bg-white dark:bg-[#0F1A2E] text-foreground shadow-sm border border-zinc-200 dark:border-white/10"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <UserIcon className="h-4 w-4" /> Buyer
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('seller'); setRole('student_seller'); }}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                                activeTab === 'seller'
                                    ? "bg-white dark:bg-[#0F1A2E] text-foreground shadow-sm border border-zinc-200 dark:border-white/10"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Store className="h-4 w-4" /> Seller
                        </button>
                    </div>

                    {activeTab === 'buyer' ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Shop products, purchase services, and pay securely via escrow.
                            </p>

                            {/* Google signup */}
                            <Button
                                type="button"
                                onClick={() => handleGoogleAuth('student_buyer')}
                                disabled={loadingBuyerGoogle || loadingSellerGoogle}
                                className="w-full h-11 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 shadow-sm font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all"
                            >
                                {loadingBuyerGoogle ? <Loader2 className="animate-spin h-4 w-4" /> : (
                                    <>
                                        <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                        Sign up with Google
                                    </>
                                )}
                            </Button>

                            <div className="relative flex items-center justify-center py-1">
                                <div className="absolute inset-x-0 h-px bg-zinc-200 dark:bg-white/10" />
                                <span className="relative bg-[#F7F7F7] dark:bg-[#0B1120] px-3 text-xs text-muted-foreground">or</span>
                            </div>

                            <Button
                                type="button"
                                onClick={() => { setRole('student_buyer'); setCurrentStep('buyer-form'); }}
                                variant="outline"
                                className="w-full h-11 font-semibold text-sm rounded-xl border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5"
                            >
                                Sign up with Email
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-[#FF6200]/5 border border-[#FF6200]/20 rounded-xl">
                                <p className="text-sm text-foreground/70 leading-relaxed">
                                    To list products and start selling, verify your identity via Google Sign-In using your official student email.
                                </p>
                            </div>

                            <Button
                                type="button"
                                onClick={() => handleGoogleAuth('student_seller')}
                                disabled={loadingBuyerGoogle || loadingSellerGoogle}
                                className="w-full h-11 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(255,98,0,0.25)] transition-all"
                            >
                                {loadingSellerGoogle ? <Loader2 className="animate-spin h-4 w-4" /> : (
                                    <>
                                        <ShieldCheck className="h-4 w-4" /> Sign Up with Google
                                    </>
                                )}
                            </Button>

                            {/* Approved universities — preserved from original */}
                            <div className="border-t border-zinc-200 dark:border-white/10 pt-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Approved Universities</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {APPROVED_UNIVERSITIES.map(u => (
                                        <div key={u.domain} className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                            <span className="h-1 w-1 rounded-full bg-[#FF6200] shrink-0" />
                                            <span className="truncate">{u.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#FF6200] font-semibold hover:underline">Sign In</Link>
                    </p>
                </div>
            </AuthShell>
        );
    }

    // ─── Seller error state (preserved from original) ─────────────────────────
    if (sellerError) {
        return (
            <AuthShell>
                <div className="space-y-6">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-foreground">Verification Failed</h2>
                        <p className="text-sm text-muted-foreground">
                            We couldn't identify your university from{' '}
                            <span className="text-foreground font-medium">{sellerErrorEmail}</span>.
                        </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl">
                        <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{sellerError}</p>
                    </div>
                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            onClick={() => { setSellerError(''); setSellerErrorEmail(''); setCurrentStep('role'); setRole('student_buyer'); }}
                            className="w-full h-11 font-semibold text-sm rounded-xl border-zinc-200 dark:border-white/10"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account Selection
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            Think this is an error?{' '}
                            <a href="mailto:support@marketbridge.com.ng" className="text-[#FF6200] hover:underline font-medium">Contact Support</a>
                        </p>
                    </div>
                </div>
            </AuthShell>
        );
    }

    // ─── STEP 2a: Buyer Email Registration Form ───────────────────────────────
    return (
        <AuthShell title="Create your account" subtitle="Fill in your details to get started">
            <form onSubmit={handleSignup} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Full Name</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            name="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            placeholder="John Doe"
                            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="you@example.com"
                            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                        />
                    </div>
                </div>

                {/* University */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">University</label>
                    <div className="relative">
                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <select
                            name="university"
                            value={formData.university}
                            onChange={handleChange}
                            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all appearance-none"
                        >
                            <option value="">Not a student / Skip</option>
                            {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

                {formData.university === 'Other' && (
                    <input
                        name="otherUniversity"
                        type="text"
                        value={formData.otherUniversity}
                        onChange={handleChange}
                        required
                        placeholder="Specify your university"
                        className="w-full h-11 px-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                    />
                )}

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Min 8 chars"
                                className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Confirm</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                name="passwordConfirm"
                                type="password"
                                value={formData.passwordConfirm}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6200]/30 focus:border-[#FF6200]/50 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2.5 pt-1">
                    <Checkbox
                        id="terms"
                        name="terms"
                        checked={formData.terms}
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, terms: checked as boolean }))}
                        className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                        I agree to the{' '}
                        <Link href="/terms" className="text-[#FF6200] hover:underline font-medium">Terms</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-[#FF6200] hover:underline font-medium">Privacy Policy</Link>.
                    </label>
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-sm rounded-xl shadow-[0_4px_20px_rgba(255,98,0,0.25)] flex items-center justify-center gap-2 transition-all"
                >
                    {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
                </Button>
            </form>

            <div className="relative flex items-center justify-center py-2 mt-2">
                <div className="absolute inset-x-0 h-px bg-zinc-200 dark:bg-white/10" />
                <span className="relative bg-[#F7F7F7] dark:bg-[#0B1120] px-3 text-xs text-muted-foreground">or</span>
            </div>

            <Button
                type="button"
                onClick={() => handleGoogleAuth('student_buyer')}
                disabled={loadingBuyerGoogle}
                className="w-full h-11 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 shadow-sm font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all"
            >
                {loadingBuyerGoogle ? <Loader2 className="animate-spin h-4 w-4" /> : (
                    <>
                        <Globe className="h-4 w-4" /> Sign up with Google
                    </>
                )}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-[#FF6200] font-semibold hover:underline">Sign In</Link>
            </p>
        </AuthShell>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A1628] flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-[#FF6200]" /></div>}>
            <SignupContent />
        </Suspense>
    );
}

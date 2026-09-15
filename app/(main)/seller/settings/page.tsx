'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2,
    CheckCircle,
    User,
    Building,
    Shield,
    Bell,
    MapPin,
    Phone,
    MessageCircle,
    Tag,
    Banknote,
    Landmark,
    ArrowLeft,
    AlertTriangle,
    Gift,
    Copy,
    Share2,
    Users,
    Clock,
    CheckCircle2,
    ExternalLink,
    ShieldCheck
} from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { NIGERIAN_STATES } from '@/lib/constants';

const supabase = createClient();

export default function SettingsPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const router = useRouter();
    const [updating, setUpdating] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        location: '',
        photoURL: '',
        phone_number: '',
        businessName: '',
        storeType: '',
    });

    const [bankData, setBankData] = useState({
        bankName: '',
        accountNumber: '',
        accountName: ''
    });

    // Notification preferences
    const [notifPrefs, setNotifPrefs] = useState({
        notif_order_updates: true,
        notif_new_messages: true,
        notif_offer_updates: true,
        notif_marketing_emails: false,
    });
    const [savingNotif, setSavingNotif] = useState<string | null>(null);
    const [notifSuccess, setNotifSuccess] = useState<string | null>(null);

    // Referral state
    const [referralCode, setReferralCode] = useState('');
    const [referralStats, setReferralStats] = useState({ total: 0, completed: 0, pending: 0, mcEarned: 0 });
    const [referralHistory, setReferralHistory] = useState<Array<{ id: string; referee_name: string; status: string; created_at: string; mc_rewarded: boolean }>>([]);
    const [referralLoading, setReferralLoading] = useState(true);
    const [codeCopied, setCodeCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                location: user.location || '',
                photoURL: user.photoURL || '',
                phone_number: user.phone_number || '',
                businessName: user.businessName || '',
                storeType: user.storeType || '',
            });

            // Fetch payout details
            const fetchBankDetails = async () => {
                const { data } = await supabase
                    .from('users')
                    .select('bank_name, account_number, account_name')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setBankData({
                        bankName: data.bank_name || '',
                        accountNumber: data.account_number || '',
                        accountName: data.account_name || ''
                    });
                }
            };
            fetchBankDetails();

            // Fetch notification preferences
            const fetchNotifPrefs = async () => {
                const { data } = await supabase
                    .from('users')
                    .select('notif_order_updates, notif_new_messages, notif_offer_updates, notif_marketing_emails')
                    .eq('id', user.id)
                    .single();
                if (data) {
                    setNotifPrefs({
                        notif_order_updates: data.notif_order_updates ?? true,
                        notif_new_messages: data.notif_new_messages ?? true,
                        notif_offer_updates: data.notif_offer_updates ?? true,
                        notif_marketing_emails: data.notif_marketing_emails ?? false,
                    });
                }
            };
            fetchNotifPrefs();

            // Fetch referral data
            const fetchReferralData = async () => {
                setReferralLoading(true);
                try {
                    // Get user's referral code
                    const { data: userData } = await supabase
                        .from('users')
                        .select('referral_code')
                        .eq('id', user.id)
                        .single();
                    if (userData?.referral_code) setReferralCode(userData.referral_code);

                    // Get referral records where this user is referrer
                    const { data: refs } = await supabase
                        .from('referrals')
                        .select('id, referee_id, status, created_at, mc_rewarded')
                        .eq('referrer_id', user.id)
                        .order('created_at', { ascending: false });

                    if (refs && refs.length > 0) {
                        const completed = refs.filter(r => r.status === 'completed').length;
                        const pending = refs.filter(r => r.status === 'pending').length;
                        const mcEarned = refs.filter(r => r.mc_rewarded).length * 50; // 50 MC per successful referral
                        setReferralStats({ total: refs.length, completed, pending, mcEarned });

                        // Fetch referee display names
                        const refereeIds = refs.map(r => r.referee_id).filter(Boolean);
                        const { data: refereeUsers } = await supabase
                            .from('users')
                            .select('id, display_name')
                            .in('id', refereeIds);

                        const nameMap = new Map((refereeUsers || []).map(u => [u.id, u.display_name || 'Anonymous']));
                        setReferralHistory(refs.map(r => ({
                            id: r.id,
                            referee_name: nameMap.get(r.referee_id) || 'Anonymous',
                            status: r.status,
                            created_at: r.created_at,
                            mc_rewarded: r.mc_rewarded,
                        })));
                    }
                } catch (err) {
                    console.error('Failed to fetch referral data:', err);
                } finally {
                    setReferralLoading(false);
                }
            };
            fetchReferralData();
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setUpdating(true);
        setSuccessMessage('');
        try {
            // Prepare update data
            const updateData: Record<string, string | null> = {
                display_name: formData.displayName,
                location: formData.location,
                photo_url: formData.photoURL,
                phone_number: formData.phone_number,
                updated_at: new Date().toISOString()
            };

            // Only add business fields for sellers to avoid DB constraint issues
            if (user.role === 'student_seller') {
                updateData.business_name = formData.businessName;
                updateData.store_type = formData.storeType;
            }

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', user.id);

            if (error) throw error;

            await refreshUser();
            setSuccessMessage('Settings updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: unknown) {
            console.error('Update settings error:', err);
            const message = err instanceof Error ? err.message : 'Failed to update settings';
            setSuccessMessage(`Error: ${message}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setUpdating(true);
        setSuccessMessage('');
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    bank_name: bankData.bankName,
                    account_number: bankData.accountNumber,
                    account_name: bankData.accountName,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            setSuccessMessage('Payout details updated!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            console.error('Update bank error:', err);
            setSuccessMessage('Error: Failed to update bank details');
        } finally {
            setUpdating(false);
        }
    };

    const toggleNotif = async (key: keyof typeof notifPrefs) => {
        if (!user || savingNotif) return;
        const newValue = !notifPrefs[key];
        // Optimistic update
        setNotifPrefs(prev => ({ ...prev, [key]: newValue }));
        setSavingNotif(key);
        try {
            const { error } = await supabase
                .from('users')
                .update({ [key]: newValue, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (error) throw error;
            setNotifSuccess(key);
            setTimeout(() => setNotifSuccess(null), 2000);
        } catch (err: any) {
            // Revert on failure
            setNotifPrefs(prev => ({ ...prev, [key]: !newValue }));
            console.error('Failed to update notification preference:', err);
        } finally {
            setSavingNotif(null);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Please log in to access settings</h1>
                <Button asChild className="mt-4 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-bold rounded-xl">
                    <a href="/login">Log In</a>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 pb-28">
            <div className="container mx-auto px-4 sm:px-6 max-w-5xl">

                {/* Header Navigation & Title */}
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-0 h-auto text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3"
                            onClick={() => {
                                if (user.role === 'ceo') window.location.href = '/ceo';
                                else if (user.role === 'admin' || user.role.includes('_admin')) window.location.href = '/admin';
                                else if (user.role === 'student_seller') window.location.href = '/seller/dashboard';
                                else window.location.href = '/';
                            }}
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to Dashboard
                        </Button>
                        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Account <span className="text-[#FF6200]">Settings</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                            Status: <span className="font-semibold text-slate-700 dark:text-slate-300">{user.isVerified ? 'Verified Merchant' : 'Verification Pending'}</span>
                        </p>
                    </div>

                    {successMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-5 py-2.5 rounded-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider">{successMessage}</span>
                        </div>
                    )}
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 w-full flex overflow-x-auto no-scrollbar rounded-2xl h-14 shadow-sm">
                        <TabsTrigger value="profile" className="gap-2 px-5 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-white font-bold uppercase text-[11px] tracking-wider transition-all">
                            <User className="h-3.5 w-3.5" />
                            Profile
                        </TabsTrigger>
                        {user.role === 'student_seller' && (
                            <>
                                <TabsTrigger value="business" className="gap-2 px-5 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-white font-bold uppercase text-[11px] tracking-wider transition-all">
                                    <Building className="h-3.5 w-3.5" />
                                    Business
                                </TabsTrigger>
                                <TabsTrigger value="financials" className="gap-2 px-5 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-white font-bold uppercase text-[11px] tracking-wider transition-all">
                                    <Banknote className="h-3.5 w-3.5" />
                                    Payouts
                                </TabsTrigger>
                            </>
                        )}
                        <TabsTrigger value="security" className="gap-2 px-5 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-white font-bold uppercase text-[11px] tracking-wider transition-all">
                            <Shield className="h-3.5 w-3.5" />
                            Security
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="gap-2 px-5 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-white font-bold uppercase text-[11px] tracking-wider transition-all">
                            <Bell className="h-3.5 w-3.5" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="referrals" className="gap-2 px-5 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-white font-bold uppercase text-[11px] tracking-wider transition-all">
                            <Gift className="h-3.5 w-3.5" />
                            Referrals
                        </TabsTrigger>
                    </TabsList>

                    {/* Identity Tab (Standard) */}
                    <TabsContent value="profile" className="animate-in fade-in duration-300">
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <CardHeader className="p-6 sm:p-8 pb-4">
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Personal Information</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Update your public profile details and contact information</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 space-y-6">
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Profile Photo</Label>
                                        <div className="w-36 h-36 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                                            <ImageUpload
                                                onImagesSelected={(urls) => setFormData({ ...formData, photoURL: urls[0] || '' })}
                                                defaultImages={formData.photoURL ? [formData.photoURL] : []}
                                                maxImages={1}
                                                bucketName="avatars"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 grid gap-5 w-full">
                                        <div className="grid gap-2">
                                            <Label htmlFor="displayName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="displayName"
                                                    className="h-12 pl-11 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-[#FF6200] font-medium"
                                                    value={formData.displayName}
                                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-5">
                                            <div className="grid gap-2">
                                                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone Number</Label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        id="phone"
                                                        className="h-12 pl-11 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-[#FF6200] font-medium"
                                                        value={formData.phone_number}
                                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location / State</Label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                                                    <select
                                                        id="location"
                                                        title="Select your state or location"
                                                        aria-label="Location / State"
                                                        className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-[#FF6200] focus:border-[#FF6200] outline-none font-medium appearance-none"
                                                        value={formData.location}
                                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                    >
                                                        <option value="">Select Location</option>
                                                        {NIGERIAN_STATES.map((state: string) => (
                                                            <option key={state} value={state}>{state === 'FCT - Abuja' ? 'FCT (Abuja)' : state}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 p-6 flex justify-end">
                                <Button onClick={handleUpdateProfile} disabled={updating} className="h-12 px-8 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-bold uppercase tracking-wider text-xs rounded-xl border-none shadow-sm">
                                    {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Save Profile
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* Business Tab (Sellers Only) */}
                    {user.role === 'student_seller' && (
                        <TabsContent value="business" className="animate-in fade-in duration-300">
                            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                <CardHeader className="p-6 sm:p-8 pb-4">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Business Details</CardTitle>
                                    <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Configure your storefront appearance and business setup</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 sm:p-8 space-y-6">
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="businessName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Store / Business Name</Label>
                                            <div className="relative">
                                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="businessName"
                                                    className="h-12 pl-11 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-[#FF6200] font-medium"
                                                    value={formData.businessName}
                                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="storeType" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Store Type</Label>
                                            <select
                                                id="storeType"
                                                title="Select your store type"
                                                aria-label="Store Type"
                                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-[#FF6200] focus:border-[#FF6200] outline-none font-medium appearance-none"
                                                value={formData.storeType}
                                                onChange={(e) => setFormData({ ...formData, storeType: e.target.value })}
                                            >
                                                <option value="online">Online Marketplace Store</option>
                                                <option value="physical">Physical Campus Store</option>
                                                <option value="both">Both (Online + Physical)</option>
                                            </select>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 p-6 flex justify-end">
                                    <Button onClick={handleUpdateProfile} disabled={updating} className="h-12 px-8 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-bold uppercase tracking-wider text-xs rounded-xl border-none shadow-sm">
                                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Update Business
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    )}

                    {/* Financials / Payouts Tab (Sellers Only) */}
                    {user.role === 'student_seller' && (
                        <TabsContent value="financials" className="animate-in fade-in duration-300">
                            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                <CardHeader className="p-6 sm:p-8 pb-4">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Bank Account & Payouts</CardTitle>
                                    <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Direct deposit account for sales revenue settlement</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 sm:p-8 space-y-6">
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="bankName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bank Name</Label>
                                            <div className="relative">
                                                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="bankName"
                                                    placeholder="e.g. GTBank, Kuda, Moniepoint"
                                                    className="h-12 pl-11 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-[#FF6200] font-medium"
                                                    value={bankData.bankName}
                                                    onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="accountNumber" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account Number</Label>
                                            <div className="relative">
                                                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="accountNumber"
                                                    placeholder="10-digit NUBAN"
                                                    className="h-12 pl-11 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-[#FF6200] font-medium font-mono"
                                                    value={bankData.accountNumber}
                                                    onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="accountName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="accountName"
                                                placeholder="Matching Bank Account Name"
                                                className="h-12 pl-11 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-[#FF6200] font-medium"
                                                value={bankData.accountName}
                                                onChange={(e) => setBankData({ ...bankData, accountName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 p-6 flex justify-end">
                                    <Button onClick={handleUpdateBank} disabled={updating} className="h-12 px-8 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-bold uppercase tracking-wider text-xs rounded-xl border-none shadow-sm">
                                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Save Payout Details
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    )}

                    {/* Security Tab */}
                    <TabsContent value="security" className="animate-in fade-in duration-300 space-y-6">
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <CardHeader className="p-6 sm:p-8 pb-4">
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Account Security & Status</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Verified credentials and access control tier</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 space-y-4">
                                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account Role</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-sm">{user.role}</p>
                                    </div>
                                    <Shield className="h-5 w-5 text-[#FF6200]" />
                                </div>
                                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Verification Status</p>
                                        <p className={`font-bold uppercase text-sm ${user.isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                                            {user.isVerified ? 'Verified Merchant' : 'Verification In Progress'}
                                        </p>
                                    </div>
                                    <ShieldCheck className={`h-5 w-5 ${user.isVerified ? 'text-emerald-500' : 'text-amber-500'}`} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Danger Zone */}
                        <Card className="border-red-500/20 bg-red-500/5 rounded-2xl overflow-hidden">
                            <CardHeader className="p-6 sm:p-8 pb-4">
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Irreversible account actions</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 space-y-4">
                                {!showDeleteConfirm ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-600 hover:text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all h-11"
                                    >
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Delete Account
                                    </Button>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-1">
                                            <p className="text-red-600 dark:text-red-400 text-xs font-bold">This action is permanent and cannot be reversed.</p>
                                            <p className="text-slate-600 dark:text-slate-400 text-xs">All active listings, order history, chats, and balance records will be permanently removed.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Type DELETE to confirm</label>
                                            <Input
                                                type="text"
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                placeholder="DELETE"
                                                className="h-12 bg-white dark:bg-slate-900 border-red-500/30 rounded-xl font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-red-500"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                                                className="flex-1 h-11 border border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-xs rounded-xl"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                                                onClick={async () => {
                                                    setIsDeleting(true);
                                                    try {
                                                        const res = await fetch('/api/account/delete', { method: 'DELETE' });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data.error);
                                                        router.push('/?deleted=true');
                                                    } catch (err: any) {
                                                        setSuccessMessage(`Error: ${err.message || 'Deletion failed'}`);
                                                        setIsDeleting(false);
                                                    }
                                                }}
                                                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl border-none disabled:opacity-40"
                                            >
                                                {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Permanently Delete'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notifications Tab */}
                    <TabsContent value="notifications" className="animate-in fade-in duration-300">
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <CardHeader className="p-6 sm:p-8 pb-4">
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Notification Preferences</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Choose which notifications you wish to receive</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 space-y-3">
                                {([
                                    {
                                        key: 'notif_order_updates' as const,
                                        label: 'Order Status Updates',
                                        description: 'Alerts when order states change (shipped, delivered, completed)',
                                        icon: Tag,
                                    },
                                    {
                                        key: 'notif_new_messages' as const,
                                        label: 'Direct Chat Messages',
                                        description: 'Alerts when buyers or sellers send you messages',
                                        icon: MessageCircle,
                                    },
                                    {
                                        key: 'notif_offer_updates' as const,
                                        label: 'Offer & Price Negotiations',
                                        description: 'Notifications when buyers submit, counter, or accept price offers',
                                        icon: Bell,
                                    },
                                    {
                                        key: 'notif_marketing_emails' as const,
                                        label: 'Marketing & Campus Digest',
                                        description: 'Promotional deals, seller growth tips, and platform updates',
                                        icon: MapPin,
                                    },
                                ] as const).map(({ key, label, description, icon: Icon }) => {
                                    const isOn = notifPrefs[key];
                                    const isSaving = savingNotif === key;
                                    const isSuccess = notifSuccess === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => toggleNotif(key)}
                                            disabled={!!savingNotif}
                                            className={`w-full flex items-center justify-between p-5 rounded-xl border transition-all text-left group ${
                                                isOn
                                                    ? 'bg-[#FF6200]/5 dark:bg-[#FF6200]/10 border-[#FF6200]/30 hover:border-[#FF6200]/50'
                                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                                            } disabled:opacity-60 disabled:cursor-wait`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                    isOn ? 'bg-[#FF6200]/10 text-[#FF6200]' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                                }`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className={`font-bold uppercase text-xs tracking-wider ${isOn ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {label}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{description}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 ml-4">
                                                {isSaving ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-[#FF6200]" />
                                                ) : isSuccess ? (
                                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <div className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                                                        isOn ? 'bg-[#FF6200]' : 'bg-slate-300 dark:bg-slate-700'
                                                    }`}>
                                                        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                                            isOn ? 'left-6' : 'left-1'
                                                        }`} />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        Security and critical transaction notices will always be delivered to ensure account integrity.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Referrals Tab */}
                    <TabsContent value="referrals" className="animate-in fade-in duration-300 space-y-6">
                        {/* Referral Code Card */}
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <CardHeader className="p-6 sm:p-8 pb-4">
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-[#FF6200]" />
                                    Your Referral Code
                                </CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Share your code and earn 50 MarketCoins for every invited merchant</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 pt-2 space-y-4">
                                {referralLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-[#FF6200]" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                                            <div className="flex-1">
                                                <div className="h-14 bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-[#FF6200]/40 rounded-xl flex items-center justify-center px-4">
                                                    <span className="text-xl font-black tracking-[0.25em] text-[#FF6200] font-mono">
                                                        {referralCode || 'NO CODE'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(referralCode);
                                                        setCodeCopied(true);
                                                        setTimeout(() => setCodeCopied(false), 2000);
                                                    }}
                                                    className={`h-14 px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                                                        codeCopied
                                                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {codeCopied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                                    {codeCopied ? 'Copied' : 'Copy'}
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        const shareUrl = `https://marketbridge.com.ng/ref/${referralCode}`;
                                                        if (navigator.share) {
                                                            navigator.share({
                                                                title: 'Join MarketBridge',
                                                                text: `Use my referral code ${referralCode} to sign up on MarketBridge and we both earn MarketCoins!`,
                                                                url: shareUrl,
                                                            });
                                                        } else {
                                                            navigator.clipboard.writeText(shareUrl);
                                                            setLinkCopied(true);
                                                            setTimeout(() => setLinkCopied(false), 2000);
                                                        }
                                                    }}
                                                    className="h-14 px-5 bg-[#FF6200] hover:bg-[#FF7A29] text-white rounded-xl font-bold uppercase tracking-wider text-xs border-none"
                                                >
                                                    <Share2 className="h-4 w-4 mr-2" />
                                                    {linkCopied ? 'Link Copied!' : 'Share Link'}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5">
                                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                                                marketbridge.com.ng/ref/{referralCode}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Invites', value: referralStats.total, icon: Users, color: 'text-slate-900 dark:text-white' },
                                { label: 'Completed', value: referralStats.completed, icon: CheckCircle2, color: 'text-emerald-500' },
                                { label: 'Pending', value: referralStats.pending, icon: Clock, color: 'text-amber-500' },
                                { label: 'MarketCoins', value: `${referralStats.mcEarned} MC`, icon: Gift, color: 'text-[#FF6200]' },
                            ].map((stat) => (
                                <Card key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{stat.label}</span>
                                        </div>
                                        <p className={`text-2xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Referral History */}
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <CardHeader className="p-6 sm:p-8 pb-4">
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Referral History</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Members who joined using your referral code</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 pt-0">
                                {referralLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin text-[#FF6200]" />
                                    </div>
                                ) : referralHistory.length === 0 ? (
                                    <div className="text-center py-12 space-y-3">
                                        <div className="h-12 w-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <Users className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-slate-700 dark:text-slate-300 font-bold uppercase text-xs tracking-wider">No referrals yet</p>
                                            <p className="text-slate-400 text-xs mt-0.5">Share your code to earn MarketCoins rewards.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                                    <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 pb-3 pl-3">Member</th>
                                                    <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 pb-3">Status</th>
                                                    <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 pb-3">Date</th>
                                                    <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 pb-3 pr-3">Reward</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {referralHistory.map((ref) => (
                                                    <tr key={ref.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="py-3.5 pl-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                                    <User className="h-3.5 w-3.5" />
                                                                </div>
                                                                <span className="font-semibold text-xs text-slate-900 dark:text-white">{ref.referee_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                ref.status === 'completed'
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                    : ref.status === 'pending'
                                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                            }`}>
                                                                {ref.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                                                                {ref.status === 'pending' && <Clock className="h-3 w-3" />}
                                                                {ref.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5">
                                                            <span className="text-xs font-mono text-slate-400">
                                                                {new Date(ref.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 pr-3 text-right">
                                                            <span className={`font-bold text-xs ${
                                                                ref.mc_rewarded ? 'text-[#FF6200]' : 'text-slate-400'
                                                            }`}>
                                                                {ref.mc_rewarded ? '+50 MC' : '—'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

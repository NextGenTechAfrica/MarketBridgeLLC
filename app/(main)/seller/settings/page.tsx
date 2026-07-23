'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
const supabase = createClient();
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, User, Building, Shield, Bell, MapPin, Phone, MessageCircle, Tag, Banknote, Landmark, ArrowLeft, AlertTriangle, Gift, Copy, Share2, Users, Clock, CheckCircle2, ExternalLink } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { NIGERIAN_STATES } from '@/lib/constants';

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
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold">Please login to access settings</h1>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Background Grid Accent */}
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none" />
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#FF6200]/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
                <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-[#FF6200] mb-2">
                            <Shield className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Area</span>
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
                            Profile <span className="text-[#FF6200]">Settings</span>
                        </h1>
                        <p className="text-white/40 mt-2 font-medium">
                            Account status: {user.isVerified ? 'Verified' : 'Pending Verification'}
                        </p>
                        <Button
                            variant="ghost"
                            className="text-white/40 hover:text-white mt-4 p-0 h-auto font-mono text-xs uppercase tracking-widest flex items-center gap-2"
                            onClick={() => {
                                if (user.role === 'ceo') window.location.href = '/ceo';
                                else if (user.role === 'admin' || user.role.includes('_admin')) window.location.href = '/admin';
                                else if (user.role === 'student_seller') window.location.href = '/seller/dashboard';
                                else window.location.href = '/';
                            }}
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Return to Interface
                        </Button>
                    </div>
                    {successMessage && (
                        <div className="bg-[#FF6200]/10 border border-[#FF6200]/20 text-[#FF6200] px-6 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 backdrop-blur-md">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">{successMessage}</span>
                        </div>
                    )}
                </div>

                <Tabs defaultValue="profile" className="space-y-8">
                    <TabsList className="bg-white/5 border border-white/10 p-1 lg:w-auto w-full flex overflow-x-auto no-scrollbar rounded-2xl h-14">
                        <TabsTrigger value="profile" className="gap-2 px-6 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-black font-bold uppercase text-[10px] tracking-widest transition-all">
                            <User className="h-3.5 w-3.5" />
                            Profile
                        </TabsTrigger>
                        {user.role === 'student_seller' && (
                            <>
                                <TabsTrigger value="business" className="gap-2 px-6 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-black font-bold uppercase text-[10px] tracking-widest transition-all">
                                    <Building className="h-3.5 w-3.5" />
                                    Business
                                </TabsTrigger>
                                <TabsTrigger value="financials" className="gap-2 px-6 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-black font-bold uppercase text-[10px] tracking-widest transition-all">
                                    <Banknote className="h-3.5 w-3.5" />
                                    Payments
                                </TabsTrigger>
                            </>
                        )}
                        <TabsTrigger value="security" className="gap-2 px-6 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-black font-bold uppercase text-[10px] tracking-widest transition-all">
                            <Shield className="h-3.5 w-3.5" />
                            Security
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="gap-2 px-6 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-black font-bold uppercase text-[10px] tracking-widest transition-all">
                            <Bell className="h-3.5 w-3.5" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="referrals" className="gap-2 px-6 rounded-xl data-[state=active]:bg-[#FF6200] data-[state=active]:text-black font-bold uppercase text-[10px] tracking-widest transition-all">
                            <Gift className="h-3.5 w-3.5" />
                            Referrals
                        </TabsTrigger>
                    </TabsList>

                    {/* Identity Tab (Standard) */}
                    <TabsContent value="profile" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="glass-card border-white/10 rounded-[2rem] overflow-hidden bg-white/5">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Personal Information</CardTitle>
                                <CardDescription className="text-white/20 uppercase text-[9px] font-bold tracking-widest">Update your public profile details</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="flex flex-col md:flex-row gap-12 items-start">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] uppercase font-black tracking-widest text-white/40">Profile Picture</Label>
                                        <div className="w-40 h-40 relative group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6200] to-orange-400 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                                            <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-black">
                                                <ImageUpload
                                                    onImagesSelected={(urls) => setFormData({ ...formData, photoURL: urls[0] || '' })}
                                                    defaultImages={formData.photoURL ? [formData.photoURL] : []}
                                                    maxImages={1}
                                                    bucketName="avatars"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 grid gap-8 w-full">
                                        <div className="grid gap-3">
                                            <Label htmlFor="displayName" className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Full Name</Label>
                                            <div className="relative group">
                                                <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10 group-focus-within:text-[#FF6200] transition-colors" />
                                                <Input
                                                    id="displayName"
                                                    className="h-14 pl-14 bg-black border-white/10 rounded-2xl focus-visible:ring-[#FF6200] focus-visible:border-[#FF6200] focus-visible:ring-1 font-bold text-white uppercase placeholder:text-white/10"
                                                    value={formData.displayName}
                                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="grid gap-3">
                                                <Label htmlFor="phone" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Phone Number</Label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10 group-focus-within:text-[#FF6200] transition-colors" />
                                                    <Input
                                                        id="phone"
                                                        className="h-14 pl-14 bg-black border-white/10 rounded-2xl focus-visible:ring-[#FF6200] focus-visible:border-[#FF6200] focus-visible:ring-1 font-bold text-white"
                                                        value={formData.phone_number}
                                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-3">
                                                <Label htmlFor="location" className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Location / State</Label>
                                                <div className="relative group">
                                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10 group-focus-within:text-[#FF6200] transition-colors z-10" />
                                                    <select
                                                        id="location"
                                                        title="Select your state or location"
                                                        aria-label="Location / State"
                                                        className="w-full h-14 pl-14 pr-6 bg-black border border-white/10 rounded-2xl text-white focus:ring-1 focus:ring-[#FF6200] focus:border-[#FF6200] outline-none font-bold uppercase appearance-none"
                                                        value={formData.location}
                                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                    >
                                                        <option value="" className="bg-black">Select Location</option>
                                                        {NIGERIAN_STATES.map((state: string) => (
                                                            <option key={state} value={state} className="bg-black">{state === 'FCT - Abuja' ? 'FCT (Abuja)' : state}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-white/5 border-t border-white/10 p-8 flex justify-end">
                                <Button onClick={handleUpdateProfile} disabled={updating} className="h-14 px-10 bg-[#FF6200] hover:bg-[#FF7A29] text-black font-black uppercase tracking-widest rounded-2xl border-none">
                                    {updating ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-3 h-5 w-5" />}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* Business Tab (Sellers Only) */}
                    {user.role === 'student_seller' && (
                        <TabsContent value="business" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="glass-card border-white/10 rounded-[2rem] overflow-hidden bg-white/5">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight">Business Details</CardTitle>
                                    <CardDescription className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Update your business information</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="grid gap-3">
                                            <Label htmlFor="businessName" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Business Name</Label>
                                            <div className="relative group">
                                                <Building className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#FF6200] transition-colors" />
                                                <Input
                                                    id="businessName"
                                                    className="h-14 pl-14 bg-black border-white/10 rounded-2xl focus-visible:ring-[#FF6200] focus-visible:border-[#FF6200] focus-visible:ring-1 font-bold text-white"
                                                    value={formData.businessName}
                                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="storeType" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Store Type</Label>
                                            <select
                                                id="storeType"
                                                title="Select your store type"
                                                aria-label="Store Type"
                                                className="w-full h-14 px-6 bg-black border border-white/10 rounded-2xl text-white focus:ring-1 focus:ring-[#FF6200] focus:border-[#FF6200] outline-none font-bold uppercase appearance-none"
                                                value={formData.storeType}
                                                onChange={(e) => setFormData({ ...formData, storeType: e.target.value })}
                                            >
                                                <option value="online" className="bg-zinc-900">Online Store</option>
                                                <option value="physical" className="bg-zinc-900">Physical Store</option>
                                                <option value="both" className="bg-zinc-900">Both</option>
                                            </select>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-white/5 border-t border-white/10 p-8 flex justify-end">
                                    <Button onClick={handleUpdateProfile} disabled={updating} className="h-14 px-10 bg-[#FF6200] hover:bg-[#FF7A29] text-black font-black uppercase tracking-widest rounded-2xl border-none">
                                        {updating ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-3 h-5 w-5" />}
                                        Update Business
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    )}

                    {/* Financials / Payouts Tab (Sellers Only) */}
                    {user.role === 'student_seller' && (
                        <TabsContent value="financials" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="glass-card border-white/10 rounded-[2rem] overflow-hidden bg-white/5">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight">Bank Details</CardTitle>
                                    <CardDescription className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Where you want to receive payments</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="grid gap-3">
                                            <Label htmlFor="bankName" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Bank Name</Label>
                                            <div className="relative group">
                                                <Landmark className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#FF6200] transition-colors" />
                                                <Input
                                                    id="bankName"
                                                    placeholder="e.g. GTBank, Kuda, Moniepoint"
                                                    className="h-14 pl-14 bg-black border-white/10 rounded-2xl focus-visible:ring-[#FF6200] focus-visible:border-[#FF6200] focus-visible:ring-1 font-bold text-white"
                                                    value={bankData.bankName}
                                                    onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-3">
                                            <Label htmlFor="accountNumber" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Account Number</Label>
                                            <div className="relative group">
                                                <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#FF6200] transition-colors" />
                                                <Input
                                                    id="accountNumber"
                                                    placeholder="10-digit NUBAN"
                                                    className="h-14 pl-14 bg-black border-white/10 rounded-2xl focus-visible:ring-[#FF6200] focus-visible:border-[#FF6200] focus-visible:ring-1 font-bold text-white font-mono"
                                                    value={bankData.accountNumber}
                                                    onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="accountName" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Account Name</Label>
                                        <div className="relative group">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#FF6200] transition-colors" />
                                            <Input
                                                id="accountName"
                                                placeholder="Matching Bank Account Name"
                                                className="h-14 pl-14 bg-black border-white/10 rounded-2xl focus-visible:ring-[#FF6200] focus-visible:border-[#FF6200] focus-visible:ring-1 font-bold text-white"
                                                value={bankData.accountName}
                                                onChange={(e) => setBankData({ ...bankData, accountName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-white/5 border-t border-white/10 p-8 flex justify-end">
                                    <Button onClick={handleUpdateBank} disabled={updating} className="h-14 px-10 bg-[#FF6200] hover:bg-[#FF7A29] text-black font-black uppercase tracking-widest rounded-2xl border-none">
                                        {updating ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-3 h-5 w-5" />}
                                        Save Details
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    )}

                    {/* Security Tab */}
                    <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid gap-8">
                            <Card className="glass-card border-white/10 rounded-[2rem] overflow-hidden bg-white/5">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight">Account Security</CardTitle>
                                    <CardDescription className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Status and access control</CardDescription>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 space-y-6">
                                    <div className="flex items-center justify-between p-6 bg-black border border-white/5 rounded-2xl">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Current Role</p>
                                            <p className="font-bold text-white uppercase tracking-wider">{user.role}</p>
                                        </div>
                                        <Shield className="h-6 w-6 text-[#FF6200] opacity-50" />
                                    </div>
                                    <div className="flex items-center justify-between p-6 bg-black border border-white/5 rounded-2xl">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Verification Status</p>
                                            <p className={`font-black uppercase tracking-wider ${user.isVerified ? 'text-[#FF6200]' : 'text-white/40'}`}>
                                                {user.isVerified ? 'Verified' : 'Pending'}
                                            </p>
                                        </div>
                                        <CheckCircle className={`h-6 w-6 ${user.isVerified ? 'text-[#FF6200]' : 'text-white/20'}`} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-[#FF6200]/20 rounded-[2rem] overflow-hidden bg-[#FF6200]/5">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight text-white">Danger Zone</CardTitle>
                                    <CardDescription className="text-white/20 uppercase text-[9px] font-bold tracking-widest">Permanent actions</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-4">
                                    {!showDeleteConfirm ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="border-white/20 text-white/40 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold uppercase tracking-widest rounded-xl transition-all h-12"
                                        >
                                            <AlertTriangle className="mr-2 h-4 w-4" />
                                            Delete Account
                                        </Button>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 space-y-2">
                                                <p className="text-red-400 text-sm font-bold">This action is permanent and cannot be undone.</p>
                                                <p className="text-white/40 text-xs">All your listings, orders, chats, and profile data will be permanently erased.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-black text-white/30 tracking-widest ml-1">Type DELETE to confirm</label>
                                                <input
                                                    type="text"
                                                    value={deleteConfirmText}
                                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                    placeholder="DELETE"
                                                    className="w-full h-14 px-6 bg-black border border-red-500/30 rounded-2xl text-white font-bold uppercase tracking-widest placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                                                    className="flex-1 h-12 border border-white/10 text-white/40 hover:text-white font-bold uppercase tracking-widest rounded-xl"
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
                                                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl border-none disabled:opacity-30"
                                                >
                                                    {isDeleting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Permanently Delete'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Notifications Tab */}
                    <TabsContent value="notifications" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="glass-card border-white/10 rounded-[2rem] overflow-hidden bg-white/5">
                            <CardHeader className="p-8">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Notifications</CardTitle>
                                <CardDescription className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Control how and when we contact you</CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 space-y-3">
                                {([
                                    {
                                        key: 'notif_order_updates' as const,
                                        label: 'Order Updates',
                                        description: 'Get notified when your order status changes (shipped, delivered, etc.)',
                                        icon: Tag,
                                    },
                                    {
                                        key: 'notif_new_messages' as const,
                                        label: 'New Messages',
                                        description: 'Get notified when someone sends you a chat message',
                                        icon: MessageCircle,
                                    },
                                    {
                                        key: 'notif_offer_updates' as const,
                                        label: 'Offer Updates',
                                        description: 'Get notified when a seller accepts or rejects your price offer',
                                        icon: Bell,
                                    },
                                    {
                                        key: 'notif_marketing_emails' as const,
                                        label: 'Marketing Emails',
                                        description: 'Receive promotional emails, campus deals, and platform news',
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
                                            className={`w-full flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 text-left group ${isOn
                                                ? 'bg-[#FF6200]/5 border-[#FF6200]/20 hover:border-[#FF6200]/40'
                                                : 'bg-black border-white/5 hover:border-white/15'
                                                } disabled:opacity-60 disabled:cursor-wait`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOn ? 'bg-[#FF6200]/10' : 'bg-white/5'
                                                    }`}>
                                                    <Icon className={`h-4 w-4 transition-colors ${isOn ? 'text-[#FF6200]' : 'text-white/30'}`} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className={`font-black uppercase tracking-wider text-sm transition-colors ${isOn ? 'text-white' : 'text-white/40'}`}>
                                                        {label}
                                                    </p>
                                                    <p className="text-[11px] text-white/30 font-medium">{description}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 ml-4">
                                                {isSaving ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-[#FF6200]" />
                                                ) : isSuccess ? (
                                                    <CheckCircle className="h-5 w-5 text-[#FF6200]" />
                                                ) : (
                                                    <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isOn ? 'bg-[#FF6200]' : 'bg-white/10'
                                                        }`}>
                                                        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${isOn ? 'left-7' : 'left-1'
                                                            }`} />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[10px] text-white/20 font-medium leading-relaxed">
                                        Note: Critical security emails (password resets, login alerts) are always sent regardless of your preferences.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Referrals Tab */}
                    <TabsContent value="referrals" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        {/* Referral Code Card */}
                        <Card className="glass-card border-white/10 rounded-[2rem] overflow-hidden bg-white/5 relative">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6200]/5 blur-[80px] rounded-full pointer-events-none" />
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Gift className="h-5 w-5 text-[#FF6200]" />
                                    Your Referral Code
                                </CardTitle>
                                <CardDescription className="text-white/40 uppercase text-[9px] font-bold tracking-widest">Share your code and earn 50 MC for each successful referral</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-4 space-y-6">
                                {referralLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-[#FF6200]" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Code Display */}
                                        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                                            <div className="flex-1 relative">
                                                <div className="h-16 bg-black border-2 border-dashed border-[#FF6200]/30 rounded-2xl flex items-center justify-center">
                                                    <span className="text-2xl font-black tracking-[0.3em] text-[#FF6200] font-mono">
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
                                                    className={`h-16 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                                                        codeCopied
                                                            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                                                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
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
                                                                text: `Use my referral code ${referralCode} to sign up on MarketBridge and we both earn MC!`,
                                                                url: shareUrl,
                                                            });
                                                        } else {
                                                            navigator.clipboard.writeText(shareUrl);
                                                            setLinkCopied(true);
                                                            setTimeout(() => setLinkCopied(false), 2000);
                                                        }
                                                    }}
                                                    className="h-16 px-6 bg-[#FF6200] hover:bg-[#FF7A29] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] border-none"
                                                >
                                                    <Share2 className="h-4 w-4 mr-2" />
                                                    {linkCopied ? 'Link Copied!' : 'Share'}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Share Link Preview */}
                                        <div className="flex items-center gap-3 bg-black/50 border border-white/5 rounded-xl px-5 py-3">
                                            <ExternalLink className="h-3.5 w-3.5 text-white/20 shrink-0" />
                                            <span className="text-xs font-mono text-white/30 truncate">
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
                                { label: 'Total Referrals', value: referralStats.total, icon: Users, color: 'text-white' },
                                { label: 'Completed', value: referralStats.completed, icon: CheckCircle2, color: 'text-green-400' },
                                { label: 'Pending', value: referralStats.pending, icon: Clock, color: 'text-yellow-400' },
                                { label: 'MC Earned', value: `${referralStats.mcEarned} MC`, icon: Gift, color: 'text-[#FF6200]' },
                            ].map((stat) => (
                                <Card key={stat.label} className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <stat.icon className={`h-4 w-4 ${stat.color} opacity-60`} />
                                            <span className="text-[9px] uppercase font-black tracking-widest text-white/30">{stat.label}</span>
                                        </div>
                                        <p className={`text-2xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Referral History */}
                        <Card className="glass-card border-white/10 rounded-[2rem] overflow-hidden bg-white/5">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Referral History</CardTitle>
                                <CardDescription className="text-white/40 uppercase text-[9px] font-bold tracking-widest">People who signed up with your code</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                {referralLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-[#FF6200]" />
                                    </div>
                                ) : referralHistory.length === 0 ? (
                                    <div className="text-center py-16 space-y-4">
                                        <div className="h-16 w-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
                                            <Users className="h-7 w-7 text-white/20" />
                                        </div>
                                        <div>
                                            <p className="text-white/40 font-bold uppercase tracking-wider text-sm">No referrals yet</p>
                                            <p className="text-white/20 text-xs mt-1">Share your code to start earning MC!</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/5">
                                                    <th className="text-left text-[9px] uppercase font-black tracking-widest text-white/30 pb-4 pl-4">Name</th>
                                                    <th className="text-left text-[9px] uppercase font-black tracking-widest text-white/30 pb-4">Status</th>
                                                    <th className="text-left text-[9px] uppercase font-black tracking-widest text-white/30 pb-4">Date</th>
                                                    <th className="text-right text-[9px] uppercase font-black tracking-widest text-white/30 pb-4 pr-4">Reward</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {referralHistory.map((ref) => (
                                                    <tr key={ref.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-4 pl-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                                    <User className="h-3.5 w-3.5 text-white/30" />
                                                                </div>
                                                                <span className="font-bold text-sm text-white">{ref.referee_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                                ref.status === 'completed'
                                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                                    : ref.status === 'pending'
                                                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                                    : 'bg-white/5 text-white/30 border border-white/10'
                                                            }`}>
                                                                {ref.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                                                                {ref.status === 'pending' && <Clock className="h-3 w-3" />}
                                                                {ref.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className="text-xs font-mono text-white/30">
                                                                {new Date(ref.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 pr-4 text-right">
                                                            <span className={`font-black text-sm ${
                                                                ref.mc_rewarded ? 'text-[#FF6200]' : 'text-white/20'
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

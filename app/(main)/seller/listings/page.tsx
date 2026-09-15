'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Edit, Trash2, Eye, Loader2, Zap, X, Clock, TrendingUp, Flame, Crown, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    status: 'active' | 'sold' | 'inactive';
    location: string | null;
    created_at: string;
    is_sponsored?: boolean;
    sponsored_until?: string | null;
    sponsored_tier?: 'basic' | 'featured' | 'premium' | null;
    view_count?: number;
    expires_at?: string | null;
}

export default function SellerListingsPage() {
    const { user, sessionUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
    const [boostListing, setBoostListing] = useState<Listing | null>(null);
    const [boostLoading, setBoostLoading] = useState(false);
    const [boostError, setBoostError] = useState('');

    useEffect(() => {
        if (authLoading) return;

        if (!sessionUser) {
            router.push('/login');
            return;
        }

        if (!user) return;

        if (!user.email_verified) {
            router.push('/verify-email');
            return;
        }

        const allowedRoles = ['seller', 'student_seller', 'ceo', 'admin', 'technical_admin'];
        if (!allowedRoles.includes(user.role)) {
            router.push('/');
            return;
        }

        fetchListings();
        const unsubscribe = subscribeToListings();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, sessionUser, authLoading, router]);

    const fetchListings = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('listings')
                .select('*, view_count, expires_at, is_sponsored, sponsored_until, sponsored_tier')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setListings(data || []);
        } catch (err) {
            console.error('Failed to fetch listings:', err);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToListings = () => {
        if (!user) return;

        const subscription = supabase
            .channel('seller_listings')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'listings',
                    filter: `seller_id=eq.${user.id}`,
                },
                () => {
                    fetchListings();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const handleDeleteClick = (listing: Listing) => {
        setSelectedListing(listing);
        setShowDeleteDialog(true);
    };

    const handleDelete = async () => {
        if (!selectedListing) return;

        setDeletingId(selectedListing.id);
        try {
            const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', selectedListing.id);

            if (error) throw error;

            setShowDeleteDialog(false);
            setSelectedListing(null);
            fetchListings();
            toast('Listing removed successfully', 'success');
        } catch (err) {
            console.error('Failed to delete listing:', err);
            toast('Failed to delete listing. Please check your network.', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleStatus = async (listing: Listing) => {
        try {
            const newStatus = listing.status === 'active' ? 'inactive' : 'active';
            const { error } = await supabase
                .from('listings')
                .update({ status: newStatus })
                .eq('id', listing.id);

            if (error) throw error;

            fetchListings();
            toast(newStatus === 'active' ? 'Listing is now visible' : 'Listing hidden from marketplace', 'info');
        } catch (err) {
            console.error('Failed to update status:', err);
            toast('Failed to update listing status.', 'error');
        }
    };

    const handleBoostClick = (listing: Listing) => {
        setBoostListing(listing);
        setBoostError('');
    };

    const handleBoostTier = async (tier: 'basic' | 'featured' | 'premium') => {
        if (!boostListing) return;
        setBoostLoading(true);
        setBoostError('');
        try {
            const res = await fetch('/api/paystack/boost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: boostListing.id, tier })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            window.location.href = data.authorization_url;
        } catch (err: any) {
            setBoostError(err.message || 'Failed to initialize boost payment');
        } finally {
            setBoostLoading(false);
        }
    };

    const handleBoostWithCoins = async () => {
        if (!user || !user.id || !boostListing) return;
        setBoostLoading(true);
        setBoostError('');
        try {
            const { data: userData } = await supabase.from('users').select('coins_balance').eq('id', user.id).single();
            const currentCoins = userData?.coins_balance || 0;
            if (currentCoins < 50) {
                throw new Error("Insufficient MarketCoins. You need 50 MC.");
            }

            await supabase.from('users').update({ coins_balance: currentCoins - 50 }).eq('id', user.id);
            const expires = new Date();
            expires.setDate(expires.getDate() + 14);
            await supabase.from('listings').update({
                is_sponsored: true,
                sponsored_tier: 'premium',
                sponsored_until: expires.toISOString()
            }).eq('id', boostListing.id);

            toast("Premium Boost applied successfully for 50 MC!", "success");
            setBoostListing(null);
            fetchListings();
        } catch (err: any) {
            setBoostError(err.message || 'Failed to boost with coins');
        } finally {
            setBoostLoading(false);
        }
    };

    const BOOST_TIERS = [
        {
            id: 'basic' as const,
            label: 'Basic Boost',
            price: '₦500',
            duration: '3 days',
            icon: <Zap className="h-4 w-4 text-[#FF6200]" />,
            perks: ['Pinned to top of category', '3-day visibility window', '+10 MarketCoins reward'],
            badge: null,
        },
        {
            id: 'featured' as const,
            label: 'Featured Spotlight',
            price: '₦1,500',
            duration: '7 days',
            icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
            perks: ['Pinned for 7 days', 'FEATURED badge on card', '+25 MarketCoins reward'],
            badge: 'POPULAR',
        },
        {
            id: 'premium' as const,
            label: 'Premium Spotlight',
            price: '50 MC',
            duration: '14 days',
            icon: <Crown className="h-4 w-4 text-amber-500" />,
            perks: ['Pinned for 14 days', 'Homepage priority exposure', 'Paid with 50 MarketCoins'],
            badge: 'BEST VALUE',
        },
    ];

    if (authLoading || loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 rounded-xl" />
                        <Skeleton className="h-4 w-64 mt-2 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
                            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                            <Skeleton className="h-5 w-3/4 rounded-md" />
                            <Skeleton className="h-6 w-1/3 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">My Inventory</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Manage, edit, boost, or remove your marketplace listings.
                        </p>
                    </div>
                    <Link href="/seller/listings/new">
                        <Button className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl gap-1.5 shadow-sm">
                            <Plus className="h-4 w-4" /> Create New Listing
                        </Button>
                    </Link>
                </div>

                {/* Listings Grid */}
                {listings.length === 0 ? (
                    <EmptyState
                        icon={<Package className="h-10 w-10 text-[#FF6200]" />}
                        title="No Products Found"
                        description="You haven't listed any items in your store yet. Start selling today!"
                        actionLabel="Create First Listing"
                        actionHref="/seller/listings/new"
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {listings.map((listing) => (
                            <div
                                key={listing.id}
                                className="bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                            >
                                <div>
                                    {/* Image Container */}
                                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                                        {listing.images && listing.images.length > 0 ? (
                                            <Image
                                                src={listing.images[0]}
                                                alt={listing.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
                                                No Image
                                            </div>
                                        )}

                                        {/* Status & Sponsored Badges */}
                                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                                            <Badge
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase shadow-sm",
                                                    listing.status === 'active'
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-muted text-muted-foreground border-border"
                                                )}
                                            >
                                                {listing.status}
                                            </Badge>
                                            {listing.is_sponsored && (
                                                <Badge className="bg-[#FF6200] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                                                    <Zap className="h-2.5 w-2.5 fill-white" /> Sponsored
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="font-semibold uppercase text-[#FF6200] text-[11px]">
                                                {listing.category || 'General'}
                                            </span>
                                            {listing.view_count !== undefined && (
                                                <span className="flex items-center gap-1 text-[11px]">
                                                    <Eye className="h-3 w-3" /> {listing.view_count} views
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                                            {listing.title}
                                        </h3>

                                        <p className="text-base font-extrabold text-[#FF6200]">
                                            ₦{listing.price.toLocaleString()}
                                        </p>

                                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                            {listing.description || 'No description.'}
                                        </p>

                                        {/* Expiry Warning */}
                                        {listing.expires_at && (new Date(listing.expires_at).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 && listing.status === 'active' && (
                                            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[11px] font-semibold">
                                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                                <span>Expires soon. Boost to extend.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="p-4 pt-0 space-y-2 border-t border-border mt-3">
                                    <div className="grid grid-cols-4 gap-1.5 pt-3">
                                        <Link href={`/listings/${listing.id}`} className="block">
                                            <Button variant="outline" size="sm" className="w-full text-xs rounded-xl p-0 h-8" title="View Listing">
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                        </Link>

                                        <Link href={`/seller/listings/${listing.id}/edit`} className="block">
                                            <Button variant="outline" size="sm" className="w-full text-xs rounded-xl p-0 h-8" title="Edit Listing">
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                        </Link>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs rounded-xl p-0 h-8"
                                            onClick={() => toggleStatus(listing)}
                                            title={listing.status === 'active' ? 'Hide listing' : 'Make listing active'}
                                        >
                                            {listing.status === 'active' ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs rounded-xl p-0 h-8 text-red-600 hover:bg-red-500/10 hover:border-red-500/30"
                                            onClick={() => handleDeleteClick(listing)}
                                            disabled={deletingId === listing.id}
                                            title="Delete Listing"
                                        >
                                            {deletingId === listing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>

                                    {/* Boost Button */}
                                    {listing.status === 'active' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full rounded-xl text-xs font-semibold h-9 border-[#FF6200]/30 text-[#FF6200] hover:bg-[#FF6200] hover:text-white transition-colors"
                                            onClick={() => !listing.is_sponsored && handleBoostClick(listing)}
                                            disabled={listing.is_sponsored}
                                        >
                                            <Zap className="mr-1.5 h-3.5 w-3.5" />
                                            {listing.is_sponsored ? 'Listing is Boosted' : 'Boost Listing Visibility'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Boost Modal */}
                {boostListing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-xl text-foreground relative max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setBoostListing(null)}
                                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[#FF6200]">
                                    <Flame className="h-5 w-5" />
                                    <h2 className="text-lg font-bold text-foreground">Boost Listing Visibility</h2>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    "{boostListing.title}" — get higher rank in search results and category pages.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {BOOST_TIERS.map((tier) => (
                                    <button
                                        key={tier.id}
                                        onClick={() => tier.id === 'premium' ? handleBoostWithCoins() : handleBoostTier(tier.id)}
                                        disabled={boostLoading}
                                        className="w-full text-left p-4 rounded-xl border border-border hover:border-[#FF6200] bg-background hover:bg-muted/40 transition-all space-y-2 relative group disabled:opacity-50"
                                    >
                                        {tier.badge && (
                                            <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#FF6200] text-white">
                                                {tier.badge}
                                            </span>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {tier.icon}
                                                <span className="font-bold text-xs text-foreground">{tier.label}</span>
                                            </div>
                                            <span className="font-extrabold text-sm text-[#FF6200]">{tier.price}</span>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground">
                                            {tier.duration} visibility • {tier.perks.join(' • ')}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            {boostError && (
                                <p className="text-xs text-red-600 bg-red-500/10 p-2.5 rounded-xl text-center font-medium">
                                    {boostError}
                                </p>
                            )}

                            {boostLoading && (
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2 font-medium">
                                    <Loader2 className="h-4 w-4 animate-spin text-[#FF6200]" /> Processing payment...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Delete Dialog */}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent className="rounded-2xl max-w-md bg-card border-border text-foreground">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-base font-bold">Delete Listing</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-muted-foreground">
                                Are you sure you want to delete "{selectedListing?.title}"? This item will be permanently removed from the marketplace.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold">
                                Delete Permanently
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import {
    Loader2, MapPin, MessageCircle, ShoppingCart, ArrowLeft, ShieldCheck,
    Phone, Zap, AlertTriangle, Box, Activity, Store, Star, Clock, Heart,
    CheckCircle, ChevronRight, Share2, HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startConversation } from '@/lib/chat';
import { ReviewsSection } from '@/components/ReviewsSection';
import { cn } from '@/lib/utils';
import { useSystem } from '@/contexts/SystemContext';
import { getRelatedListings } from '@/lib/ai-search';
import { ListingCard } from '@/components/listings/ListingCard';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    videos?: string[];
    location: string;
    dealer_id: string;
    dealer: {
        id: string;
        display_name: string;
        is_verified: boolean;
        photo_url?: string;
        store_type?: string;
        phone_number?: string;
        subscription_plan?: string;
        university?: string;
        paystack_subaccount_code?: string;
    };
    created_at: string;
    make?: string;
    model?: string;
    year?: number;
    condition?: string;
    transmission?: 'Automatic' | 'Manual';
    mileage?: number;
    fuel_type?: string;
    engine_size?: string;
    body_type?: string;
    vin?: string;
    is_verified_listing?: boolean;
    verification_status?: 'pending' | 'verified' | 'rejected';
    inspection_report_url?: string;
    current_offered_price?: number | null;
    original_price?: number;
}

export default function ListingDetailContent() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const { addToCart } = useCart();
    const { isDemoMode } = useSystem();

    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [isFavorite, setIsFavorite] = useState(false);
    const [relatedListings, setRelatedListings] = useState<any[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
    const [sellerRating, setSellerRating] = useState<{ avg: number; count: number } | null>(null);

    // Negotiation / Offer State
    const [isOfferOpen, setIsOfferOpen] = useState(false);
    const [offerPrice, setOfferPrice] = useState<number>(0);
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
    const [activeOffer, setActiveOffer] = useState<any>(null);

    useEffect(() => {
        if (listing) {
            setOfferPrice(listing.current_offered_price || listing.price);
        }
    }, [listing]);

    // Recently viewed persistence
    useEffect(() => {
        if (listing && listing.id) {
            try {
                const KEY = 'mb-recently-viewed';
                const stored = localStorage.getItem(KEY);
                let list: any[] = stored ? JSON.parse(stored) : [];
                list = list.filter((item: any) => item.id !== listing.id);
                const minimalItem = {
                    id: listing.id,
                    title: listing.title,
                    price: listing.price,
                    images: listing.images,
                    category: listing.category,
                    location: listing.location,
                    condition: listing.condition,
                    created_at: listing.created_at,
                    seller: {
                        display_name: listing.dealer?.display_name,
                        is_verified: listing.dealer?.is_verified,
                        university: listing.dealer?.university
                    }
                };
                list.unshift(minimalItem);
                list = list.slice(0, 6);
                localStorage.setItem(KEY, JSON.stringify(list));
            } catch (err) {
                console.error('Failed to update recently viewed:', err);
            }
        }
    }, [listing]);

    useEffect(() => {
        try {
            const KEY = 'mb-recently-viewed';
            const stored = localStorage.getItem(KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const listingId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
                setRecentlyViewed(parsed.filter((item: any) => item.id !== listingId).slice(0, 4));
            }
        } catch (e) {
            console.error('Failed to load recently viewed:', e);
        }
    }, [listing, params?.id]);

    useEffect(() => {
        if (params?.id) {
            fetchListing();
            const listingId = Array.isArray(params.id) ? params.id[0] : params.id;
            supabase.rpc('increment_listing_view', { listing_id: listingId }).then(() => null);
            const unsubListing = subscribeToListing();

            let unsubOffer: (() => void) | undefined;
            if (user) {
                fetchActiveOffer();
                unsubOffer = subscribeToOwnOffers();
            }

            return () => {
                if (unsubListing) unsubListing();
                if (unsubOffer) unsubOffer();
            };
        }
    }, [params?.id, user]);

    // Fetch seller rating
    useEffect(() => {
        if (!listing?.dealer?.id) return;
        const fetchRating = async () => {
            const { data } = await supabase
                .from('reviews')
                .select('rating')
                .eq('subject_id', listing.dealer.id);
            if (data && data.length > 0) {
                const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
                setSellerRating({ avg: Math.round(avg * 10) / 10, count: data.length });
            }
        };
        fetchRating();
    }, [listing?.dealer?.id]);

    const fetchListing = async () => {
        setLoading(true);
        setError('');
        try {
            const listingId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
            const { data, error: queryError } = await supabase
                .from('listings')
                .select(`
                    *,
                    dealer:users!listings_dealer_id_fkey(
                        id,
                        display_name,
                        is_verified,
                        photo_url,
                        store_type,
                        phone_number,
                        subscription_plan,
                        university,
                        paystack_subaccount_code
                    )
                `)
                .eq('id', listingId)
                .single();

            if (queryError) {
                console.warn("Complex query failed, trying fallback...", queryError);

                const { data: simpleListing, error: simpleError } = await supabase
                    .from('listings')
                    .select('*')
                    .eq('id', listingId)
                    .single();

                if (simpleError) throw simpleError;

                if (simpleListing) {
                    const { data: dealerData } = await supabase
                        .from('users')
                        .select('id, display_name, is_verified, photo_url, store_type, phone_number, subscription_plan, university, paystack_subaccount_code')
                        .eq('id', simpleListing.dealer_id)
                        .single();

                    const fullListing = { ...simpleListing, dealer: dealerData || {} };
                    setListing(fullListing);
                    getRelatedListings(fullListing.id).then(res => setRelatedListings(res)).catch(e => console.error(e));
                    return;
                }
            }

            setListing(data);
            if (data) {
                getRelatedListings(data.id).then(res => setRelatedListings(res)).catch(e => console.error(e));
            }
        } catch (err: unknown) {
            console.error('Error fetching listing:', err);
            setError('Listing not found or no longer active.');
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveOffer = async () => {
        if (!user || !params?.id) return;
        const listingId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
        const { data } = await supabase
            .from('offers')
            .select('*')
            .eq('listing_id', listingId)
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        setActiveOffer(data || null);
    };

    const subscribeToOwnOffers = () => {
        if (!user || !params?.id) return;
        const listingId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
        const channel = supabase
            .channel(`own_offers_${listingId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'offers',
                    filter: `buyer_id=eq.${user.id}`
                },
                () => {
                    fetchActiveOffer();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const subscribeToListing = () => {
        const listingId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
        const channel = supabase
            .channel(`listing_updates_${listingId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'listings',
                    filter: `id=eq.${listingId}`
                },
                (payload) => {
                    setListing(prev => prev ? { ...prev, ...payload.new } : null);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const toggleFavorite = () => {
        if (!user) {
            router.push(`/login?redirect=/listings/${listing?.id}`);
            return;
        }
        setIsFavorite(!isFavorite);
        toast(isFavorite ? 'Removed from wishlist' : 'Added to wishlist', 'info');
    };

    const adjustPrice = (amount: number) => {
        setOfferPrice(prev => Math.max(0, prev + amount));
    };

    const handleContactDealer = async () => {
        if (!user) {
            router.push(`/login?redirect=/listings/${listing?.id}`);
            return;
        }

        if (!listing) return;

        setActionLoading(true);
        try {
            const conversationId = await startConversation(user.id, listing.dealer.id, listing.id);
            router.push(`/chats/${conversationId}`);
        } catch (err: unknown) {
            console.error('Error starting chat:', err);
            const message = err instanceof Error ? err.message : 'Failed to start chat';
            setError(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleWhatsAppDealer = () => {
        if (!listing) return;
        const phone = listing.dealer.phone_number || '2348000000000';
        const cleanPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('0') ? '234' + cleanPhone.substring(1) : cleanPhone;
        const message = encodeURIComponent(`Hello, I saw your ${listing.title} on MarketBridge. Is it still available?`);

        const proceed = confirm("Safety Reminder:\n\nWhen negotiating on WhatsApp, always return to MarketBridge to complete your payment securely in escrow.\n\nProceed to WhatsApp?");
        if (proceed) {
            window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
        }
    };

    const handleCallDealer = () => {
        if (!listing?.dealer?.phone_number) {
            toast('This seller has not added a phone number yet.', 'error');
            return;
        }
        window.location.href = `tel:${listing.dealer.phone_number}`;
    };

    const handleAddToCartClick = () => {
        if (!listing) return;
        addToCart({
            listingId: listing.id,
            title: listing.title,
            price: listing.price,
            image: listing.images?.[0] || '',
            sellerId: listing.dealer.id,
        });
        toast('Added to cart', 'success');
    };

    const handleMakeOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push(`/login?redirect=/listings/${listing?.id}`);
            return;
        }
        if (!listing) return;

        const price = offerPrice;
        if (price <= 0) {
            setError('Please enter a valid price.');
            return;
        }

        if (isDemoMode && price > 5000) {
            setError('Demo Mode: Transactions are limited to ₦5,000 for testing.');
            return;
        }

        setIsSubmittingOffer(true);
        const previousOffer = activeOffer;
        setActiveOffer({
            listing_id: listing.id,
            buyer_id: user.id,
            seller_id: listing.dealer.id,
            offered_price: price,
            status: 'pending'
        });
        setIsOfferOpen(false);

        try {
            const { error: offerError } = await supabase
                .from('offers')
                .insert({
                    listing_id: listing.id,
                    buyer_id: user.id,
                    seller_id: listing.dealer.id,
                    offered_price: price,
                    status: 'pending'
                });

            if (offerError) throw offerError;
            toast('Offer submitted to seller for review', 'success');
        } catch (err: any) {
            console.error("Offer Error:", err);
            setActiveOffer(previousOffer);
            setIsOfferOpen(false);
            setError('Failed to submit offer. Please try again.');
        } finally {
            setIsSubmittingOffer(false);
        }
    };

    const handlePlaceOrder = async () => {
        if (!user) {
            router.push(`/login?redirect=/listings/${listing?.id}`);
            return;
        }

        if (!listing) return;

        const finalAmount = listing.current_offered_price || listing.price;

        if (isDemoMode && finalAmount > 5000) {
            setError('Demo Mode: Transactions are limited to ₦5,000. Please negotiate the price down for testing.');
            return;
        }

        setActionLoading(true);

        try {
            const response = await fetch('/api/paystack/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId: listing.id,
                    amount: finalAmount
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initialize checkout');
            }

            window.location.href = data.authorization_url;

        } catch (err: any) {
            console.error('Checkout Error:', err);
            setError(err.message || 'Checkout failed. Please try again.');
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        );
    }

    // Unauthenticated preview gate
    if (!user && listing) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col pt-24 pb-20">
                <div className="container px-4 sm:px-6 mx-auto max-w-xl text-center space-y-6">
                    <div className="bg-card border border-border rounded-3xl overflow-hidden p-3 shadow-md max-w-sm mx-auto">
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden relative bg-muted filter blur-sm opacity-60">
                            {listing.images && listing.images.length > 0 && (
                                <Image
                                    src={listing.images[0]}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Badge className="bg-[#FF6200]/10 text-[#FF6200] border-[#FF6200]/20 text-xs">
                            Member Preview
                        </Badge>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Sign In to View Full Details
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Log in or create a free account to view pricing, contact verified sellers, and purchase securely.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-sm mx-auto">
                        <Button
                            asChild
                            className="h-11 flex-1 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold rounded-xl"
                        >
                            <Link href={`/signup?redirect=/listings/${listing.id}`}>
                                Create Account
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="h-11 flex-1 rounded-xl"
                        >
                            <Link href={`/login?redirect=/listings/${listing.id}`}>
                                Sign In
                            </Link>
                        </Button>
                    </div>

                    <div>
                        <Link href="/marketplace" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <ArrowLeft className="h-3 w-3" /> Back to Marketplace
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-md space-y-4 shadow-sm">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                    <h2 className="text-lg font-bold text-foreground">Listing Unavailable</h2>
                    <p className="text-xs text-muted-foreground">{error || 'This listing may have been sold or removed.'}</p>
                    <Button onClick={() => router.push('/marketplace')} className="bg-[#FF6200] hover:bg-[#FF7A29] text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Marketplace
                    </Button>
                </div>
            </div>
        );
    }

    const isOwner = user && user.id === listing.dealer.id;

    return (
        <div className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-20">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                {/* Back Button & Breadcrumb Navigation */}
                <div className="flex items-center justify-between gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all shadow-sm active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4 text-[#FF6200]" /> Back
                    </button>
                    <nav className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                        <Link href="/" className="hover:text-foreground">Home</Link>
                        <ChevronRight className="h-3 w-3" />
                        <Link href="/marketplace" className="hover:text-foreground">Marketplace</Link>
                        {listing.category && (
                            <>
                                <ChevronRight className="h-3 w-3" />
                                <Link href={`/marketplace?category=${encodeURIComponent(listing.category)}`} className="hover:text-foreground">
                                    {listing.category}
                                </Link>
                            </>
                        )}
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground truncate max-w-[200px] font-medium">{listing.title}</span>
                    </nav>
                </div>

                {/* Main Product Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Image Gallery */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-card border border-border rounded-3xl overflow-hidden relative shadow-sm">
                            <div className="aspect-[4/3] relative bg-muted">
                                {listing.images && listing.images.length > 0 ? (
                                    <Image
                                        src={listing.images[selectedImage]}
                                        alt={listing.title}
                                        fill
                                        className="object-contain sm:object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <Store className="h-16 w-16 opacity-30" />
                                    </div>
                                )}

                                {/* Status Overlay Badges */}
                                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                    {(listing.is_verified_listing || listing.verification_status === 'verified') && (
                                        <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            <span>Verified Listing</span>
                                        </div>
                                    )}
                                    {listing.condition && (
                                        <span className="bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1 rounded-full shadow-sm capitalize border border-border">
                                            {listing.condition.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Gallery Thumbnails */}
                        {listing.images && listing.images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {listing.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={cn(
                                            "relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                                            selectedImage === idx
                                                ? "border-[#FF6200] ring-2 ring-[#FF6200]/20"
                                                : "border-border hover:border-muted-foreground/50 opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <Image
                                            src={img}
                                            alt={`Thumbnail ${idx + 1}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Interaction, Details, Seller */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Title & Metadata Card */}
                        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#FF6200] bg-[#FF6200]/10 px-2.5 py-1 rounded-lg">
                                        {listing.category || 'General'}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {listing.location || listing.dealer.university || 'Nigeria'}
                                    </span>
                                </div>

                                <h1 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
                                    {listing.title}
                                </h1>
                            </div>

                            {/* Price Section */}
                            <div className="pt-3 border-t border-border space-y-1">
                                <span className="text-xs text-muted-foreground uppercase font-medium">Price</span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-extrabold text-[#FF6200]">
                                        ₦{(listing.current_offered_price || listing.price).toLocaleString()}
                                    </span>
                                    {listing.current_offered_price && listing.current_offered_price !== listing.price && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm text-muted-foreground line-through">
                                                ₦{listing.price.toLocaleString()}
                                            </span>
                                            <Badge className="bg-[#FF6200]/10 text-[#FF6200] text-[10px]">
                                                Negotiated
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Demo Notice */}
                            {isDemoMode && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    ⚠️ Demo Mode: Transaction simulation capped at ₦5,000 for test security.
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!isOwner ? (
                                <div className="space-y-3 pt-2">
                                    <div className="flex gap-2.5">
                                        <Button
                                            onClick={handlePlaceOrder}
                                            disabled={actionLoading}
                                            className="flex-1 h-12 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-bold text-sm rounded-xl shadow-md transition-all"
                                        >
                                            {actionLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                            )}
                                            Buy with Escrow
                                        </Button>

                                        <Button
                                            onClick={handleAddToCartClick}
                                            variant="outline"
                                            className="h-12 w-12 rounded-xl p-0 shrink-0 border-border hover:border-[#FF6200]"
                                            title="Add to Cart"
                                        >
                                            <ShoppingCart className="h-5 w-5" />
                                        </Button>

                                        <Button
                                            onClick={toggleFavorite}
                                            variant="outline"
                                            className={cn(
                                                "h-12 w-12 rounded-xl p-0 shrink-0 border-border transition-colors",
                                                isFavorite && "border-red-500/50 bg-red-500/10 text-red-500"
                                            )}
                                            title="Save to Wishlist"
                                        >
                                            <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500")} />
                                        </Button>
                                    </div>

                                    {/* Negotiation & Contact Actions */}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        {activeOffer && activeOffer.status === 'pending' ? (
                                            <Button disabled className="h-10 text-xs font-semibold rounded-xl bg-muted text-muted-foreground col-span-1">
                                                <Clock className="mr-1.5 h-3.5 w-3.5 animate-pulse" /> Offer Pending
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => setIsOfferOpen(true)}
                                                variant="outline"
                                                className="h-10 text-xs font-semibold rounded-xl border-[#FF6200]/30 text-[#FF6200] hover:bg-[#FF6200]/10"
                                            >
                                                <Zap className="mr-1.5 h-3.5 w-3.5" /> Make Offer
                                            </Button>
                                        )}

                                        <Button
                                            onClick={handleContactDealer}
                                            variant="outline"
                                            className="h-10 text-xs font-semibold rounded-xl"
                                        >
                                            <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Chat Seller
                                        </Button>

                                        <Button
                                            onClick={handleWhatsAppDealer}
                                            variant="outline"
                                            className="h-10 text-xs font-semibold rounded-xl col-span-2 border-border text-muted-foreground hover:text-foreground"
                                        >
                                            <Phone className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> WhatsApp Chat (Pay In-App)
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-muted p-4 rounded-xl text-center">
                                    <p className="text-xs font-semibold text-muted-foreground">You are viewing your own listing</p>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="mt-2 text-xs"
                                    >
                                        <Link href={`/seller/listings/${listing.id}/edit`}>
                                            Edit Listing
                                        </Link>
                                    </Button>
                                </div>
                            )}

                            {/* Trust Badge */}
                            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3 text-xs text-muted-foreground">
                                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                                <span>MarketBridge Escrow Protection: Funds released only upon order confirmation.</span>
                            </div>
                        </div>

                        {/* Seller Information Card */}
                        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Seller Profile
                            </h3>

                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center overflow-hidden relative shrink-0 border border-border">
                                    {listing.dealer.photo_url ? (
                                        <Image src={listing.dealer.photo_url} alt={listing.dealer.display_name} fill className="object-cover" />
                                    ) : (
                                        <Store className="h-6 w-6 text-muted-foreground" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-foreground truncate">{listing.dealer.display_name}</h4>
                                        {listing.dealer.is_verified && (
                                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" title="Verified Seller" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{listing.dealer.university || 'Verified Campus Seller'}</p>

                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() => {
                                                const el = document.getElementById('reviews-section');
                                                el?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className="flex items-center gap-1 text-xs text-amber-500 font-semibold hover:underline"
                                        >
                                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                            <span>{sellerRating ? `${sellerRating.avg} (${sellerRating.count})` : 'New Seller'}</span>
                                        </button>
                                        <span className="text-muted-foreground text-xs">•</span>
                                        <span className="text-xs text-muted-foreground capitalize">{listing.dealer.store_type || 'Digital Store'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Item Specifications */}
                        <div className="bg-card border border-border rounded-3xl p-6 space-y-3 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Item Specifications
                            </h3>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-muted/50 p-3 rounded-xl">
                                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Category</span>
                                    <span className="font-semibold text-foreground">{listing.category}</span>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-xl">
                                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Condition</span>
                                    <span className="font-semibold text-foreground capitalize">{listing.condition?.replace('_', ' ') || 'Good'}</span>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-xl">
                                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Location</span>
                                    <span className="font-semibold text-foreground">{listing.location || 'Campus Delivery'}</span>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-xl">
                                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Listing ID</span>
                                    <span className="font-semibold text-foreground font-mono">#{listing.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description Card */}
                        <div className="bg-card border border-border rounded-3xl p-6 space-y-3 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Description
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {listing.description}
                            </p>

                            <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                                <button
                                    onClick={() => setIsReportOpen(true)}
                                    className="text-muted-foreground hover:text-red-500 font-medium flex items-center gap-1 transition-colors"
                                >
                                    <AlertTriangle className="h-3.5 w-3.5" /> Report listing
                                </button>
                                <a
                                    href="mailto:support@marketbridge.com.ng?subject=Buyer Help Request"
                                    className="text-muted-foreground hover:text-[#FF6200] transition-colors"
                                >
                                    Need help?
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ratings & Reviews Section */}
                <div id="reviews-section" className="pt-8 border-t border-border">
                    <h2 className="text-xl font-bold tracking-tight text-foreground mb-6">
                        Customer Reviews & Ratings
                    </h2>
                    <ReviewsSection listingId={listing.id} sellerId={listing.dealer.id} />
                </div>

                {/* Similar Listings */}
                {relatedListings.length > 0 && (
                    <div className="pt-8 border-t border-border space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                                Similar <span className="text-[#FF6200]">Listings</span>
                            </h2>
                            <Link href={`/marketplace?category=${encodeURIComponent(listing.category)}`} className="text-xs font-semibold text-[#FF6200] hover:underline">
                                View all in {listing.category}
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                            {relatedListings.slice(0, 4).map((item) => (
                                <ListingCard key={item.id} listing={item} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recently Viewed */}
                {recentlyViewed.length > 0 && (
                    <div className="pt-8 border-t border-border space-y-6">
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Recently Viewed
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                            {recentlyViewed.map((item) => (
                                <ListingCard key={item.id} listing={item} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Offer Negotiation Dialog */}
            <Dialog open={isOfferOpen} onOpenChange={setIsOfferOpen}>
                <DialogContent className="bg-card border-border text-foreground sm:max-w-md rounded-2xl p-6 space-y-6">
                    <form onSubmit={handleMakeOffer} className="space-y-6">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-center">
                                Make an Offer
                            </DialogTitle>
                            <DialogDescription className="text-xs text-center text-muted-foreground">
                                Propose a price to the seller. If accepted, you will be notified to complete payment.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center justify-center space-y-4 py-2">
                            <div className="text-center">
                                <span className="text-xs text-muted-foreground uppercase font-medium">Your Proposed Price</span>
                                <div className="text-4xl font-extrabold text-[#FF6200] tabular-nums mt-1">
                                    ₦{offerPrice.toLocaleString()}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full justify-center">
                                <Button
                                    type="button"
                                    onClick={() => adjustPrice(-500)}
                                    variant="outline"
                                    className="h-10 w-12 text-lg font-bold rounded-xl"
                                >
                                    -500
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => adjustPrice(500)}
                                    variant="outline"
                                    className="h-10 w-12 text-lg font-bold rounded-xl"
                                >
                                    +500
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => adjustPrice(2000)}
                                    variant="outline"
                                    className="h-10 px-3 text-xs font-bold rounded-xl"
                                >
                                    +2,000
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setOfferPrice(listing.price)}
                                    variant="ghost"
                                    className="h-10 px-2 text-xs text-muted-foreground"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOfferOpen(false)}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingOffer}
                                className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-bold rounded-xl"
                            >
                                {isSubmittingOffer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Submit Offer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Report Listing Dialog */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="bg-card border-border text-foreground sm:max-w-md rounded-2xl p-6 space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-red-500 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Report Listing
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Reports are reviewed by platform admins to maintain marketplace safety.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Reason</Label>
                            <Select onValueChange={setReportReason}>
                                <SelectTrigger className="text-xs rounded-xl">
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fraud">Fraud / Potential Scam</SelectItem>
                                    <SelectItem value="fake_item">Counterfeit / Misleading</SelectItem>
                                    <SelectItem value="harassment">Inappropriate Content</SelectItem>
                                    <SelectItem value="wrong_category">Wrong Category</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Details</Label>
                            <Textarea
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                                placeholder="Please provide additional details..."
                                className="text-xs rounded-xl min-h-[90px]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsReportOpen(false)} className="rounded-xl text-xs">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                const subject = `REPORT: ${listing.id} - ${reportReason.toUpperCase()}`;
                                const body = `Reporting Listing: ${listing.title} (ID: ${listing.id})\nDealer: ${listing.dealer.display_name}\nReason: ${reportReason}\nDetails: ${reportDetails}\n\nSubmitted by User: ${user?.email || 'Anonymous'}`;
                                window.location.href = `mailto:safety@marketbridge.ng?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                setIsReportOpen(false);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
                        >
                            Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

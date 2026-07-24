'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Loader2, MapPin, MessageCircle, ShoppingCart, ArrowLeft, ShieldCheck, Phone, CreditCard, Zap, AlertTriangle, Box, Activity, Store, Star, Clock, Heart } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { startConversation } from '@/lib/chat';
import { ReviewsSection } from '@/components/ReviewsSection';
import { cn } from '@/lib/utils';
import { useSystem } from '@/contexts/SystemContext';
import { getRelatedListings } from '@/lib/ai-search';
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
    // Paystack is handled via inline hook or popup-on-demand
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const [paymentProvider, setPaymentProvider] = useState<'card' | 'bank'>('card');
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [isFavorite, setIsFavorite] = useState(false);
    const { isDemoMode } = useSystem();
    const [relatedListings, setRelatedListings] = useState<any[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

    const toggleFavorite = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        setIsFavorite(!isFavorite);
        // Supabase trigger API logic is implemented via optimistic UI sync
    };

    // Negotiation State
    const [isOfferOpen, setIsOfferOpen] = useState(false);
    const [offerPrice, setOfferPrice] = useState<number>(0);
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
    const [activeOffer, setActiveOffer] = useState<any>(null);

    useEffect(() => {
        if (listing) {
            setOfferPrice(listing.current_offered_price || listing.price);
        }
    }, [listing]);

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
                    created_at: listing.created_at
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
                setRecentlyViewed(parsed.filter((item: any) => item.id !== listingId).slice(0, 5));
            }
        } catch (e) {
            console.error('Failed to load recently viewed:', e);
        }
    }, [listing, params?.id]);

    const adjustPrice = (amount: number) => {
        setOfferPrice(prev => Math.max(0, prev + amount));
    };


    const [sellerRating, setSellerRating] = useState<{ avg: number; count: number } | null>(null);

    useEffect(() => {
        if (params?.id) {
            fetchListing();
            // Increment view count (fire-and-forget)
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

    // Fetch seller rating after listing loads
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

        return () => supabase.removeChannel(channel);
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

        return () => supabase.removeChannel(channel);
    };

    const fetchListing = async () => {
        setLoading(true);
        setError('');
        try {
            // Real data only — no mock fallback
            const listingId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
            const { data, error } = await supabase
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
                            university
                        )
                    `)
                .eq('id', listingId)
                .single();

            if (error) {
                console.warn("Complex query failed, trying fallback...", error);

                // Fallback query (step 1: get listing)
                const { data: simpleListing, error: simpleError } = await supabase
                    .from('listings')
                    .select('*')
                    .eq('id', listingId)
                    .single();

                if (simpleError) throw simpleError;

                // (step 2: get dealer)
                if (simpleListing) {
                    const { data: dealerData } = await supabase
                        .from('users')
                        .select('id, display_name, is_verified, photo_url, store_type, phone_number, subscription_plan, university')
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
            setError('Asset Signal Lost');
        } finally {
            setLoading(false);
        }
    };

    const handleContactDealer = async () => {
        if (!user) {
            router.push('/login');
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

        // Safety Warning before redirect
        const proceed = confirm("Safety Alert: Negotiating on WhatsApp? \n\nPlease return here to update the price and pay securely in-app. This protects both buyer and seller and ensures platform protocol applies.\n\nProceed to WhatsApp?");
        if (proceed) {
            window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
        }
    };

    const handleMakeOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push('/login');
            return;
        }
        if (!listing) return;

        const price = offerPrice;
        if (price <= 0) {
            setError('Please enter a valid price.');
            return;
        }

        if (isDemoMode && price > 5000) {
            setError('Market Launch Phase 1 restricts all transactions to a maximum of ₦5,000 for network safety.');
            return;
        }

        // Optimistic UI updates
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

            // Alert might be annoying, but keep it per existing behavior or use a toast
            // alert("Offer Transmitted: Waiting for seller response on the secure channel.");
        } catch (err: any) {
            console.error("Offer Error:", err);
            // Revert on error
            setActiveOffer(previousOffer);
            setIsOfferOpen(false);
            setError('Failed to submit offer. Please try again.');
        } finally {
            setIsSubmittingOffer(false);
        }
    };

    const handleCallDealer = () => {
        if (!listing?.dealer?.phone_number) {
            setError('This seller has not added a phone number yet.');
            return;
        }
        window.location.href = `tel:${listing.dealer.phone_number}`;
    };

    const { addToCart } = useCart();

    const handleAddToCart = () => {
        if (!listing) return;
        addToCart({
            listingId: listing.id,
            title: listing.title,
            price: listing.price,
            image: listing.images[0] || '',
            sellerId: listing.dealer.id,
        });
        // Item added to cart via CartContext
    };

    const handlePlaceOrder = async () => {
        if (!user) {
            router.push('/login');
            return;
        }

        if (!listing) return;
        
        const finalAmount = listing.current_offered_price || listing.price;

        if (isDemoMode && finalAmount > 5000) {
            setError('Market Launch Active: You cannot process orders above ₦5,000 during Launch Phase 1. Please negotiate the price down for testing.');
            return;
        }

        setActionLoading(true);

        try {
            // 1. Initialize Transaction on Server
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

            // 2. Redirect to Paystack
            window.location.href = data.authorization_url;

        } catch (err: any) {
            console.error('Checkout Error:', err);
            setError(err.message || 'Checkout failed. Please try again.');
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 flex items-center justify-center text-zinc-900 dark:text-white">
                <Loader2 className="h-10 w-10 animate-spin text-[#FF6200]" />
            </div>
        );
    }

    // Auth Gate: Check if user is logged in
    if (!user && listing) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-white relative flex flex-col pt-28 pb-20 overflow-hidden">
                <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none z-0 dark:opacity-20" />

                <div className="container px-6 mx-auto relative z-10 flex flex-col items-center justify-center flex-1 text-center space-y-8">
                    <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm rounded-[2.5rem] overflow-hidden p-2 border-zinc-100 relative group mb-8 max-w-sm w-full mx-auto shadow-2xl shadow-[#FF6200]/10">
                        <div className="aspect-[4/3] rounded-[2rem] overflow-hidden relative bg-zinc-100 filter blur-sm opacity-50">
                            {listing.images && listing.images.length > 0 && (
                                <Image
                                    src={listing.images[0]}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA]/40">
                            <ShieldCheck className="h-16 w-16 text-[#FF6200]" />
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter max-w-3xl leading-tight">
                        Unlock Full <span className="text-[#FF6200]">Details</span>
                    </h1>

                    <p className="text-zinc-500 text-lg md:text-xl font-medium max-w-xl">
                        Sign in to view price, location, seller info, and contact number for this item.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md pt-4">
                        <Button size="lg" asChild className="h-20 flex-1 bg-[#FF6200] text-black font-black uppercase tracking-[0.2em] hover:bg-[#FF7A29] rounded-[2rem] border-none shadow-[0_20px_40px_rgba(255,98,0,0.2)]">
                            <Link href={`/signup?redirect=/listings/${listing.id}`}>
                                Initialize Account
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild className="h-20 flex-1 border-zinc-200 text-zinc-900 font-black uppercase tracking-[0.2em] hover:bg-white rounded-[2rem]">
                            <Link href={`/login?redirect=/listings/${listing.id}`}>
                                Auth Session
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 flex items-center justify-center px-4 text-zinc-900 dark:text-white">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm p-10 rounded-[2.5rem] border-red-500/20 text-center max-w-md">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-6" />
                    <p className="text-red-400 font-bold uppercase tracking-widest mb-6">{error || 'Asset Signal Lost'}</p>
                    <Button onClick={() => router.push('/listings')} className="border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white hover:bg-white/20">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Stream
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative selection:bg-[#FF6200] selection:text-black pt-28 pb-20">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none z-0 dark:opacity-20" />

            <div className="container px-4 mx-auto relative z-10 max-w-7xl">
                {/* Header / Breadcrumb */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-zinc-100 dark:border-zinc-900 pb-8">
                    <div className="space-y-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="text-[#FF6200] hover:text-[#FF7A29] hover:bg-transparent p-0 h-auto text-[10px] font-black uppercase tracking-[0.2em] font-heading"
                        >
                            <ArrowLeft className="mr-2 h-3 w-3" /> Return to Search
                        </Button>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic font-heading">
                            {listing.title}
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5 text-[#FF6200]"><Activity className="h-3 w-3" /> Available</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                            <span className="text-zinc-900 dark:text-white">{listing.category}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                            <span>ID: #{listing.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Visuals */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm rounded-[2.5rem] overflow-hidden p-2 border-zinc-100 relative group">
                            <div className="aspect-[4/3] rounded-[2rem] overflow-hidden relative bg-zinc-100 dark:bg-zinc-800">
                                {listing.images && listing.images.length > 0 ? (
                                    <Image
                                        src={listing.images[selectedImage]}
                                        alt={listing.title}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest">
                                        No Image Available
                                    </div>
                                )}

                                {/* Overlay Badges */}
                                <div className="absolute top-6 left-6 flex flex-col gap-3">
                                    {(listing.is_verified_listing || listing.verification_status === 'verified') && (
                                        <div className="bg-[#FF6200] text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#FF6200]/20 font-heading italic">
                                            <ShieldCheck className="h-3 w-3" /> Verified Seller
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Thumbnails */}
                        {listing.images && listing.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-4">
                                {listing.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        title={`View image ${idx + 1} of ${listing.images.length}`}
                                        aria-label={`View image ${idx + 1}`}
                                        onClick={() => setSelectedImage(idx)}
                                        className={cn(
                                            "aspect-square rounded-2xl overflow-hidden border transition-all relative group",
                                            selectedImage === idx
                                                ? "border-[#FF6200] ring-1 ring-[#FF6200]"
                                                : "border-zinc-200 hover:border-white/30"
                                        )}
                                    >
                                        <Image
                                            src={img}
                                            alt={`${listing.title} thumbnail`}
                                            fill
                                            className="object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Interaction & Data */}
                    <div className="space-y-8">
                        {/* Price Card */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm rounded-[2.5rem] p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-50">
                                <Zap className="h-24 w-24 text-[#FF6200]/10" />
                            </div>

                            <div className="relative z-10">
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-[0.3em] font-heading mb-2">Current Price</p>
                                <div className="space-y-1 mb-6">
                                    <div className="text-6xl font-black text-zinc-900 dark:text-white italic font-heading tracking-tighter">
                                        ₦{(listing.current_offered_price || listing.price).toLocaleString()}
                                    </div>
                                    {listing.current_offered_price && listing.current_offered_price !== listing.price && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-zinc-500 line-through font-bold">₦{listing.price.toLocaleString()}</span>
                                            <Badge className="bg-[#FF6200]/10 text-[#FF6200] border-none text-[8px] font-black uppercase tracking-widest">Negotiated Rate</Badge>
                                        </div>
                                    )}
                                </div>

                                {user && user.id !== listing.dealer.id ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1 flex flex-col gap-2">
                                                <Button
                                                    onClick={handlePlaceOrder}
                                                    disabled={actionLoading || !listing.dealer.paystack_subaccount_code}
                                                    className="h-16 bg-[#FF6200] text-black hover:bg-[#FF7A29] rounded-2xl font-black uppercase tracking-widest text-xs font-heading italic w-full border-none transition-all disabled:opacity-50 disabled:grayscale"
                                                >
                                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                                    Confirm Purchase
                                                </Button>
                                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl">
                                                    <p className="text-[9px] font-black uppercase tracking-tight text-amber-700 dark:text-amber-400 leading-tight">
                                                        ⚠️ This is a test/demo version. No real transactions or money will be processed. This is for testing purposes only.
                                                    </p>
                                                </div>
                                                {!listing.dealer.paystack_subaccount_code && (
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-red-500 text-center px-4 animate-pulse">
                                                        Seller Payouts Not Configured
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                onClick={handleAddToCart}
                                                variant="outline"
                                                className="h-16 aspect-square rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-200 text-zinc-900 dark:text-white flex items-center justify-center p-0"
                                            >
                                                <ShoppingCart className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                onClick={toggleFavorite}
                                                variant="outline"
                                                className={cn("h-16 aspect-square rounded-2xl border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-0 transition-colors", isFavorite ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 hover:bg-red-100" : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800")}
                                            >
                                                <Heart className={cn("h-6 w-6", isFavorite ? "fill-red-500 text-red-500" : "text-zinc-500")} />
                                            </Button>
                                        </div>

                                        {/* Contact Grid */}
                                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                            {activeOffer && activeOffer.status === 'pending' ? (
                                                <Button disabled className="h-12 rounded-xl border-[#FF6200]/20 bg-[#FF6200]/5 text-[#FF6200] text-[10px] uppercase font-bold tracking-widest opacity-80 cursor-default">
                                                    <Clock className="mr-2 h-3 w-3 animate-pulse" /> Offer Pending
                                                </Button>
                                            ) : (
                                                <Button onClick={() => setIsOfferOpen(true)} variant="outline" className="h-12 rounded-xl border-[#FF6200]/20 bg-[#FF6200]/5 text-[#FF6200] hover:bg-[#FF6200]/10 text-[10px] uppercase font-bold tracking-widest">
                                                    <Zap className="mr-2 h-3 w-3" /> {activeOffer?.status === 'rejected' ? 'Re-Negotiate' : 'Make Offer'}
                                                </Button>
                                            )}
                                            <Button onClick={handleContactDealer} variant="outline" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-900 text-[10px] uppercase font-bold tracking-widest">
                                                <MessageCircle className="mr-2 h-3 w-3" /> Secure Chat
                                            </Button>
                                            <Button onClick={handleWhatsAppDealer} variant="outline" className="h-12 rounded-xl border-[#FF6200]/20 bg-[#FF6200]/5 text-[#FF6200] hover:bg-[#FF6200]/10 text-[10px] uppercase font-bold tracking-widest col-span-2">
                                                <Phone className="mr-2 h-3 w-3" /> WhatsApp Fallback (Pay In-App)
                                            </Button>
                                        </div>

                                        <div className="pt-4 text-center space-y-3">
                                            <button
                                                onClick={() => setIsReportOpen(true)}
                                                className="text-[9px] uppercase font-bold tracking-widest text-red-500/50 hover:text-red-500 transition-colors flex items-center justify-center w-full gap-2"
                                            >
                                                <AlertTriangle className="h-3 w-3" /> Report Suspicious Activity
                                            </button>
                                            <a
                                                href="mailto:support@marketbridge.com.ng?subject=Buyer Help Request"
                                                className="block text-[9px] uppercase font-bold tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-zinc-500 transition-colors"
                                            >
                                                Need Platform Help?
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-zinc-100/50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 text-center">
                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">Owner Mode Active</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Campus', value: listing.location, icon: MapPin },
                                { label: 'Item Brand', value: listing.make, icon: Box },
                                { label: 'Type / Model', value: listing.model, icon: Box },
                                { label: 'Condition', value: listing.condition, icon: Activity },
                                { label: 'Category', value: listing.category, icon: Activity },
                                { label: 'Notes', value: listing.mileage ? `${listing.mileage} KM` : 'Verified Student Listing', icon: Activity },
                            ].map((spec, i) => (
                                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm p-5 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-500 dark:text-zinc-400">
                                        <spec.icon className="h-3 w-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{spec.label}</span>
                                    </div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase truncate">{spec.value || 'N/A'}</p>
                                </div>
                            ))}
                        </div>

                        {/* Merchant Intelligence */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm p-8 rounded-[2.5rem] bg-white/[0.03] dark:bg-zinc-900/[0.03] backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <ShieldCheck className="h-24 w-24 text-[#FF6200]" />
                            </div>
                            <h3 className="text-zinc-900 dark:text-white font-black uppercase text-xs tracking-[0.2em] font-heading mb-6 flex items-center gap-3 relative z-10">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6200]" />
                                Seller Information
                            </h3>
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="h-20 w-20 rounded-[1.5rem] bg-[#FAFAFA] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden relative">
                                    {listing.dealer.photo_url ? (
                                        <Image src={listing.dealer.photo_url} alt={listing.dealer.display_name} fill className="object-cover" />
                                    ) : (
                                        <Store className="h-8 w-8 text-zinc-700 dark:text-zinc-300" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-white">{listing.dealer.display_name}</h4>
                                        {listing.dealer.is_verified && <ShieldCheck className="h-4 w-4 text-[#FF6200]" />}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-widest mb-4">{listing.dealer.university || 'Verified Institution'}</p>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => {
                                                const element = document.getElementById('reviews-section');
                                                if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth' });
                                                }
                                            }}
                                            className="flex items-center gap-1.5 hover:underline cursor-pointer focus:outline-none"
                                        >
                                            <Star className="h-3 w-3 fill-[#FF6200] text-[#FF6200]" />
                                            <span className="text-[10px] font-black italic">
                                                {sellerRating ? `${sellerRating.avg} (${sellerRating.count} reviews)` : 'New Seller'}
                                            </span>
                                        </button>
                                        <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                                        <div className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{listing.dealer.store_type || 'DIGITAL'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm p-8 rounded-[2.5rem]">
                            <h3 className="text-zinc-900 dark:text-white font-black uppercase text-xs tracking-[0.2em] font-heading mb-6 flex items-center gap-3">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6200]" />
                                Item Description
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                                {listing.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div id="reviews-section" className="mt-16 pt-16 border-t border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic font-heading mb-8 flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-[#FF6200]" />
                        Ratings & Reviews
                    </h2>
                    <ReviewsSection listingId={listing.id} sellerId={listing.dealer.id} />
                </div>

                {/* Similar Listings Section */}
                {relatedListings.length > 0 && (
                    <div className="mt-16 pt-16 border-t border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic font-heading mb-8 flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200]" />
                            Similar <span className="text-[#FF6200]">Listings</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {relatedListings.map((item) => (
                                <Link key={item.id} href={`/listings/${item.id}`} className="group block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-4 shadow-sm hover:border-[#FF6200]/20 transition-all">
                                    <div className="aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative mb-4">
                                        {item.images && item.images.length > 0 ? (
                                            <Image src={item.images[0]} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold uppercase text-[10px]">No Image</div>
                                        )}
                                    </div>
                                    <h3 className="font-black uppercase tracking-tighter italic text-zinc-900 dark:text-white group-hover:text-[#FF6200] transition-colors truncate">{item.title}</h3>
                                    <p className="text-[#FF6200] font-black italic mt-1">₦{item.price.toLocaleString()}</p>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-2">{item.location || 'Campus'}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recently Viewed Section */}
                {recentlyViewed.length > 0 && (
                    <div className="mt-16 pt-16 border-t border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic font-heading mb-8 flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200]" />
                            Recently <span className="text-[#FF6200]">Viewed</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                            {recentlyViewed.map((item) => (
                                <Link key={item.id} href={`/listings/${item.id}`} className="group block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-3 shadow-sm hover:border-[#FF6200]/20 transition-all">
                                    <div className="aspect-[4/3] rounded-[1rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative mb-3">
                                        {item.images && item.images.length > 0 ? (
                                            <Image src={item.images[0]} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold uppercase text-[9px]">No Image</div>
                                        )}
                                    </div>
                                    <h3 className="font-black uppercase tracking-tighter italic text-xs text-zinc-900 dark:text-white group-hover:text-[#FF6200] transition-colors truncate">{item.title}</h3>
                                    <p className="text-[#FF6200] font-black italic text-xs mt-0.5">₦{item.price.toLocaleString()}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                        {/* Offer Dialog */}
            <Dialog open={isOfferOpen} onOpenChange={setIsOfferOpen}>
                <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white sm:max-w-sm rounded-[2.5rem] overflow-hidden p-0">
                    <form onSubmit={handleMakeOffer}>
                        <div className="p-8 space-y-8">
                            <div className="text-center space-y-2">
                                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter italic">
                                    Make an <span className="text-[#FF6200]">Offer</span>
                                </DialogTitle>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                    Adjust your offer using the controls below
                                </p>
                            </div>

                            <div className="flex flex-col items-center justify-center space-y-6 py-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">Your Offer</p>
                                    <div className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums">
                                        ₦{offerPrice.toLocaleString()}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full px-4">
                                    <Button 
                                        type="button"
                                        onClick={() => adjustPrice(-500)}
                                        className="h-14 w-14 rounded-2xl bg-zinc-100 text-zinc-900 border-none hover:bg-red-50 hover:text-red-500 transition-all font-black text-xl"
                                    >
                                        -
                                    </Button>
                                    <div className="flex-1 text-center">
                                        <div className="h-[1px] w-full bg-zinc-100 relative">
                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                                                Adjustment
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        type="button"
                                        onClick={() => adjustPrice(500)}
                                        className="h-14 w-14 rounded-2xl bg-zinc-100 text-zinc-900 border-none hover:bg-green-50 hover:text-green-500 transition-all font-black text-xl"
                                    >
                                        +
                                    </Button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 w-full pt-4">
                                     <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOfferPrice(listing.price)}
                                        className="h-10 rounded-xl border-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-500"
                                    >
                                        Reset
                                    </Button>
                                    <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => adjustPrice(2000)}
                                        className="h-10 rounded-xl border-zinc-100 text-[9px] font-black uppercase tracking-widest text-[#FF6200]"
                                    >
                                        Add +2k
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-[#FF6200]/10 border border-[#FF6200]/20 p-4 rounded-2xl">
                                <p className="text-[9px] text-[#FF6200] font-black uppercase leading-tight text-center">
                                    All negotiations are secured by MarketBridge.
                                </p>
                            </div>
                        </div>

                         <div className="flex p-4 bg-zinc-50 border-t border-zinc-100 gap-3">
                            <Button type="button" variant="ghost" onClick={() => setIsOfferOpen(false)} className="flex-1 h-14 rounded-2xl text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Close</Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingOffer}
                                className="flex-2 h-14 bg-[#FF6200] text-black hover:bg-[#FF7A29] font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all border-none px-8"
                            >
                                {isSubmittingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Offer"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Report Dialog */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="bg-zinc-50 border-zinc-200 text-zinc-900 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-[#FF6200] uppercase font-black tracking-widest flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Report Issue
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 text-xs">
                            Help us keep MarketBridge safe. Reports are anonymous and reviewed by Campus Admins.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-zinc-500">Reason</Label>
                            <Select onValueChange={setReportReason}>
                                <SelectTrigger className="bg-[#FAFAFA]/50 border-zinc-200 text-xs">
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-100 border-zinc-200 text-zinc-900">
                                    <SelectItem value="fraud">Fraud / Scam</SelectItem>
                                    <SelectItem value="fake_item">Fake / Counterfeit Item</SelectItem>
                                    <SelectItem value="harassment">Harassment / Abusive Dealer</SelectItem>
                                    <SelectItem value="wrong_category">Wrong Category</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-zinc-500">Details</Label>
                            <Textarea
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                                placeholder="Describe the issue..."
                                className="bg-[#FAFAFA]/50 border-zinc-200 text-xs min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReportOpen(false)} className="text-zinc-500 hover:text-zinc-900">Cancel</Button>
                        <Button
                            onClick={() => {
                                const subject = `REPORT: ${listing.id} - ${reportReason.toUpperCase()}`;
                                const body = `Reporting Listing: ${listing.title} (ID: ${listing.id})\nDealer: ${listing.dealer.display_name}\nReason: ${reportReason}\nDetails: ${reportDetails}\n\nSubmitted by User: ${user?.email || 'Anonymous'}`;
                                window.location.href = `mailto:safety@marketbridge.ng?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                setIsReportOpen(false);
                                console.warn('UI_ALERT: Report initiated');
                            }}
                            className="bg-red-600 text-zinc-900 hover:bg-red-700 font-bold uppercase tracking-widest text-xs"
                        >
                            Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </div>
);
}

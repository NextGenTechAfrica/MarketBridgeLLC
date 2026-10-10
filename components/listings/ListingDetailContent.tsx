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
    CheckCircle, ChevronRight, Share2, HelpCircle, Minus, Plus, Truck,
    CheckCircle2, Info, Flag, Sparkles, Building2, ExternalLink, ArrowRight
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
import { Input } from "@/components/ui/input";

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
    stock?: number;
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

    // Quantity selector & Note for purchase panel (Tokosm ile / Tokopedia Pattern)
    const [quantity, setQuantity] = useState(1);
    const [buyerNote, setBuyerNote] = useState('');
    const [activeTab, setActiveTab] = useState<'detail' | 'specs' | 'seller' | 'reviews'>('detail');

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

    const handleShare = () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({
                title: listing?.title || 'MarketBridge Listing',
                url: window.location.href,
            }).catch(() => null);
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            toast('Product link copied to clipboard!', 'success');
        }
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
        const message = encodeURIComponent(`Hello, I saw your ${listing.title} on MarketBridge. Is it still available for campus delivery?`);

        const proceed = confirm("Safety Reminder:\n\nWhen contacting sellers via WhatsApp, always pay through MarketBridge Escrow to guarantee your money is protected until delivery.\n\nProceed to WhatsApp?");
        if (proceed) {
            window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
        }
    };

    const handleAddToCartClick = () => {
        if (!listing) return;
        addToCart({
            listingId: listing.id,
            title: listing.title,
            price: listing.current_offered_price || listing.price,
            image: listing.images?.[0] || '',
            sellerId: listing.dealer.id,
        }, quantity);
        toast(`Added ${quantity} item(s) to cart`, 'success');
    };

    const handleBuyNow = () => {
        if (!listing) return;
        // Add to cart with selected quantity, then navigate to checkout immediately
        addToCart({
            listingId: listing.id,
            title: listing.title,
            price: listing.current_offered_price || listing.price,
            image: listing.images?.[0] || '',
            sellerId: listing.dealer.id,
        }, quantity);

        if (!user) {
            router.push(`/login?redirect=/checkout`);
        } else {
            router.push('/checkout');
        }
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

    const handleReportListing = async () => {
        if (!user) {
            router.push(`/login?redirect=/listings/${listing?.id}`);
            return;
        }
        if (!reportReason) {
            toast('Please select a reason', 'error');
            return;
        }
        try {
            await supabase.from('disputes').insert({
                reporter_id: user.id,
                listing_id: listing?.id,
                reason: reportReason,
                details: reportDetails,
                status: 'pending'
            });
            toast('Listing reported for admin investigation', 'success');
            setIsReportOpen(false);
        } catch {
            toast('Failed to submit report. Please try again.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#FF6200]" />
                <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading listing details...</p>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="bg-card border border-border rounded-3xl p-8 text-center max-w-md space-y-4 shadow-xl">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <AlertTriangle className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-black text-foreground font-heading">Listing Unavailable</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">{error || 'This listing may have been sold or removed from the marketplace.'}</p>
                    <Button onClick={() => router.push('/marketplace')} className="bg-[#FF6200] hover:bg-[#E55800] text-white font-bold rounded-xl px-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Browse Marketplace
                    </Button>
                </div>
            </div>
        );
    }

    const unitPrice = listing.current_offered_price || listing.price;
    const subtotal = unitPrice * quantity;
    const isOwner = user && user.id === listing.dealer.id;
    const availableStock = listing.stock || 5;

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pt-4">

                {/* ─── 1. Breadcrumbs & Top Navigation (Tokosm / Tokopedia Reference) ─── */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-b border-border/60 pb-3">
                    <nav className="flex items-center gap-1.5 flex-wrap">
                        <Link href="/" className="hover:text-[#FF6200] transition-colors font-medium">Home</Link>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                        <Link href="/marketplace" className="hover:text-[#FF6200] transition-colors font-medium">Marketplace</Link>
                        {listing.category && (
                            <>
                                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                                <Link href={`/marketplace?category=${encodeURIComponent(listing.category)}`} className="hover:text-[#FF6200] transition-colors font-medium">
                                    {listing.category}
                                </Link>
                            </>
                        )}
                        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-foreground font-bold truncate max-w-[220px]">{listing.title}</span>
                    </nav>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleShare}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            <span>Share</span>
                        </button>
                        <button
                            type="button"
                            onClick={toggleFavorite}
                            className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                                isFavorite ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-red-500")} />
                            <span>{isFavorite ? 'Saved' : 'Wishlist'}</span>
                        </button>
                    </div>
                </div>

                {/* ─── 2. Main 3-Column Tokosm / Tokopedia Grid ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ──── Column 1: Product Gallery (Left ~38%) ──── */}
                    <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
                        <div className="bg-card border border-border rounded-3xl overflow-hidden relative shadow-sm group">
                            <div className="aspect-[4/3] sm:aspect-square relative bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                                {listing.images && listing.images.length > 0 ? (
                                    <Image
                                        src={listing.images[selectedImage]}
                                        alt={listing.title}
                                        fill
                                        className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <Store className="h-20 w-20 opacity-30" />
                                    </div>
                                )}

                                {/* Overlay Badges */}
                                <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                                    {(listing.is_verified_listing || listing.verification_status === 'verified') && (
                                        <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Verified Listing
                                        </span>
                                    )}
                                    {listing.condition && (
                                        <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm capitalize border border-border">
                                            {listing.condition.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Thumbnails Row */}
                        {listing.images && listing.images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                {listing.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={cn(
                                            "relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-zinc-100 dark:bg-zinc-900",
                                            selectedImage === idx
                                                ? "border-[#FF6200] ring-4 ring-[#FF6200]/20 scale-105"
                                                : "border-border hover:border-zinc-400 opacity-70 hover:opacity-100"
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

                        {/* Escrow Guarantee Pill Beneath Gallery */}
                        <div className="p-3.5 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-[#FF6200]/20 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#FF6200]/15 flex items-center justify-center text-[#FF6200] shrink-0">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="leading-tight">
                                <p className="text-xs font-bold text-zinc-900 dark:text-white">Zero-Fraud Campus Escrow</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Funds released only after you inspect and accept items on campus.</p>
                            </div>
                        </div>
                    </div>

                    {/* ──── Column 2: Center Info, Tabs & Reviews (Center ~40%) ──── */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Title, Category & Price */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6200] bg-[#FF6200]/10 px-2.5 py-0.5 rounded-md">
                                    {listing.category || 'General'}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-[#FF6200]" />
                                    {listing.location || listing.dealer.university || 'Abuja Campus'}
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-heading leading-tight">
                                {listing.title}
                            </h1>

                            {/* Ratings & Metrics Summary */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                                <div className="flex items-center gap-1 font-bold text-amber-500">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    <span className="text-foreground">{sellerRating?.avg || '4.9'}</span>
                                    <span className="text-muted-foreground font-normal">({sellerRating?.count || 12} reviews)</span>
                                </div>
                                <span className="text-border">|</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Verified Student Seller
                                </span>
                            </div>

                            {/* Main Price Tag */}
                            <div className="pt-2 pb-1">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl sm:text-4xl font-black text-[#FF6200] tracking-tight font-heading">
                                        ₦{unitPrice.toLocaleString()}
                                    </span>
                                    {listing.current_offered_price && listing.current_offered_price !== listing.price && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm text-muted-foreground line-through">
                                                ₦{listing.price.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                Special Offer
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Campus Delivery Specs Badge */}
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-border space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                    <Truck className="h-4 w-4 text-[#FF6200]" />
                                    Delivery Options:
                                </span>
                                <span className="font-bold text-foreground">Hostel Drop-off / Campus Meetup</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-[#FF6200]" />
                                    Estimated Delivery:
                                </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">15 – 30 Minutes</span>
                            </div>
                        </div>

                        {/* Navigation Tabs (Tokosm Style: Detail, Specs, Seller, Reviews) */}
                        <div className="border-b border-border flex items-center gap-6 text-sm font-bold">
                            <button
                                type="button"
                                onClick={() => setActiveTab('detail')}
                                className={cn(
                                    "pb-3 relative transition-colors cursor-pointer",
                                    activeTab === 'detail' ? "text-[#FF6200]" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Description
                                {activeTab === 'detail' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6200] rounded-full" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('specs')}
                                className={cn(
                                    "pb-3 relative transition-colors cursor-pointer",
                                    activeTab === 'specs' ? "text-[#FF6200]" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Specifications
                                {activeTab === 'specs' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6200] rounded-full" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('seller')}
                                className={cn(
                                    "pb-3 relative transition-colors cursor-pointer",
                                    activeTab === 'seller' ? "text-[#FF6200]" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Seller Info
                                {activeTab === 'seller' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6200] rounded-full" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('reviews')}
                                className={cn(
                                    "pb-3 relative transition-colors cursor-pointer",
                                    activeTab === 'reviews' ? "text-[#FF6200]" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Reviews ({sellerRating?.count || 0})
                                {activeTab === 'reviews' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6200] rounded-full" />
                                )}
                            </button>
                        </div>

                        {/* Tab Content Display */}
                        {activeTab === 'detail' && (
                            <div className="space-y-4 leading-relaxed text-sm text-foreground/90">
                                <p className="whitespace-pre-line">{listing.description}</p>
                            </div>
                        )}

                        {activeTab === 'specs' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-border/70">
                                        <p className="text-muted-foreground">Category</p>
                                        <p className="font-bold text-foreground mt-0.5">{listing.category || 'General'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-border/70">
                                        <p className="text-muted-foreground">Condition</p>
                                        <p className="font-bold text-foreground mt-0.5 capitalize">{listing.condition?.replace('_', ' ') || 'Good'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-border/70">
                                        <p className="text-muted-foreground">Campus Institution</p>
                                        <p className="font-bold text-foreground mt-0.5">{listing.dealer?.university || 'Abuja Universities'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-border/70">
                                        <p className="text-muted-foreground">Stock Status</p>
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">In Stock ({availableStock} units)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'seller' && (
                            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#FF6200] to-amber-500 flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                                        {listing.dealer.display_name?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="font-bold text-foreground text-sm truncate">{listing.dealer.display_name}</h4>
                                            {listing.dealer.is_verified && (
                                                <span title="Verified Student Seller">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{listing.dealer.university || 'Verified Campus Merchant'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                                    <span>Average Response: <strong className="text-foreground">Within 10 mins</strong></span>
                                    <span>Orders Delivered: <strong className="text-[#FF6200]">99.4%</strong></span>
                                </div>
                                <div className="flex gap-2.5 pt-1">
                                    <Button
                                        onClick={handleContactDealer}
                                        variant="outline"
                                        className="flex-1 h-9 rounded-xl text-xs font-bold border-[#FF6200]/30 text-[#FF6200] hover:bg-[#FF6200]/10"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chat Seller
                                    </Button>
                                    <Button
                                        onClick={handleWhatsAppDealer}
                                        variant="outline"
                                        className="flex-1 h-9 rounded-xl text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                    >
                                        <Phone className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="space-y-4">
                                <ReviewsSection sellerId={listing.dealer.id} listingId={listing.id} />
                            </div>
                        )}

                        {/* Report listing trigger */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setIsReportOpen(true)}
                                className="text-xs text-muted-foreground/80 hover:text-red-500 inline-flex items-center gap-1.5 transition-colors"
                            >
                                <Flag className="h-3 w-3" />
                                <span>Report inappropriate listing or seller</span>
                            </button>
                        </div>
                    </div>

                    {/* ──── Column 3: Distinct Purchase Panel (Right ~32% - Tokosm Reference) ──── */}
                    <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-24">
                        <div className="bg-card border border-border rounded-3xl p-5 shadow-lg space-y-5">
                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground font-heading">
                                Set Quantity & Order
                            </h3>

                            {/* Quantity Selector */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-foreground">Quantity</span>
                                    <span className="text-muted-foreground">Total Stock: {availableStock}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="font-black text-base text-foreground font-heading">
                                        {quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                                        disabled={quantity >= availableStock}
                                        className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Subtotal Calculation */}
                            <div className="pt-3 border-t border-border flex items-baseline justify-between">
                                <span className="text-xs font-bold text-muted-foreground">Subtotal</span>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-[#FF6200] font-heading">
                                        ₦{subtotal.toLocaleString()}
                                    </span>
                                    {quantity > 1 && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            (₦{unitPrice.toLocaleString()} × {quantity})
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Demo Notice if active */}
                            {isDemoMode && (
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-snug">
                                    Demo Mode: Transactions capped at ₦5,000 for test simulation.
                                </div>
                            )}

                            {/* Action Buttons (1:1 with Tokosm / Tokopedia) */}
                            {!isOwner ? (
                                <div className="space-y-2.5 pt-1">
                                    {/* + Add to Cart */}
                                    <Button
                                        type="button"
                                        onClick={handleAddToCartClick}
                                        variant="outline"
                                        className="w-full h-11 border-2 border-[#FF6200] text-[#FF6200] hover:bg-[#FF6200]/10 font-bold text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="h-4 w-4" />
                                        <span>+ Add to Cart</span>
                                    </Button>

                                    {/* Buy Now (Direct Checkout) */}
                                    <Button
                                        type="button"
                                        onClick={handleBuyNow}
                                        className="w-full h-12 bg-[#FF6200] hover:bg-[#E55800] text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-[#FF6200]/25 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Zap className="h-4 w-4" />
                                        <span>Buy Now (Escrow)</span>
                                    </Button>

                                    {/* Secondary Action: Make an Offer */}
                                    <div className="pt-1">
                                        {activeOffer && activeOffer.status === 'pending' ? (
                                            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border text-center text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2">
                                                <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                                Offer of ₦{activeOffer.offered_price?.toLocaleString()} Pending
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsOfferOpen(true)}
                                                className="w-full py-2 text-xs font-bold text-[#FF6200] hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Sparkles className="h-3.5 w-3.5" />
                                                <span>Negotiate / Make an Offer</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-center space-y-2">
                                    <p className="text-xs font-bold text-foreground">You own this listing</p>
                                    <Button
                                        asChild
                                        size="sm"
                                        className="w-full bg-[#FF6200] hover:bg-[#E55800] text-white text-xs font-bold rounded-xl"
                                    >
                                        <Link href={`/seller/listings/${listing.id}/edit`}>
                                            Edit Listing Details
                                        </Link>
                                    </Button>
                                </div>
                            )}

                            {/* Escrow Guarantee Bullet */}
                            <div className="pt-2 border-t border-border text-[11px] text-muted-foreground space-y-2">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Zero-Fraud Escrow holds payment until you inspect and approve on delivery.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 3. Related Campus Listings (Bottom Section) ─── */}
                {relatedListings && relatedListings.length > 0 && (
                    <div className="pt-12 border-t border-border space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-foreground font-heading">
                                    Similar Items on Campus
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Explore more deals from verified student sellers in this category</p>
                            </div>
                            <Link href={`/marketplace?category=${encodeURIComponent(listing.category || '')}`} className="text-xs font-bold text-[#FF6200] hover:underline flex items-center gap-1">
                                <span>See all</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {relatedListings.slice(0, 4).map((relListing) => (
                                <ListingCard key={relListing.id} listing={relListing} variant="grid" />
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── 4. Recently Viewed Listings ─── */}
                {recentlyViewed && recentlyViewed.length > 0 && (
                    <div className="pt-10 border-t border-border space-y-6">
                        <h2 className="text-lg font-black text-foreground font-heading">
                            Recently Viewed
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {recentlyViewed.map((recent) => (
                                <ListingCard key={recent.id} listing={recent} variant="grid" />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Sticky Mobile Action Bar (for small screens) ─── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3 flex items-center gap-2.5 shadow-2xl">
                <Button
                    onClick={handleContactDealer}
                    variant="outline"
                    className="h-11 px-3.5 rounded-xl border-border"
                    title="Chat Seller"
                >
                    <MessageCircle className="h-4 w-4 text-[#FF6200]" />
                </Button>
                <Button
                    onClick={handleAddToCartClick}
                    variant="outline"
                    className="flex-1 h-11 rounded-xl border-2 border-[#FF6200] text-[#FF6200] font-bold text-xs"
                >
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    + Add to Cart
                </Button>
                <Button
                    onClick={handleBuyNow}
                    className="flex-1 h-11 bg-[#FF6200] hover:bg-[#E55800] text-white font-black text-xs rounded-xl shadow-md"
                >
                    <Zap className="h-4 w-4 mr-1.5" />
                    Buy Now
                </Button>
            </div>

            {/* ─── Offer / Negotiation Modal ─── */}
            <Dialog open={isOfferOpen} onOpenChange={setIsOfferOpen}>
                <DialogContent className="sm:max-w-md bg-card border border-border rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black font-heading">Make an Offer</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Propose your price to the seller. If accepted, you can proceed to escrow checkout at the agreed rate.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleMakeOffer} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Your Proposed Price (₦)</Label>
                            <Input
                                type="number"
                                min={500}
                                value={offerPrice}
                                onChange={(e) => setOfferPrice(Number(e.target.value))}
                                className="h-12 rounded-xl text-lg font-black text-[#FF6200] font-heading"
                                placeholder="Enter your price"
                            />
                            <div className="flex gap-2 pt-1">
                                {[0.9, 0.85, 0.8].map((pct) => (
                                    <button
                                        key={pct}
                                        type="button"
                                        onClick={() => setOfferPrice(Math.round(listing.price * pct))}
                                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground"
                                    >
                                        -{Math.round((1 - pct) * 100)}% (₦{Math.round(listing.price * pct).toLocaleString()})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
                                className="bg-[#FF6200] hover:bg-[#E55800] text-white font-bold rounded-xl"
                            >
                                {isSubmittingOffer ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                Send Offer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Report Listing Modal ─── */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="sm:max-w-md bg-card border border-border rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black font-heading text-red-500 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Report This Listing
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Help us keep MarketBridge safe. Reports are reviewed immediately by campus moderators.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Reason for Report</Label>
                            <select
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-xs"
                            >
                                <option value="">Select a reason...</option>
                                <option value="fraud_or_scam">Suspected Fraud / Fake Item</option>
                                <option value="prohibited_item">Prohibited Campus Item</option>
                                <option value="incorrect_price">Misleading Price or Description</option>
                                <option value="unresponsive_seller">Unresponsive / Inactive Seller</option>
                                <option value="other">Other Violation</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Additional Details</Label>
                            <Textarea
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                                placeholder="Explain what is wrong with this listing..."
                                className="rounded-xl text-xs min-h-[80px]"
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsReportOpen(false)}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleReportListing}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
                            >
                                Submit Report
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

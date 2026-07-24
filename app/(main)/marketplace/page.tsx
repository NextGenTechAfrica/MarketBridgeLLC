'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
import { Loader2, Search, MapPin, Store, Globe, ShieldCheck, Star, SlidersHorizontal, Zap, Calendar, ArrowUpRight, ArrowLeft } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { intelligentSearch, trackSearch, getSearchSuggestions } from '@/lib/ai-search';
import { SponsoredBadge } from '@/components/listings/SponsoredBadge';

const UNIVERSITIES = [
    "Baze University",
    "Nile University of Nigeria",
    "Veritas University",
    "Other Abuja Private University"
];

interface Listing {
    id: string;
    seller_id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    status: string;
    location: string | null;
    created_at: string;
    condition?: string;
    campus?: string;
    delivery_type?: string;
    delivery_fee?: number;
    delivery_eta?: string;
    is_verified_listing?: boolean;
    verification_status?: string;
    is_sponsored?: boolean;
    seller?: {
        id: string;
        display_name: string;
        is_verified: boolean;
        store_type?: 'physical' | 'online' | 'both';
        university?: string;
    };
}

import { Suspense } from 'react';

function ListingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const initialLocation = searchParams?.get('location') || '';

    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState(searchParams?.get('q') || searchParams?.get('search') || '');
    const [campus, setCampus] = useState(initialLocation);
    const [category, setCategory] = useState(searchParams?.get('category') || 'All Categories');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [condition, setCondition] = useState('all');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (!search || search.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await getSearchSuggestions(search);
                setSuggestions(res);
            } catch (e) {
                console.error('Failed to get suggestions:', e);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    useEffect(() => {
        // Feed defaults to user's university
        if (!initialLocation && user?.university && !campus) {
            setCampus(user.university);
        }
    }, [user, initialLocation, campus]);

    useEffect(() => {
        const alertMsg = searchParams?.get('alert');
        if (alertMsg === 'invalid_school_email') {
            // Slight delay ensures the toast component is fully mounted
            setTimeout(() => {
                toast('Seller access denied: Educational email (.edu.ng) is required. You have been placed in a Buyer account.', 'error');
            }, 500);
            
            const url = new URL(window.location.href);
            url.searchParams.delete('alert');
            window.history.replaceState({}, '', url.toString());
        }
    }, [searchParams, toast]);

    useEffect(() => {
        fetchListings();

        // Real-time subscription for new listings
        const channel = supabase
            .channel('public:listings')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'listings',
                    filter: 'status=eq.active'
                },
                (payload: any) => {
                    console.log('New listing detected:', payload);
                    // Refresh listings to get joined seller data properly
                    fetchListings();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [category, condition, campus, search, user?.id, authLoading]);

    const fetchListings = async () => {
        if (authLoading) return;

        setLoading(true);
        setError('');

        if (!user) {
            setListings([]);
            setLoading(false);
            return;
        }

        try {
            let resultData: Listing[] = [];

            // Sync expired sponsorships on every fetch (lightweight)
            try { await supabase.rpc('sync_sponsorship_expiry'); } catch { /* non-critical */ }

            // Use AI-powered intelligent search if there's a search query
            if (search && search.trim()) {
                const results = await intelligentSearch({
                    query: search,
                    category: category !== 'All Categories' ? category : undefined,
                    location: campus || undefined,
                    minPrice: minPrice ? parseInt(minPrice) : undefined,
                    maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
                    limit: 50
                });

                resultData = results as Listing[];

                // Track search for analytics
                await trackSearch({
                    userId: user?.id,
                    query: search,
                    resultsCount: results.length
                });
            } else {
                // Build base query filter
                const buildQuery = (baseQuery: any) => {
                    let q = baseQuery.eq('status', 'active');
                    if (category && category !== 'All Categories') q = q.eq('category', category);
                    if (campus && campus !== 'Global') q = q.eq('campus', campus);
                    if (minPrice) q = q.gte('price', parseInt(minPrice));
                    if (maxPrice) q = q.lte('price', parseInt(maxPrice));
                    if (condition !== 'all') q = q.eq('condition', condition);
                    return q;
                };

                const selectFields = `
                    *,
                    seller:users!listings_seller_id_fkey(
                        id,
                        display_name,
                        is_verified,
                        store_type,
                        university
                    )
                `;

                // Fetch sponsored listings first (pinned to top)
                const { data: sponsored } = await buildQuery(
                    supabase.from('listings').select(selectFields)
                        .eq('is_sponsored', true)
                        .gt('sponsored_until', new Date().toISOString())
                )
                    .order('sponsored_tier', { ascending: false }) // premium > featured > basic
                    .order('created_at', { ascending: false })
                    .limit(8);

                // Fetch regular (non-sponsored) listings
                const { data: regular, error: fetchError } = await buildQuery(
                    supabase.from('listings').select(selectFields)
                        .or('is_sponsored.eq.false,sponsored_until.lt.' + new Date().toISOString())
                )
                    .order('created_at', { ascending: false })
                    .limit(80);

                if (fetchError) throw fetchError;

                // Merge: sponsored pinned first, then regular (deduplicated)
                const sponsoredIds = new Set((sponsored || []).map((l: Listing) => l.id));
                const deduped = (regular || []).filter((l: Listing) => !sponsoredIds.has(l.id));
                resultData = [...(sponsored || []), ...deduped];
            }

            setListings(resultData);
        } catch (err: unknown) {
            console.error('Error fetching listings:', err);
            setError('Failed to load listings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchListings();
    };

    // Removed the strict auth redirect so non-authenticated users can view the index UI but NOT the actual listings data.

    return (
        <div className="min-h-screen bg-background text-foreground relative selection:bg-[#FF6200] selection:text-black flex flex-col pt-16 md:pt-28 pb-20">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-10 dark:opacity-5 pointer-events-none z-0" />

            <div className="container px-4 sm:px-6 mx-auto relative z-10 space-y-8 md:space-y-12">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-heading">Live Campus Feed</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter italic font-heading">
                        Market<span className="text-[#FF6200]">Place</span>
                    </h1>
                    <p className="text-muted-foreground font-medium italic text-sm md:text-base">
                        Showing <span className="text-foreground font-bold">{listings.length} active listings</span> across the campus.
                    </p>
                </div>

                {/* Search & Filters */}
                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-[#FF6200] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search active listings..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-10 md:pl-16 pr-4 md:pr-6 h-14 md:h-16 text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6200]/50 rounded-2xl font-medium italic text-xs md:text-sm transition-all"
                        />
                        {suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                {suggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setSearch(suggestion);
                                            setSuggestions([]);
                                        }}
                                        className="w-full text-left px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 text-xs md:text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-none"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                        <div className="sm:col-span-1 md:col-span-5">
                            <select
                                title="Filter by Category"
                                aria-label="Filter by Category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 md:px-6 h-14 md:h-16 text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF6200]/50 rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[10px] appearance-none cursor-pointer"
                            >
                                <option value="All Categories" className="bg-[#FAFAFA] dark:bg-zinc-900 text-zinc-900 dark:text-white">All Categories</option>
                                {CATEGORIES.map((cat: any, idx: number) => (
                                    <option key={idx} value={cat.name} className="bg-[#FAFAFA] dark:bg-zinc-900 text-zinc-900 dark:text-white">{cat.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-1 md:col-span-3">
                            <select
                                title="Filter by Campus"
                                aria-label="Filter by Campus"
                                value={campus}
                                onChange={(e) => setCampus(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 md:px-6 h-14 md:h-16 text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF6200]/50 rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[10px] appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-[#FAFAFA] dark:bg-zinc-900 text-zinc-900 dark:text-white">All Universities</option>
                                {UNIVERSITIES.map(u => (
                                    <option key={u} value={u} className="bg-[#FAFAFA] dark:bg-zinc-900 text-zinc-900 dark:text-white">{u}</option>
                                ))}
                                <option value="Global" className="bg-[#FAFAFA] dark:bg-zinc-900 text-zinc-900 dark:text-white">Everywhere</option>
                            </select>
                        </div>

                        <Button type="submit" className="sm:col-span-2 md:col-span-4 h-14 md:h-16 bg-[#FF6200] text-black hover:bg-[#FF7A29] font-black uppercase tracking-widest rounded-2xl border-none shadow-[0_10px_20px_rgba(255,98,0,0.1)] text-xs md:text-sm">
                            Search Market
                        </Button>
                    </div>
                </form>

                {/* Loading State - Skeleton Grid */}
                {loading && (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pt-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full">
                                <Skeleton className="h-48 xs:h-56 sm:h-64 w-full rounded-none bg-zinc-100 dark:bg-zinc-800" />
                                <div className="p-4 md:p-8 space-y-4 md:space-y-6 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2 md:space-y-3">
                                        <Skeleton className="h-2 md:h-3 w-16 md:w-24 bg-zinc-100 dark:bg-zinc-800" />
                                        <Skeleton className="h-4 md:h-6 w-3/4 bg-zinc-100 dark:bg-zinc-800" />
                                        <Skeleton className="h-3 md:h-4 w-full bg-zinc-100 dark:bg-zinc-800" />
                                        <Skeleton className="h-3 md:h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800" />
                                    </div>
                                    <div className="pt-4 md:pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                        <div className="flex flex-col space-y-1 md:space-y-2">
                                            <Skeleton className="h-1.5 md:h-2 w-12 md:w-16 bg-zinc-100 dark:bg-zinc-800" />
                                            <Skeleton className="h-4 md:h-6 w-16 md:w-24 bg-[#FF6200]/20" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-[#FF6200]/10 border border-[#FF6200]/20 p-6 text-[#FF6200] font-mono text-sm">
                        {error}
                    </div>
                )}

                {/* Unauthenticated State */}
                {!loading && !error && !user && (
                    <div className="pt-8 flex flex-col items-center gap-6">
                        <EmptyState
                            icon={<ShieldCheck className="w-12 h-12 text-[#FF6200]" />}
                            title="Authentication Required"
                            description="Log in to view live campus listings and start trading with verified students."
                            actionLabel="Log In"
                            onAction={() => router.push('/login?redirect=/marketplace')}
                        />
                        <Link href="/">
                            <Button variant="ghost" className="text-zinc-500 hover:text-white hover:bg-zinc-800/50 uppercase text-[10px] font-black tracking-widest rounded-xl h-10 px-6 transition-all">
                                ← Return to Homepage
                            </Button>
                        </Link>
                    </div>
                )}

                {/* No Results State */}
                {!loading && !error && user && listings.length === 0 && (
                    <div className="pt-8">
                        <EmptyState
                            icon={<Search className="w-12 h-12 text-[#FF6200]" />}
                            title="Zero Matches Found"
                            description="Adjust your filters or search terms to find what you're looking for."
                            actionLabel="Clear Filters"
                            onAction={() => {
                                setSearch('');
                                setCategory('All Categories');
                                setCampus('');
                                fetchListings();
                            }}
                        />
                    </div>
                )}

                {/* Listings Grid */}
                {!loading && !error && listings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {listings.map((listing) => (
                            <Link key={listing.id} href={`/listings/${listing.id}`}>
                                <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm transition-all duration-500 group overflow-hidden flex flex-col h-full shadow-2xl ${listing.is_sponsored
                                    ? 'border-[#FF6200]/30 hover:border-[#FF6200]/60 shadow-[#FF6200]/5'
                                    : 'hover:border-[#FF6200]/40 hover:shadow-[#FF6200]/10'
                                    }`}>
                                    <div className="relative h-64 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
                                        {listing.images && listing.images[0] ? (
                                            <Image
                                                src={listing.images[0]}
                                                alt={listing.title}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Store className="h-12 w-12 text-zinc-900/10 dark:text-white/10" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                                            {listing.is_verified_listing && (
                                                <div className="px-3 py-1.5 rounded-full bg-[#FF6200] text-black font-black text-[8px] tracking-widest flex items-center gap-1.5 shadow-xl">
                                                    <ShieldCheck className="h-3 w-3" />
                                                    VERIFIED
                                                </div>
                                            )}
                                        </div>

                                        {listing.is_sponsored && (
                                            <div className="absolute top-4 left-4">
                                                <SponsoredBadge />
                                            </div>
                                        )}

                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                                            <div className="h-10 w-10 rounded-full bg-[#FF6200] flex items-center justify-center text-black">
                                                <ArrowUpRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-black text-[#FF6200] uppercase tracking-widest">{listing.category ? listing.category.toUpperCase() : 'UNCATEGORIZED'}</span>
                                                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                                <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 italic">{listing.location || 'Remote'}</span>
                                            </div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter italic font-heading line-clamp-1 text-zinc-900 dark:text-white group-hover:text-[#FF6200] transition-colors leading-tight">
                                                {listing.title}
                                            </h3>
                                            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium italic line-clamp-2 leading-relaxed">
                                                {listing.description}
                                            </p>
                                        </div>

                                        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Pricing Unit</span>
                                                <span className="text-2xl font-black text-zinc-900 dark:text-white italic font-heading tracking-tighter">₦{listing.price.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {(listing as any).view_count > 0 && (
                                                    <span className="text-[9px] text-zinc-900/20 dark:text-white/20 font-bold">{(listing as any).view_count} views</span>
                                                )}
                                                {listing.seller?.is_verified && (
                                                    <div className="h-8 w-8 rounded-full bg-[#FF6200]/10 flex items-center justify-center border border-[#FF6200]/20">
                                                        <ShieldCheck className="h-4 w-4 text-[#FF6200]" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


export default function ListingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#FF6200]" /></div>}>
            <ListingsContent />
        </Suspense>
    );
}

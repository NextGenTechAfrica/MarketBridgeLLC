'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import {
    Loader2, Search, MapPin, ShieldCheck, SlidersHorizontal,
    LayoutGrid, List, X, Sparkles, Filter, ChevronRight, ArrowUpDown
} from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { intelligentSearch, trackSearch, getSearchSuggestions } from '@/lib/ai-search';
import { ListingCard } from '@/components/listings/ListingCard';

const supabase = createClient();

const UNIVERSITIES = [
    "Baze University",
    "Nile University of Nigeria",
    "Veritas University",
    "University of Abuja",
    "Other Abuja Institution"
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
    view_count?: number;
    seller?: {
        id: string;
        display_name: string;
        is_verified: boolean;
        store_type?: 'physical' | 'online' | 'both';
        university?: string;
    };
}

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
    const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
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
        if (!initialLocation && user?.university && !campus) {
            setCampus(user.university);
        }
    }, [user, initialLocation, campus]);

    useEffect(() => {
        const alertMsg = searchParams?.get('alert');
        if (alertMsg === 'invalid_school_email') {
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

            try { await supabase.rpc('sync_sponsorship_expiry'); } catch { /* non-critical */ }

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

                await trackSearch({
                    userId: user?.id,
                    query: search,
                    resultsCount: results.length
                });
            } else {
                const buildQuery = (baseQuery: any) => {
                    let q = baseQuery.eq('status', 'active');
                    if (category && category !== 'All Categories') q = q.eq('category', category);
                    if (campus && campus !== 'Global' && campus !== '') q = q.eq('campus', campus);
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

                // Sponsored first
                const { data: sponsored } = await buildQuery(
                    supabase.from('listings').select(selectFields)
                        .eq('is_sponsored', true)
                        .gt('sponsored_until', new Date().toISOString())
                )
                    .order('sponsored_tier', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(8);

                // Regular listings
                const { data: regular, error: fetchError } = await buildQuery(
                    supabase.from('listings').select(selectFields)
                        .or('is_sponsored.eq.false,sponsored_until.lt.' + new Date().toISOString())
                )
                    .order('created_at', { ascending: false })
                    .limit(80);

                if (fetchError) throw fetchError;

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

    // Client-side sorting
    const sortedListings = useMemo(() => {
        const sorted = [...listings];
        if (sortBy === 'price_asc') {
            return sorted.sort((a, b) => a.price - b.price);
        }
        if (sortBy === 'price_desc') {
            return sorted.sort((a, b) => b.price - a.price);
        }
        return sorted; // default order from database (sponsored then newest)
    }, [listings, sortBy]);

    const activeFilterCount = (category !== 'All Categories' ? 1 : 0) +
        (campus ? 1 : 0) +
        (condition !== 'all' ? 1 : 0) +
        (minPrice || maxPrice ? 1 : 0);

    const clearAllFilters = () => {
        setSearch('');
        setCategory('All Categories');
        setCampus('');
        setMinPrice('');
        setMaxPrice('');
        setCondition('all');
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col pt-16 md:pt-20 pb-20">
            {/* Top Search & Filter Banner */}
            <div className="bg-card border-b border-border py-6 px-4 sm:px-6">
                <div className="container max-w-7xl mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketplace</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                Explore <span className="text-[#FF6200]">Listings</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Discover products and services from verified students and merchants.
                            </p>
                        </div>

                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search by keyword, product name, brand..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-background border border-border pl-10 pr-24 h-11 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200] transition-all"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-4 bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-lg"
                                >
                                    Search
                                </Button>
                            </div>

                            {/* Search Suggestions */}
                            {suggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
                                    {suggestions.map((sug, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setSearch(sug);
                                                setSuggestions([]);
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-muted text-xs font-medium text-foreground transition-colors border-b border-border/50 last:border-none flex items-center justify-between"
                                        >
                                            <span>{sug}</span>
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Quick Filters Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Mobile Filters Toggle Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="lg:hidden h-9 px-3 gap-1.5 text-xs font-medium rounded-lg"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5 text-[#FF6200]" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <Badge className="ml-1 bg-[#FF6200] text-white text-[10px] h-4 min-w-[16px] px-1">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>

                            {/* Campus Selector */}
                            <select
                                title="Filter by Campus"
                                aria-label="Filter by Campus"
                                value={campus}
                                onChange={(e) => setCampus(e.target.value)}
                                className="h-9 bg-background border border-border px-3 rounded-lg text-xs font-medium focus:outline-none focus:border-[#FF6200] cursor-pointer"
                            >
                                <option value="">All Locations / Campus</option>
                                {UNIVERSITIES.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                                <option value="Global">Everywhere</option>
                            </select>

                            {/* Condition Filter */}
                            <select
                                title="Filter by Condition"
                                aria-label="Filter by Condition"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                                className="h-9 bg-background border border-border px-3 rounded-lg text-xs font-medium focus:outline-none focus:border-[#FF6200] cursor-pointer"
                            >
                                <option value="all">All Conditions</option>
                                <option value="brand_new">Brand New</option>
                                <option value="like_new">Like New</option>
                                <option value="used_good">Used (Good)</option>
                                <option value="used_fair">Used (Fair)</option>
                            </select>

                            {activeFilterCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="text-xs text-muted-foreground hover:text-[#FF6200] font-medium flex items-center gap-1 px-2 py-1 transition-colors"
                                >
                                    <X className="h-3 w-3" /> Clear filters
                                </button>
                            )}
                        </div>

                        {/* Sort and View Mode */}
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex items-center gap-1.5">
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                <select
                                    title="Sort listings"
                                    aria-label="Sort listings"
                                    value={sortBy}
                                    onChange={(e: any) => setSortBy(e.target.value)}
                                    className="h-9 bg-background border border-border px-2.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[#FF6200] cursor-pointer"
                                >
                                    <option value="newest">Featured & Newest</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                </select>
                            </div>

                            <div className="hidden sm:flex items-center bg-muted p-0.5 rounded-lg border border-border">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-colors",
                                        viewMode === 'grid' ? "bg-card text-[#FF6200] shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Grid view"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-colors",
                                        viewMode === 'list' ? "bg-card text-[#FF6200] shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="List view"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Desktop Left Sidebar: Categories */}
                    <aside className="hidden lg:block lg:col-span-3 space-y-6">
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <h2 className="text-sm font-bold text-foreground">Categories</h2>
                                {category !== 'All Categories' && (
                                    <button
                                        onClick={() => setCategory('All Categories')}
                                        className="text-[11px] font-semibold text-[#FF6200] hover:underline"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => setCategory('All Categories')}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                                        category === 'All Categories'
                                            ? "bg-[#FF6200] text-white font-bold shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <span>All Categories</span>
                                    <span className="text-[11px] opacity-80">{listings.length}</span>
                                </button>

                                {CATEGORIES.map((cat) => {
                                    const IconComponent = cat.icon;
                                    const isSelected = category.toLowerCase() === cat.name.toLowerCase();

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setCategory(cat.name)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                                                isSelected
                                                    ? "bg-[#FF6200] text-white font-bold shadow-sm"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <IconComponent className={cn("h-4 w-4", isSelected ? "text-white" : cat.color)} />
                                                <span>{cat.name}</span>
                                            </div>
                                            <ChevronRight className={cn("h-3.5 w-3.5 opacity-60", isSelected ? "text-white" : "")} />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Price Range Filter Widget */}
                            <div className="pt-4 border-t border-border space-y-3">
                                <h3 className="text-xs font-bold text-foreground">Price Range (₦)</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[#FF6200]"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[#FF6200]"
                                    />
                                </div>
                                <Button
                                    onClick={() => fetchListings()}
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-8 text-xs font-semibold rounded-lg hover:border-[#FF6200] hover:text-[#FF6200]"
                                >
                                    Apply Price Filter
                                </Button>
                            </div>
                        </div>

                        {/* Buyer Protection / Trust Widget */}
                        <div className="bg-[#FF6200]/5 border border-[#FF6200]/20 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-[#FF6200]">
                                <ShieldCheck className="h-5 w-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Buyer Protection</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Payments are held securely in escrow until you inspect and confirm your order.
                            </p>
                        </div>
                    </aside>

                    {/* Mobile Filters Drawer Modal */}
                    {showMobileFilters && (
                        <div className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm flex justify-end">
                            <div className="w-full max-w-xs bg-card h-full p-6 space-y-6 overflow-y-auto">
                                <div className="flex items-center justify-between pb-4 border-b border-border">
                                    <h2 className="font-bold text-foreground">Filters</h2>
                                    <button onClick={() => setShowMobileFilters(false)}>
                                        <X className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-foreground">Categories</h3>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => { setCategory('All Categories'); setShowMobileFilters(false); }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg text-xs font-medium",
                                                category === 'All Categories' ? "bg-[#FF6200] text-white" : "hover:bg-muted"
                                            )}
                                        >
                                            All Categories
                                        </button>
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => { setCategory(cat.name); setShowMobileFilters(false); }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-lg text-xs font-medium",
                                                    category.toLowerCase() === cat.name.toLowerCase() ? "bg-[#FF6200] text-white" : "hover:bg-muted"
                                                )}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <Button
                                        onClick={() => { fetchListings(); setShowMobileFilters(false); }}
                                        className="w-full bg-[#FF6200] hover:bg-[#FF7A29] text-white"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Listings Display Area */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Results Header Status */}
                        <div className="flex items-center justify-between">
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                                Showing <span className="font-bold text-foreground">{sortedListings.length} items</span>
                                {category !== 'All Categories' && <span> in <strong className="text-[#FF6200]">{category}</strong></span>}
                            </p>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                                        <Skeleton className="h-44 w-full rounded-xl bg-muted" />
                                        <Skeleton className="h-4 w-3/4 bg-muted" />
                                        <Skeleton className="h-3 w-1/2 bg-muted" />
                                        <div className="flex justify-between pt-2 border-t border-border">
                                            <Skeleton className="h-5 w-20 bg-muted" />
                                            <Skeleton className="h-4 w-16 bg-muted" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl text-destructive text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* Unauthenticated State */}
                        {!loading && !error && !user && (
                            <div className="py-12 flex flex-col items-center gap-4 bg-card border border-border rounded-2xl p-8 text-center">
                                <EmptyState
                                    icon={<ShieldCheck className="w-12 h-12 text-[#FF6200]" />}
                                    title="Sign In to Browse Marketplace"
                                    description="Log in to view live listings, negotiate prices, and make secure transactions."
                                    actionLabel="Log In"
                                    onAction={() => router.push('/login?redirect=/marketplace')}
                                />
                                <Link href="/">
                                    <Button variant="ghost" size="sm" className="text-xs">
                                        ← Return to Homepage
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Zero Results State */}
                        {!loading && !error && user && sortedListings.length === 0 && (
                            <div className="bg-card border border-border rounded-2xl p-12 text-center">
                                <EmptyState
                                    icon={<Search className="w-12 h-12 text-[#FF6200]" />}
                                    title="No Listings Found"
                                    description="Try searching with different keywords or clearing your active filters."
                                    actionLabel="Clear All Filters"
                                    onAction={clearAllFilters}
                                />
                            </div>
                        )}

                        {/* Listings Grid / List */}
                        {!loading && !error && sortedListings.length > 0 && (
                            <div className={cn(
                                viewMode === 'grid'
                                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5"
                                    : "flex flex-col gap-4"
                            )}>
                                {sortedListings.map((listing) => (
                                    <ListingCard
                                        key={listing.id}
                                        listing={listing}
                                        variant={viewMode === 'grid' ? 'grid' : 'horizontal'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ListingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        }>
            <ListingsContent />
        </Suspense>
    );
}

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
    LayoutGrid, List, X, Sparkles, Filter, ChevronRight, ArrowUpDown,
    CheckCircle2, RotateCcw, Truck, Store
} from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { intelligentSearch, trackSearch, getSearchSuggestions } from '@/lib/ai-search';
import { ListingCard } from '@/components/listings/ListingCard';

const supabase = createClient();

const UNIVERSITIES = [
    { id: 'all', name: 'All Campuses', short: 'All' },
    { id: 'baze', name: 'Baze University', short: 'Baze' },
    { id: 'nile', name: 'Nile University of Nigeria', short: 'Nile' },
    { id: 'veritas', name: 'Veritas University', short: 'Veritas' },
    { id: 'uniabuja', name: 'University of Abuja', short: 'UniAbuja' },
];

const CONDITIONS = [
    { id: 'all', label: 'All Conditions' },
    { id: 'brand_new', label: 'Brand New' },
    { id: 'like_new', label: 'Like New' },
    { id: 'good', label: 'Good' },
    { id: 'fair', label: 'Fair' },
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

        // Real-time subscription for active listings
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
                () => {
                    fetchListings();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [category, condition, campus, search]);

    const fetchListings = async () => {
        setLoading(true);
        setError('');

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
                    limit: 60
                });

                resultData = results as Listing[];

                if (user?.id) {
                    await trackSearch({
                        userId: user.id,
                        query: search,
                        resultsCount: results.length
                    }).catch(() => null);
                }
            } else {
                const buildQuery = (baseQuery: any) => {
                    let q = baseQuery.eq('status', 'active');
                    if (category && category !== 'All Categories') q = q.eq('category', category);
                    if (campus && campus !== 'Global' && campus !== '' && campus !== 'all') {
                        q = q.ilike('location', `%${campus}%`);
                    }
                    if (minPrice) q = q.gte('price', parseInt(minPrice));
                    if (maxPrice) q = q.lte('price', parseInt(maxPrice));
                    if (condition !== 'all') q = q.eq('condition', condition);
                    return q;
                };

                const selectFields = `
                    *,
                    seller:users!listings_dealer_id_fkey(
                        id,
                        display_name,
                        is_verified,
                        store_type,
                        university
                    )
                `;

                // Try query with seller relation
                try {
                    const { data, error: fetchError } = await buildQuery(
                        supabase.from('listings').select(selectFields)
                    )
                        .order('created_at', { ascending: false })
                        .limit(80);

                    if (fetchError) throw fetchError;
                    resultData = (data as Listing[]) || [];
                } catch (relationErr) {
                    console.warn('Listing relation query failed, falling back to basic query:', relationErr);
                    const { data: basicData, error: basicErr } = await buildQuery(
                        supabase.from('listings').select('*')
                    )
                        .order('created_at', { ascending: false })
                        .limit(80);

                    if (basicErr) throw basicErr;
                    resultData = (basicData as Listing[]) || [];
                }
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
        return sorted;
    }, [listings, sortBy]);

    const activeFilterCount = (category !== 'All Categories' ? 1 : 0) +
        (campus && campus !== 'all' ? 1 : 0) +
        (condition !== 'all' ? 1 : 0) +
        (minPrice || maxPrice ? 1 : 0);

    const clearAllFilters = () => {
        setSearch('');
        setCategory('All Categories');
        setCampus('');
        setMinPrice('');
        setMaxPrice('');
        setCondition('all');
        fetchListings();
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
            {/* ─── Top Category Ribbon & Search Header ─── */}
            <div className="bg-card border-b border-border py-6 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider text-[#FF6200]">Campus Marketplace</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-heading">
                                Browse <span className="text-[#FF6200]">Verified Deals</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                Trade safely with classmates across Abuja universities with zero-fraud escrow protection.
                            </p>
                        </div>

                        {/* Search Input Bar */}
                        <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search textbooks, laptops, food, hostellers..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-background border border-border pl-10 pr-24 h-12 rounded-2xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#FF6200] focus:ring-2 focus:ring-[#FF6200]/20 transition-all shadow-sm"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 bg-[#FF6200] hover:bg-[#E55800] text-white font-bold text-xs rounded-xl shadow-sm"
                                >
                                    Search
                                </Button>
                            </div>

                            {/* Suggestions Dropdown */}
                            {suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-xl z-50 p-2 space-y-1">
                                    {suggestions.map((sug, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => { setSearch(sug); fetchListings(); setSuggestions([]); }}
                                            className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors font-medium"
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Campus Quick Pills Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                        {UNIVERSITIES.map((uni) => (
                            <button
                                key={uni.id}
                                type="button"
                                onClick={() => setCampus(uni.id === 'all' ? '' : uni.short)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                                    (uni.id === 'all' && !campus) || campus === uni.short
                                        ? "bg-[#FF6200] text-white shadow-sm shadow-[#FF6200]/30"
                                        : "bg-zinc-100 dark:bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:border-[#FF6200]/40"
                                )}
                            >
                                <MapPin className="h-3 w-3" />
                                <span>{uni.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Main Content Grid: Filters Sidebar + Listings ─── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ──── Desktop Filters Sidebar (Left ~25%) ──── */}
                    <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24">
                        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="h-4 w-4 text-[#FF6200]" />
                                    <span className="font-bold text-sm text-foreground">Filters</span>
                                    {activeFilterCount > 0 && (
                                        <Badge className="bg-[#FF6200] text-white text-[10px] h-5 w-5 rounded-full p-0 flex items-center justify-center">
                                            {activeFilterCount}
                                        </Badge>
                                    )}
                                </div>
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearAllFilters}
                                        className="text-xs text-[#FF6200] hover:underline font-semibold cursor-pointer"
                                    >
                                        Reset All
                                    </button>
                                )}
                            </div>

                            {/* Categories Filter */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</h3>
                                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                                    <button
                                        type="button"
                                        onClick={() => setCategory('All Categories')}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer",
                                            category === 'All Categories'
                                                ? "bg-[#FF6200] text-white"
                                                : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-foreground"
                                        )}
                                    >
                                        <span>All Categories</span>
                                    </button>
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.name)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer",
                                                category.toLowerCase() === cat.name.toLowerCase()
                                                    ? "bg-[#FF6200] text-white"
                                                    : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <cat.icon className="h-3.5 w-3.5" />
                                                <span>{cat.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Condition Filter */}
                            <div className="space-y-2 pt-3 border-t border-border">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition</h3>
                                <div className="space-y-1">
                                    {CONDITIONS.map((cond) => (
                                        <button
                                            key={cond.id}
                                            type="button"
                                            onClick={() => setCondition(cond.id)}
                                            className={cn(
                                                "w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                                                condition === cond.id
                                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                                    : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-foreground"
                                            )}
                                        >
                                            {cond.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range Filter */}
                            <div className="space-y-3 pt-3 border-t border-border">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price Range (₦)</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        className="h-9 px-3 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#FF6200]"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        className="h-9 px-3 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#FF6200]"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => fetchListings()}
                                    size="sm"
                                    className="w-full h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl"
                                >
                                    Apply Price
                                </Button>
                            </div>
                        </div>

                        {/* Escrow Guarantee Banner in Sidebar */}
                        <div className="p-4 rounded-3xl bg-orange-500/5 dark:bg-orange-500/10 border border-[#FF6200]/20 space-y-2">
                            <div className="flex items-center gap-2 text-[#FF6200] font-bold text-xs">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Zero-Fraud Escrow Guarantee</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Never pay upfront to strangers. Funds remain in escrow until you verify items on campus.
                            </p>
                        </div>
                    </aside>

                    {/* ──── Listings Results Area (Right ~75%) ──── */}
                    <div className="lg:col-span-9 space-y-6">

                        {/* Controls Header (Results count, sorting, view mode, mobile filters button) */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMobileFilters(true)}
                                    className="lg:hidden rounded-xl text-xs font-bold gap-1.5"
                                >
                                    <Filter className="h-3.5 w-3.5 text-[#FF6200]" />
                                    <span>Filters</span>
                                    {activeFilterCount > 0 && <span className="text-[#FF6200]">({activeFilterCount})</span>}
                                </Button>

                                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                                    Showing <strong className="text-foreground">{sortedListings.length}</strong> listings
                                    {category !== 'All Categories' && <span> in <strong className="text-[#FF6200]">{category}</strong></span>}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                                {/* Sorting Select */}
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground hidden sm:inline">Sort:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e: any) => setSortBy(e.target.value)}
                                        className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-semibold focus:outline-none focus:border-[#FF6200]"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="price_asc">Price: Low to High</option>
                                        <option value="price_desc">Price: High to Low</option>
                                    </select>
                                </div>

                                {/* View Mode Toggles */}
                                <div className="flex items-center border border-border rounded-xl p-0.5 bg-background">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        className={cn(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            viewMode === 'grid' ? "bg-zinc-200 dark:bg-zinc-800 text-foreground" : "text-muted-foreground"
                                        )}
                                        title="Grid View"
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        className={cn(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            viewMode === 'list' ? "bg-zinc-200 dark:bg-zinc-800 text-foreground" : "text-muted-foreground"
                                        )}
                                        title="List View"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                                        <Skeleton className="h-44 w-full rounded-xl" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-5 w-1/2" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* Zero Results */}
                        {!loading && !error && sortedListings.length === 0 && (
                            <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto">
                                <Store className="h-12 w-12 text-[#FF6200] mx-auto opacity-30" />
                                <h3 className="text-lg font-bold text-foreground">No Listings Found</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    No items match your active filters. Try searching with different terms or reset your filters.
                                </p>
                                <Button
                                    onClick={clearAllFilters}
                                    variant="outline"
                                    className="rounded-xl border-[#FF6200] text-[#FF6200] hover:bg-[#FF6200]/10 text-xs font-bold"
                                >
                                    Reset Filters
                                </Button>
                            </div>
                        )}

                        {/* Listings Cards Grid / List */}
                        {!loading && !error && sortedListings.length > 0 && (
                            <div className={cn(
                                viewMode === 'grid'
                                    ? "grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6"
                                    : "flex flex-col gap-4"
                            )}>
                                {sortedListings.map((item) => (
                                    <ListingCard
                                        key={item.id}
                                        listing={item}
                                        variant={viewMode === 'grid' ? 'grid' : 'horizontal'}
                                    />
                                ))}
                            </div>
                        )}

                    </div>

                </div>
            </div>

            {/* ──── Mobile Filters Modal ──── */}
            {showMobileFilters && (
                <div className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm flex justify-end">
                    <div className="w-full max-w-xs bg-card h-full p-6 space-y-6 overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <h2 className="font-bold text-foreground text-sm">Filters</h2>
                            <button onClick={() => setShowMobileFilters(false)}>
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</h3>
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                                <button
                                    onClick={() => { setCategory('All Categories'); setShowMobileFilters(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold",
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
                                            "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold",
                                            category.toLowerCase() === cat.name.toLowerCase() ? "bg-[#FF6200] text-white" : "hover:bg-muted"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border space-y-2">
                            <Button
                                onClick={() => { fetchListings(); setShowMobileFilters(false); }}
                                className="w-full bg-[#FF6200] hover:bg-[#E55800] text-white font-bold rounded-xl text-xs"
                            >
                                Apply Filters
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => { clearAllFilters(); setShowMobileFilters(false); }}
                                className="w-full rounded-xl text-xs"
                            >
                                Reset All
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MarketplacePage() {
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

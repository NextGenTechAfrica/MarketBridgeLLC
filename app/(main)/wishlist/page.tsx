'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, MapPin, Trash2, ArrowLeft, ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';

export default function WishlistPage() {
    const { user, loading, refreshUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [wishlistItems, setWishlistItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?redirect=/wishlist');
            return;
        }

        const fetchWishlistItems = async () => {
            if (!user?.wishlist || user.wishlist.length === 0) {
                setWishlistItems([]);
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('listings')
                    .select('*, seller:users!listings_seller_id_fkey(display_name, is_verified)')
                    .in('id', user.wishlist);

                if (error) throw error;
                setWishlistItems(data || []);
            } catch (error) {
                console.error('Failed to fetch wishlist items', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchWishlistItems();
        }
    }, [user, loading, router]);

    const handleRemove = async (listingId: string) => {
        if (!user) return;

        try {
            const newWishlist = (user.wishlist || []).filter(id => id !== listingId);

            const { error } = await supabase
                .from('users')
                .update({ wishlist: newWishlist })
                .eq('id', user.id);

            if (error) throw error;

            setWishlistItems(prev => prev.filter(item => item.id !== listingId));
            await refreshUser();
            toast('Item removed from wishlist', 'info');
        } catch (error) {
            console.error('Failed to remove from wishlist', error);
            toast('Failed to remove item', 'error');
        }
    };

    if (loading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pt-16 md:pt-20 pb-24">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-2 rounded-full bg-[#FF6200] animate-pulse" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved Items</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            My Wishlist
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {wishlistItems.length} saved {wishlistItems.length === 1 ? 'item' : 'items'} in your wishlist.
                        </p>
                    </div>

                    <Link href="/buyer/dashboard">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs">
                            <ArrowLeft className="mr-2 h-3 w-3" /> Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Empty State */}
                {wishlistItems.length === 0 ? (
                    <div className="bg-card border border-border rounded-3xl p-12 sm:p-16 text-center space-y-4 shadow-sm max-w-xl mx-auto">
                        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                            <Heart className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Your Wishlist is Empty</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                            Save products you love while browsing the marketplace to track prices and buy later.
                        </p>
                        <Link href="/marketplace">
                            <Button className="bg-[#FF6200] hover:bg-[#FF7A29] text-white font-semibold text-xs rounded-xl mt-2">
                                Explore Marketplace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    /* Wishlist Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {wishlistItems.map((item) => (
                            <div
                                key={item.id}
                                className="group relative bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                            >
                                {/* Remove button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleRemove(item.id);
                                    }}
                                    className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-red-500 hover:text-white text-muted-foreground flex items-center justify-center transition-colors shadow-sm"
                                    title="Remove from wishlist"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>

                                <Link href={`/listings/${item.id}`} className="block">
                                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                                        {item.images?.[0] ? (
                                            <Image
                                                src={item.images[0]}
                                                alt={item.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <Store className="h-10 w-10 opacity-30" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span className="font-semibold uppercase text-[#FF6200]">
                                                {item.category || 'General'}
                                            </span>
                                            <span className="flex items-center gap-1 truncate max-w-[100px]">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                {item.location || 'Campus'}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-[#FF6200] transition-colors">
                                            {item.title}
                                        </h3>

                                        <div className="pt-2 border-t border-border flex items-center justify-between">
                                            <span className="text-base font-extrabold text-[#FF6200]">
                                                ₦{item.price.toLocaleString()}
                                            </span>
                                            <span className="text-xs font-semibold text-muted-foreground group-hover:text-[#FF6200] flex items-center gap-1">
                                                View <ArrowRight className="h-3 w-3" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

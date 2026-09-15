'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, MapPin, Sparkles, Store, CheckCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SponsoredBadge } from './SponsoredBadge';

export interface ListingCardProps {
    listing: {
        id: string;
        seller_id?: string;
        title: string;
        description?: string;
        price: number;
        category?: string;
        images?: string[];
        location?: string | null;
        created_at?: string;
        condition?: string;
        campus?: string;
        is_verified_listing?: boolean;
        verification_status?: string;
        is_sponsored?: boolean;
        view_count?: number;
        seller?: {
            id?: string;
            display_name?: string;
            is_verified?: boolean;
            store_type?: string;
            university?: string;
            photo_url?: string;
        };
    };
    variant?: 'grid' | 'compact' | 'horizontal';
    className?: string;
}

export function ListingCard({ listing, variant = 'grid', className }: ListingCardProps) {
    const imageUrl = listing.images && listing.images.length > 0 ? listing.images[0] : null;
    const sellerName = listing.seller?.display_name || 'Verified Seller';
    const isVerified = listing.seller?.is_verified || listing.is_verified_listing || listing.verification_status === 'verified';
    const location = listing.location || listing.campus || 'Nigeria';

    if (variant === 'horizontal') {
        return (
            <Link
                href={`/listings/${listing.id}`}
                className={cn(
                    "group flex flex-col sm:flex-row bg-card border border-border hover:border-[#FF6200]/40 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md",
                    listing.is_sponsored && "border-[#FF6200]/30",
                    className
                )}
            >
                <div className="relative h-48 sm:h-auto sm:w-56 shrink-0 bg-muted overflow-hidden">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={listing.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Store className="h-10 w-10 opacity-30" />
                        </div>
                    )}
                    {listing.is_sponsored && (
                        <div className="absolute top-3 left-3 z-10">
                            <SponsoredBadge />
                        </div>
                    )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            {listing.category && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6200] bg-[#FF6200]/10 px-2 py-0.5 rounded">
                                    {listing.category}
                                </span>
                            )}
                            {listing.condition && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">
                                    {listing.condition}
                                </span>
                            )}
                        </div>

                        <h3 className="font-semibold text-foreground text-base group-hover:text-[#FF6200] transition-colors line-clamp-2">
                            {listing.title}
                        </h3>

                        {listing.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {listing.description}
                            </p>
                        )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-border flex items-center justify-between">
                        <div>
                            <span className="text-xs text-muted-foreground block font-medium">Price</span>
                            <span className="text-lg font-bold text-[#FF6200]">
                                ₦{listing.price.toLocaleString()}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">{location}</span>
                            {isVerified && (
                                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" title="Verified Seller" />
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={`/listings/${listing.id}`}
            className={cn(
                "group flex flex-col bg-card border border-border hover:border-[#FF6200]/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5",
                listing.is_sponsored && "border-[#FF6200]/30 shadow-[#FF6200]/5",
                className
            )}
        >
            {/* Image Container */}
            <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={listing.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Store className="h-12 w-12 opacity-30" />
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div>
                        {listing.is_sponsored ? (
                            <SponsoredBadge />
                        ) : listing.condition ? (
                            <span className="text-[10px] font-semibold bg-background/90 backdrop-blur-sm text-foreground px-2.5 py-1 rounded-full shadow-sm capitalize border border-border/50">
                                {listing.condition}
                            </span>
                        ) : null}
                    </div>

                    {isVerified && (
                        <div className="flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            <CheckCircle className="h-3 w-3" />
                            <span>Verified</span>
                        </div>
                    )}
                </div>

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3">
                    <div className="h-8 w-8 rounded-full bg-[#FF6200] text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <ArrowUpRight className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold uppercase tracking-wider text-[#FF6200]">
                            {listing.category || 'General'}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {location}
                        </span>
                    </div>

                    <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-[#FF6200] transition-colors">
                        {listing.title}
                    </h3>
                </div>

                {/* Price & Seller Info */}
                <div className="pt-2.5 border-t border-border flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-medium">Price</span>
                        <span className="text-base font-extrabold text-[#FF6200]">
                            ₦{listing.price.toLocaleString()}
                        </span>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block truncate max-w-[100px]">
                            {sellerName}
                        </span>
                        {listing.campus && (
                            <span className="text-[9px] text-muted-foreground/80 block truncate max-w-[100px]">
                                {listing.campus}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

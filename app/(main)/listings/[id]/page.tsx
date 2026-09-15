import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';

const ListingDetailContent = dynamic(
    () => import('@/components/listings/ListingDetailContent'),
    { ssr: false }
);

interface PageProps {
    params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const supabase = await createClient();
        const { data: listing } = await supabase
            .from('listings')
            .select('title, description, price, images')
            .eq('id', params.id)
            .single();

        if (!listing) {
            return {
                title: 'Listing Not Found | MarketBridge',
            };
        }

        const title = `${listing.title} - ₦${listing.price.toLocaleString()} | MarketBridge`;
        const description = listing.description?.slice(0, 155) || 'Buy and sell securely on MarketBridge marketplace.';
        const imageUrl = listing.images?.[0] || 'https://marketbridgellc.vercel.app/icon.png';

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: [{ url: imageUrl }],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [imageUrl],
            },
        };
    } catch (e) {
        console.error('Metadata generation failed:', e);
        return {
            title: 'MarketBridge Listing',
        };
    }
}

export default async function ListingDetailPage({ params }: PageProps) {
    let jsonLd = null;
    try {
        const supabase = await createClient();
        const { data: listing } = await supabase
            .from('listings')
            .select('*')
            .eq('id', params.id)
            .single();

        if (listing) {
            jsonLd = {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: listing.title,
                image: listing.images || [],
                description: listing.description,
                offers: {
                    '@type': 'Offer',
                    price: listing.price,
                    priceCurrency: 'NGN',
                    availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                },
            };
        }
    } catch (e) {
        console.error('Failed to load JSON-LD data:', e);
    }

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <Suspense fallback={
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#FF6200]" />
                </div>
            }>
                <ListingDetailContent />
            </Suspense>
        </>
    );
}

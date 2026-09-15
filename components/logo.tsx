'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    showTagline?: boolean;
    variant?: 'default' | 'sidebar' | 'footer';
}

export const Logo: React.FC<LogoProps> = ({
    className = '',
    size = 'md',
    variant = 'default',
}) => {
    const textSizeClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl',
        xl: 'text-4xl',
    };

    const isDark = variant === 'sidebar' || variant === 'footer';

    return (
        <Link
            href="/"
            className={`inline-flex items-center transition-transform active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6200] rounded-lg ${className}`}
            aria-label="MarketBridge Home"
        >
            <span className={`${textSizeClasses[size]} font-black tracking-tight leading-none select-none`}>
                <span className={isDark ? 'text-white' : 'text-slate-900 dark:text-white'}>Market</span>
                <span className="text-[#FF6200]">Bridge</span>
            </span>
        </Link>
    );
};
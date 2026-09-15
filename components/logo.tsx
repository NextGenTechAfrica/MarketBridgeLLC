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
    showText = true,
    showTagline = true,
    variant = 'default',
}) => {
    const textSizeClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-3xl',
    };

    const iconSizeClasses = {
        sm: 'w-7 h-7',
        md: 'w-8 h-8',
        lg: 'w-9 h-9',
        xl: 'w-10 h-10',
    };

    const isDarkBackground = variant === 'sidebar' || variant === 'footer';

    return (
        <Link
            href="/"
            className={`inline-flex items-center gap-2.5 transition-transform active:scale-95 group ${className}`}
        >
            {/* MarketBridge Circular Icon */}
            <div className={`${iconSizeClasses[size]} rounded-full bg-[#FF5500] flex items-center justify-center shrink-0 shadow-sm shadow-[#FF5500]/30`}>
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V6s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
            </div>

            {showText && (
                <div className="flex flex-col justify-center">
                    <span className={`${textSizeClasses[size]} font-black tracking-tight leading-none`}>
                        <span className={isDarkBackground ? 'text-white' : 'text-slate-900 dark:text-white'}>Market</span>
                        <span className="text-[#FF5500]">Bridge</span>
                    </span>
                    {showTagline && size !== 'sm' && (
                        <span className={`text-[8px] font-semibold tracking-wider uppercase mt-0.5 ${
                            isDarkBackground ? 'text-white/40' : 'text-slate-400 dark:text-slate-400'
                        }`}>
                            Campus • Community • You
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
};
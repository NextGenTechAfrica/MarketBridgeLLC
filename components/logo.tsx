'use client';

import React from 'react';
import Link from 'next/link';
import { useSystem } from '@/contexts/SystemContext'

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    variant?: 'default' | 'sidebar' | 'footer';
}

export const Logo: React.FC<LogoProps> = ({
    className = '',
    size = 'md',
    showText = true,
    variant = 'default',
}) => {
    const { isDemoMode } = useSystem()

    const textSizeClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-4xl',
    };

    return (
        <Link
            href="/"
            className={`flex items-center gap-2 transition-transform active:scale-95 ${className}`}
        >
            <div className="flex flex-col">
                <span className={`${textSizeClasses[size]} font-black tracking-tight leading-none`}>
                    <span className={variant === 'sidebar' ? 'text-white' : 'text-foreground'}>Market</span>
                    <span className="text-[#FF6200]">Bridge</span>
                </span>
            </div>
        </Link>
    );
};
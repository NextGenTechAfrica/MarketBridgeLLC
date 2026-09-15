import React from 'react';
import Link from 'next/link';
import { Facebook, Twitter, Instagram } from 'lucide-react';
import { Logo } from '@/components/logo';

export const Footer = () => {
    return (
        <footer className="bg-[#0A1628] text-white pt-16 pb-28 md:pb-10 z-50 relative">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">

                    {/* Column 1: Brand */}
                    <div className="space-y-5">
                        <Logo variant="sidebar" size="md" />
                        <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                            A trusted marketplace connecting verified sellers and buyers with secure transactions and fast support.
                        </p>
                        <div className="flex space-x-3 pt-2">
                            {[
                                { Icon: Instagram, href: "https://instagram.com/marketbridge.ng", label: "Instagram" },
                                { Icon: Twitter, href: "https://x.com/marketbridgeng", label: "X" },
                                { Icon: Facebook, href: "https://facebook.com/marketbridgeng", label: "Facebook" }
                            ].map((social, i) => (
                                <Link key={i} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} className="h-9 w-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/40 hover:text-[#FF6200] hover:border-[#FF6200]/30 hover:bg-[#FF6200]/5 transition-all">
                                    <social.Icon className="h-4 w-4" />
                                </Link>
                            ))}
                            <Link href="https://tiktok.com/@marketbridge.ng" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="h-9 w-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/40 hover:text-[#FF6200] hover:border-[#FF6200]/30 hover:bg-[#FF6200]/5 transition-all">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.42-.37-.24-.71-.53-1.02-.85v7.39c.01 2.44-.85 4.87-2.5 6.63-1.89 2.05-4.82 3.1-7.59 2.72-2.73-.37-5.18-2.22-6.28-4.78-1.28-2.91-.65-6.66 1.54-8.87 1.9-1.95 4.86-2.67 7.42-1.86v4.14c-1.39-.51-3.01-.26-4.14.74-.9.78-1.26 2.04-.98 3.2.27 1.12 1.2 2.02 2.34 2.25.96.2 2 .02 2.8-.52.88-.58 1.39-1.6 1.39-2.65V.02z" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Column 2: Platform */}
                    <div>
                        <h3 className="text-white font-semibold text-sm mb-5">Platform</h3>
                        <ul className="space-y-3 text-white/50 text-sm">
                            <li><Link href="/marketplace" className="hover:text-white transition-colors">Browse Listings</Link></li>
                            <li><Link href="/sellers" className="hover:text-white transition-colors">Verified Sellers</Link></li>
                            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/faq" className="hover:text-white transition-colors">How It Works</Link></li>
                            <li><Link href="/seller-onboarding" className="hover:text-white transition-colors">Sell on MarketBridge</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Legal */}
                    <div>
                        <h3 className="text-white font-semibold text-sm mb-5">Legal</h3>
                        <ul className="space-y-3 text-white/50 text-sm">
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/refund" className="hover:text-white transition-colors">Refund & Cancellation</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Contact */}
                    <div>
                        <h3 className="text-white font-semibold text-sm mb-5">Contact</h3>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <a href="mailto:support@marketbridge.com.ng?subject=Tech%20Support" className="text-[#FF6200] hover:text-[#FF7A29] transition-colors">
                                    support@marketbridge.com.ng
                                </a>
                                <p className="text-white/30 text-xs mt-0.5">Tech Support</p>
                            </li>
                            <li>
                                <a href="mailto:ops-support@marketbridge.com.ng?subject=Ops%20Support" className="text-[#FF6200] hover:text-[#FF7A29] transition-colors">
                                    ops-support@marketbridge.com.ng
                                </a>
                                <p className="text-white/30 text-xs mt-0.5">Ops / Refunds / Account Help</p>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
                    <div className="flex flex-col gap-1.5 items-center md:items-start text-center md:text-left">
                        <p>&copy; {new Date().getFullYear()} MarketBridge. All rights reserved.</p>
                        <p className="text-white/25">A platform operated by NextGen Tech</p>
                    </div>
                    <div className="flex gap-6 items-center">
                        <span className="text-[#FF6200] flex items-center gap-2 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FF6200] animate-pulse" />
                            Systems Operational
                        </span>
                        <span className="text-white/30">v1.0.0</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

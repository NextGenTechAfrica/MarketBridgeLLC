'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const baseUrl = window.location.origin;
            const response = await fetch(`${baseUrl}/api/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            setSubmitted(true);
            setSuccessMessage(data.message || 'Thank you for your message! We will get back to you soon.');
            setFormData({ name: '', email: '', subject: '', message: '' });

            setTimeout(() => {
                setSubmitted(false);
                setSuccessMessage('');
            }, 8000);
        } catch (error: unknown) {
            console.error('Error sending message:', error);
            const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
            setSuccessMessage(`Error: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="container mx-auto px-4 py-16">
            <div className="max-w-5xl mx-auto">
                {/* Back to Home Button */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white/80 hover:text-white border border-white/10 transition-all active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4 text-[#FF6200]" /> Back to Home
                    </Link>
                </div>

                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">Get in Touch</h1>
                    <p className="text-xl text-muted-foreground">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Info Cards */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 bg-[#FF6200]/10 rounded-full flex items-center justify-center text-[#FF6200] flex-shrink-0">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1 text-white">Tech Support</h3>
                                        <p className="text-sm text-muted-foreground">support@marketbridge.com.ng</p>
                                        <p className="text-[10px] text-white/30 mt-1">App bugs, login issues, errors</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 bg-[#FF6200]/10 rounded-full flex items-center justify-center text-[#FF6200] flex-shrink-0">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1 text-white">Ops Support</h3>
                                        <p className="text-sm text-muted-foreground">ops-support@marketbridge.com.ng</p>
                                        <p className="text-[10px] text-white/30 mt-1">Refunds, payments, seller questions</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 bg-[#FF6200]/10 rounded-full flex items-center justify-center text-[#FF6200] flex-shrink-0">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1 text-white">Phone</h3>
                                        <p className="text-sm text-muted-foreground">+234 805 593 3107</p>
                                        <p className="text-sm text-muted-foreground">+234 913 994 6753</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 bg-[#FF6200]/10 rounded-full flex items-center justify-center text-[#FF6200] flex-shrink-0">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1 text-white">Headquarters</h3>
                                        <p className="text-sm text-muted-foreground">Abuja, Nigeria</p>
                                        <p className="text-[10px] text-[#FF6200] font-mono uppercase mt-1">Digital-First Operations</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Form */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-white">Send us a Message</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {submitted ? (
                                <div className="bg-[#FF6200]/10 border border-[#FF6200]/20 rounded-lg p-6 text-center animate-in fade-in duration-500">
                                    <p className="text-[#FF6200] font-bold text-lg mb-2">Message Dispatched!</p>
                                    <p className="text-sm text-muted-foreground">{successMessage}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-white">Name</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="Your name"
                                                className="bg-zinc-900 border-white/10 text-white focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-white">Email</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder="your.email@example.com"
                                                className="bg-zinc-900 border-white/10 text-white focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subject" className="text-white">Subject</Label>
                                        <Input
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            placeholder="How can we help?"
                                            className="bg-zinc-900 border-white/10 text-white focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message" className="text-white">Message</Label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows={6}
                                            className="flex w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6200] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                                            placeholder="Tell us more about your inquiry..."
                                        />
                                    </div>
                                    <Button type="submit" className="w-full bg-[#FF6200] text-black hover:bg-[#FF7A29] font-black uppercase tracking-widest h-12 border-none" disabled={isSubmitting}>
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

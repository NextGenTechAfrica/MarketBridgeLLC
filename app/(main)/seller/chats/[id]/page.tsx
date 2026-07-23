'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, ArrowLeft, ArrowRight, DollarSign, Package, Image as ImageIcon, Loader2, X, Check, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SmartEscrowModal } from '@/components/chat/SmartEscrowModal';
import { EscrowProgress, EscrowAgreement, EscrowStep } from '@/components/chat/EscrowProgress';
import { TermsBuilderPanel } from '@/components/chat/TermsBuilderPanel';
import { formatDistanceToNow } from 'date-fns';

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    image_url?: string | null;
    is_read: boolean;
    created_at: string;
    sender?: {
        display_name: string;
        photo_url: string | null;
    };
}

interface Conversation {
    id: string;
    participant1_id: string;
    participant2_id: string;
    listing_id: string | null;
    last_message: string | null;
    last_message_at: string | null;
    listing?: {
        id: string;
        title: string;
        price: number;
        floor_price?: number;
        location?: string;
        images: string[];
    };
    other_user?: {
        id: string;
        display_name: string;
        photo_url: string | null;
        role: string;
        avatar_url?: string;
    };
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [chat, setChat] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Realtime State
    const [isTyping, setIsTyping] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const chatChannelRef = useRef<any>(null);

    // Smart Escrow State
    const [showEscrowModal, setShowEscrowModal] = useState(false);
    const [escrowAmount, setEscrowAmount] = useState('');
    const [activeAgreement, setActiveAgreement] = useState<EscrowAgreement | null>(null);
    const [escrowSteps, setEscrowSteps] = useState<EscrowStep[]>([]);
    const [chatId, setChatId] = useState<string | null>(null);

    // Negotiation State
    const [currentOffer, setCurrentOffer] = useState<number>(0);
    const [showFloorWarning, setShowFloorWarning] = useState(false);
    const [aiReplySuggestion, setAiReplySuggestion] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockEndTime, setBlockEndTime] = useState<Date | null>(null);
    const [activeOrder, setActiveOrder] = useState<any>(null);

    // Unwrap params
    useEffect(() => {
        params.then(p => setChatId(p.id));
    }, [params]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user && chatId) {
            fetchChat();
            fetchMessages();
            fetchActiveEscrow();
            fetchActiveOrder();

            const unsubscribeMessages = subscribeToMessages();
            const unsubscribeEscrow = subscribeToEscrow();

            // Mark initial batch as read
            markMessagesAsRead();

            return () => {
                unsubscribeMessages();
                unsubscribeEscrow();
            };
        }
    }, [user, authLoading, chatId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchChat = async () => {
        if (!user || !chatId) return;

        try {
            const { data: chatData, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    listing:listings(id, title, price, floor_price, images)
                `)
                .eq('id', chatId)
                .single();

            if (error) throw error;

            // Verify Participant
            if (chatData.participant1_id !== user.id && chatData.participant2_id !== user.id) {
                console.warn('Unauthorized access to chat');
                router.push('/seller/chats');
                return;
            }

            // Identify Other User ID
            const otherUserId = chatData.participant1_id === user.id
                ? chatData.participant2_id
                : chatData.participant1_id;

            // Fetch Other User Details
            const { data: userData } = await supabase
                .from('users')
                .select('id, display_name, photo_url, role, avatar_url')
                .eq('id', otherUserId)
                .single();

            if (userData) {
                // Normalize photo_url vs avatar_url
                chatData.other_user = {
                    ...userData,
                    photo_url: userData.avatar_url || userData.photo_url
                };
            }

            setChat(chatData);
            if (chatData.listing && currentOffer === 0) {
                setCurrentOffer(chatData.listing.price || 0);
            }
        } catch (error) {
            console.error('Error fetching chat:', error);
            // router.push('/seller/chats'); // Optional redirect on error
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        if (!chatId) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:users!messages_sender_id_fkey(display_name, photo_url)
                `)
                .eq('conversation_id', chatId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchActiveOrder = async () => {
        if (!chatId || !chat?.listing_id) return;
        // Find order associated with this listing involving both users
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('listing_id', chat.listing_id)
            .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
            .neq('status', 'completed')
            .neq('status', 'cancelled')
            .limit(1)
            .maybeSingle();
            
        if (data) setActiveOrder(data);
    };

    const fetchActiveEscrow = async () => {
        if (!chatId) return;
        try {
            const { data: agreement, error } = await supabase
                .from('escrow_agreements')
                .select('*')
                .eq('conversation_id', chatId) // conversation_id
                .in('status', ['pending', 'active'])
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (agreement) {
                setActiveAgreement(agreement);
                const { data: steps } = await supabase
                    .from('escrow_steps')
                    .select('*')
                    .eq('agreement_id', agreement.id)
                    .order('step_order', { ascending: true });
                setEscrowSteps(steps || []);
            }
        } catch (error) {
            console.error('Error fetching escrow:', error);
        }
    };

    const subscribeToMessages = () => {
        if (!chatId || !user) return () => { };

        if (!chatChannelRef.current) {
            chatChannelRef.current = supabase.channel(`chat:${chatId}`, {
                config: {
                    presence: { key: user.id },
                    broadcast: { self: false, ack: false }
                }
            });

            // Presence
            chatChannelRef.current.on('presence', { event: 'sync' }, () => {
                const state = chatChannelRef.current.presenceState();
                const otherUsersOnline = Object.keys(state).some(key => key !== user.id);
                setIsOnline(otherUsersOnline);
            });

            // Broadcast (Typing)
            chatChannelRef.current.on('broadcast', { event: 'typing' }, (payload: any) => {
                if (payload.payload.user_id !== user.id) {
                    setIsTyping(payload.payload.isTyping);
                }
            });

            // Postgres Changes
            chatChannelRef.current.on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${chatId}`,
                },
                async (payload: any) => {
                    const { data: senderData } = await supabase
                        .from('users')
                        .select('display_name, photo_url, avatar_url')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const newMsg: Message = {
                        ...payload.new,
                        sender: senderData ? {
                            display_name: senderData.display_name,
                            photo_url: senderData.avatar_url || senderData.photo_url
                        } : undefined
                    } as Message;

                    setMessages((prev) => [...prev, newMsg]);

                    if (payload.new.sender_id !== user.id) {
                        markMessagesAsRead();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${chatId}`,
                },
                (payload: any) => {
                    setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, is_read: payload.new.is_read } : m));
                }
            );

            chatChannelRef.current.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await chatChannelRef.current.track({ is_online: true });
                }
            });
        }

        return () => {
            if (chatChannelRef.current) {
                supabase.removeChannel(chatChannelRef.current);
                chatChannelRef.current = null;
            }
        };
    };

    const subscribeToEscrow = () => {
        if (!chatId) return () => { };

        const subscription = supabase
            .channel(`escrow:${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'escrow_agreements',
                    filter: `conversation_id=eq.${chatId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        setActiveAgreement(payload.new as EscrowAgreement);
                        fetchActiveEscrow(); // Refresh steps/details full object
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'escrow_steps',
                    // Filter by agreement_id is harder without knowing ID upfront if it changes.
                    // Use broad filter? No, inefficient.
                    // Just listen to all steps? Also inefficient.
                    // Since steps belong to agreements which belong to this chat, 
                    // maybe we just refresh on any step change if we have an active agreement?
                },
                () => {
                    fetchActiveEscrow(); // Aggressive refresh
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    };

    const markMessagesAsRead = async () => {
        if (!user || !chatId) return;

        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', chatId)
            .neq('sender_id', user.id)
            .eq('is_read', false);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedImage) || !user || sending || !chatId) return;

        setSending(true);
        setUploadingImage(!!selectedImage);

        try {
            let imageUrl: string | null = null;

            if (selectedImage) {
                // Upload logic
                const fileExt = selectedImage.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                const filePath = `${chatId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('chat-images') // Ensure bucket exists!
                    .upload(filePath, selectedImage);

                if (!uploadError) {
                    const { data } = supabase.storage
                        .from('chat-images')
                        .getPublicUrl(filePath);
                    imageUrl = data.publicUrl;
                }
            }

            const { error } = await supabase.from('messages').insert({
                conversation_id: chatId,
                sender_id: user.id,
                content: newMessage.trim() || (imageUrl ? '📷 Image' : ''),
                image_url: imageUrl,
            });

            if (error) throw error;

            // Trigger update on conversation for last_message (done via DB trigger usually, but safe to keep)
            // My migration has a trigger: update_conversation_last_message()
            // So no need to manually update conversations table!

            setNewMessage('');
            setSelectedImage(null);
            setImagePreview(null);
            
            // Trigger AI Check
            runAIEngine(newMessage.trim());

        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
            setUploadingImage(false);
        }
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (chatChannelRef.current && user) {
            chatChannelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: user.id, isTyping: e.target.value.length > 0 }
            });
            
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                chatChannelRef.current.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { user_id: user.id, isTyping: false }
                });
            }, 3000);
        }
    };

    const runAIEngine = async (text: string) => {
        if (!text) return;
        const lowercaseMsg = text.toLowerCase();

        // 1. Malicious Detection
        const redFlags = ['transfer', 'pay outside', 'whatsapp', '070', '080', '090', '081', '091'];
        const hasRedFlag = redFlags.some(flag => lowercaseMsg.includes(flag));
        
        if (hasRedFlag) {
            setIsBlocked(true);
            const blockUntil = new Date(Date.now() + 30 * 60000); // 30 mins
            setBlockEndTime(blockUntil);
            
            // Inform UI
            toast('AI Alert: Malicious behavior detected. Chat paused for 30 minutes for review.', 'error');
            
            // Record Flag to Admin
            supabase.from('chat_flags').insert({
                conversation_id: chatId,
                flag_type: 'spam',
                severity: 'high',
                ai_summary: `AI detected restricted contact sharing or external payment request: "${text}"`,
            }).then();
            
            // Optionally auto-cancel active escrow
            if (activeAgreement) {
                supabase.from('escrow_agreements').update({ ai_flagged: true }).eq('id', activeAgreement.id).then();
            }
            return;
        }

        // 2. Intent Detection (Negotiation Helpers)
        if (lowercaseMsg.includes('how much') || lowercaseMsg.includes('last price')) {
            const floor = (chat?.listing as any)?.floor_price || chat?.listing?.price;
            setAiReplySuggestion(`Based on current market, ₦${(floor * 1.05).toLocaleString()} is fair — want me to send that?`);
        } else {
            setAiReplySuggestion(null);
        }
    };

    const handleOfferChange = (amount: number, isAbsolute: boolean = false) => {
        if (isBlocked) return;
        const newOffer = isAbsolute ? amount : Math.max(0, currentOffer + amount);
        setCurrentOffer(newOffer);
        
        // Floor Check
        const floor = (chat?.listing as any)?.floor_price || 0;
        if (floor > 0 && newOffer < floor) {
            setShowFloorWarning(true);
        } else {
            setShowFloorWarning(false);
        }
    };

    const handleCounter = () => {
        if (isBlocked) return;
        setNewMessage(`I propose a counter-offer of ₦${currentOffer.toLocaleString()}`);
        // Ensure textarea focuses or we can auto-send
    };

    const handleCreateEscrow = async (data: {
        amount: number;
        type: 'default' | 'custom';
        steps: string[];
        tosText: string;
        autoReleaseHours: number;
    }) => {
        if (!user || !chat || !chat.other_user || !chatId || !chat.listing_id) return;

        try {
            // 1. Create Stage 1 Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    buyer_id: user.id,
                    seller_id: chat.other_user.id,
                    listing_id: chat.listing_id,
                    amount: data.amount,
                    status: 'pending',
                    escrow_stage: 1, // Stage 1: Initiated
                    contract_terms: {
                        proposed_at: new Date().toISOString(),
                        last_proposed_by: user.id,
                        location: chat.listing?.location || 'Campus Gate'
                    }
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Identify and Link Escrow Stages/Agreements if needed
            // For now, the Order itself handles the 7 stages via 'escrow_stage' column.

            // 3. Send System Message
            await supabase.from('messages').insert({
                conversation_id: chatId,
                sender_id: user.id,
                content: `🔒 Smart Escrow Phase 1: Initiated for ₦${data.amount.toLocaleString()}.\nPlease use the Terms Builder above to finalize price and location.`,
            });

            setActiveOrder(order);
            fetchActiveOrder();
        } catch (error) {
            console.error('Error initiating escrow:', error);
            toast('Failed to initiate digital contract. Please try again.', 'error');
        }
    };

    // Image handling helpers
    const compressImage = async (file: File, maxSizeBytes: number = 2 * 1024 * 1024): Promise<File> => {
        // If already under limit, return as-is
        if (file.size <= maxSizeBytes) return file;

        return new Promise((resolve, reject) => {
            const img = new window.Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if very large
                const MAX_DIM = 1920;
                if (width > MAX_DIM || height > MAX_DIM) {
                    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas not supported')); return; }
                ctx.drawImage(img, 0, 0, width, height);

                // Try progressively lower quality
                let quality = 0.8;
                const tryCompress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) { reject(new Error('Compression failed')); return; }
                            if (blob.size <= maxSizeBytes || quality <= 0.3) {
                                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
                                    type: 'image/webp',
                                    lastModified: Date.now()
                                }));
                            } else {
                                quality -= 0.1;
                                tryCompress();
                            }
                        },
                        'image/webp',
                        quality
                    );
                };
                tryCompress();
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
            img.src = url;
        });
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Hard reject over 10MB raw (even before compression)
        if (file.size > 10 * 1024 * 1024) {
            toast('Image too large. Maximum raw size is 10MB.', 'error');
            return;
        }

        try {
            const compressed = await compressImage(file, 2 * 1024 * 1024);
            setSelectedImage(compressed);
            setImagePreview(URL.createObjectURL(compressed));

            if (compressed.size < file.size) {
                const saved = Math.round((1 - compressed.size / file.size) * 100);
                toast(`Image compressed (${saved}% smaller)`, 'success');
            }
        } catch (err) {
            // Fallback: use original if compression fails
            if (file.size <= 5 * 1024 * 1024) {
                setSelectedImage(file);
                setImagePreview(URL.createObjectURL(file));
            } else {
                toast('Image too large and compression failed. Try a smaller image.', 'error');
            }
        }
    }

    if (authLoading || loading) {
        return (
            <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-12 w-12 text-[#FF6600] mx-auto" />
                    <p className="mt-4 text-zinc-500 font-mono text-xs tracking-widest uppercase">Decrypting Stream...</p>
                </div>
            </div>
        );
    }

    if (!chat) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center text-zinc-500">Chat Not Found</div>
                <Button asChild className="mt-4"><Link href="/seller/chats">Return to Dashboard</Link></Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-8 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col">
            <Card className="flex-1 flex flex-col bg-[#FAFAFA]/50 border-zinc-200 backdrop-blur-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <CardHeader className="border-b border-zinc-100 bg-white py-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" asChild className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50">
                                <Link href="/seller/chats">
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                            </Button>
                            <Avatar className="h-10 w-10 border border-zinc-200">
                                <AvatarImage src={chat.other_user?.photo_url || ''} />
                                <AvatarFallback className="bg-zinc-200 text-zinc-500 font-black uppercase">
                                    {chat.other_user?.display_name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base text-zinc-900 font-bold tracking-wide flex items-center gap-2">
                                    {chat.other_user?.display_name}
                                    {isOnline && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Online now" />}
                                </CardTitle>
                                <Badge variant="secondary" className="mt-1 bg-white text-zinc-600 border border-zinc-100 text-[10px] uppercase tracking-wider">
                                    {chat.other_user?.role === 'seller' ? 'Verified Merchant' : 'Campus User'}
                                </Badge>
                            </div>
                        </div>
                        {chat.listing && !activeAgreement && (
                            <Button onClick={() => setShowEscrowModal(true)} className="gap-2 bg-[#FF6600] text-black font-black uppercase text-xs tracking-widest hover:bg-[#FF6600]/90 h-9">
                                <DollarSign className="h-4 w-4" />
                                <span className="hidden sm:inline">Secure Escrow</span>
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative border-t-0">
                    {/* Advanced Terms Builder Panel */}
                    {chat.listing && activeOrder && activeOrder.escrow_stage <= 2 && (
                        <div className="p-4 sm:p-6 bg-transparent shrink-0 z-10 sticky top-0">
                            <TermsBuilderPanel 
                                orderId={activeOrder.id}
                                buyerId={activeOrder.buyer_id}
                                sellerId={activeOrder.seller_id}
                                currentUserId={user?.id || ''}
                                listingPrice={chat.listing.price}
                                listingLocation={activeOrder.location || 'Baze University'}
                                onTransition={(stage) => setActiveOrder({ ...activeOrder, escrow_stage: stage })}
                            />
                        </div>
                    )}
                    
                    {/* Initial Initiation fallback if no order exists yet */}
                    {chat.listing && !activeOrder && (
                        <div className="bg-white border-b border-zinc-100 p-8 shrink-0 shadow-sm z-10 sticky top-0 text-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">Ready to secure this item?</h3>
                            <p className="text-xs text-zinc-500 mb-6 italic">Initiate the digital escrow contract to begin negotiating formal terms.</p>
                            <Button 
                                onClick={() => setShowEscrowModal(true)}
                                className="h-12 px-8 bg-[#FF6200] text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg border-0"
                            >
                                Initiate Escrow Contract <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* AI Suggestions Block */}
                    {aiReplySuggestion && !isBlocked && !activeAgreement && (
                        <div className="mx-4 mt-4 bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-purple-100 h-8 w-8 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-purple-600 text-lg">✨</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-purple-900 font-medium">{aiReplySuggestion}</p>
                                <div className="mt-2 flex gap-2">
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] uppercase font-bold text-purple-600 hover:bg-purple-100 px-2" onClick={() => {
                                        setNewMessage(aiReplySuggestion.replace(' — want me to send that?', ''));
                                        setAiReplySuggestion(null);
                                    }}>Use Suggestion</Button>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] uppercase font-bold text-zinc-400 hover:bg-white px-2" onClick={() => setAiReplySuggestion(null)}>Dismiss</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Block Block */}
                    {isBlocked && (
                        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <span className="shrink-0 text-red-500 text-xl">🛡️</span>
                            <div>
                                <p className="text-sm font-bold text-red-900 mb-1">Conversation Paused for Review</p>
                                <p className="text-xs text-red-800/80">Our AI has flagged this conversation. It is currently under review by our operations team. You cannot send messages until {blockEndTime?.toLocaleTimeString()}.</p>
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                        {/* Escrow Widget */}
                        {activeAgreement && (
                            <EscrowProgress
                                agreement={activeAgreement}
                                steps={escrowSteps}
                                onUpdate={fetchActiveEscrow}
                            />
                        )}

                        {/* Messages */}
                        {messages.map((message) => {
                            const isOwn = message.sender_id === user?.id;
                            return (
                                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-3 max-w-[80%] md:max-w-[60%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        {!isOwn && (
                                            <Avatar className="h-8 w-8 mt-1 border border-zinc-200 hidden sm:block">
                                                <AvatarImage src={message.sender?.photo_url || ''} />
                                                <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-500">
                                                    {message.sender?.display_name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                            <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${isOwn
                                                    ? 'bg-[#FF6600] text-black font-medium rounded-tr-none'
                                                    : 'bg-zinc-50 text-zinc-900/80 border border-zinc-100 rounded-tl-none'
                                                }`}>
                                                {message.image_url && (
                                                    <div className="mb-2">
                                                        <img src={message.image_url} alt="Shared" className="rounded-lg max-h-60 object-cover" onClick={() => window.open(message.image_url!, '_blank')} />
                                                    </div>
                                                )}
                                                {message.content && !message.content.startsWith('📷 Image') && (
                                                    <p>{message.content}</p>
                                                )}
                                            </div>
                                            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                <p className="text-[10px] text-zinc-900/30 font-mono">
                                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                {isOwn && (
                                                    message.is_read ? 
                                                        <CheckCheck className="h-3 w-3 text-[#FF6600]" /> : 
                                                        <Check className="h-3 w-3 text-zinc-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2 flex items-center gap-1 mt-2">
                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#FAFAFA]/40 backdrop-blur-md border-t border-zinc-100 shrink-0">
                        {imagePreview && (
                            <div className="mb-3 relative inline-block">
                                <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-[#FF6600]/50" />
                                <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-[#FF6200] rounded-full p-1 text-zinc-900 hover:bg-red-600"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                        <form onSubmit={sendMessage} className="flex gap-3 items-end">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-xl border-zinc-200 bg-white text-zinc-600 hover:text-[#FF6600] hover:bg-[#FF6600]/10 hover:border-[#FF6600]/30 shrink-0 transition-all"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon className="h-5 w-5" />
                            </Button>

                            <Input
                                placeholder="Transmit secure message..."
                                value={newMessage}
                                onChange={handleTyping}
                                className="h-12 bg-[#FAFAFA]/50 border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-900/30 focus:ring-[#FF6600]/50 focus:border-[#FF6600]/50 font-medium"
                                disabled={sending || isBlocked}
                            />

                            <Button
                                type="submit"
                                className="h-12 w-12 rounded-xl bg-[#FF6600] text-black hover:bg-[#FF6600]/90 shadow-[0_0_20px_rgba(255,184,0,0.2)] shrink-0 disabled:opacity-50"
                                disabled={sending || (!newMessage.trim() && !selectedImage) || isBlocked}
                            >
                                {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>

            <SmartEscrowModal
                isOpen={showEscrowModal}
                onClose={() => setShowEscrowModal(false)}
                onConfirm={handleCreateEscrow}
                amount={escrowAmount}
                setAmount={setEscrowAmount}
            />
        </div>
    );
}

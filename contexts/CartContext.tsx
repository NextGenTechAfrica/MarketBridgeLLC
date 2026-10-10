'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CartItem {
    listingId: string;
    title: string;
    price: number;
    image: string;
    sellerId: string;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    updateQuantity: (listingId: string, quantity: number) => void;
    removeFromCart: (listingId: string) => void;
    clearCart: () => void;
    total: number;
    itemCount: number;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    const [isInitialized, setIsInitialized] = useState(false);

    // Load cart from local storage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedCart = localStorage.getItem('marketbridge_cart');
            if (savedCart) {
                try {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setItems(JSON.parse(savedCart));
                } catch (error) {
                    console.error('Failed to parse cart from local storage:', error);
                }
            }
            setIsInitialized(true);
        }
    }, []);

    // Save cart to local storage whenever it changes
    useEffect(() => {
        if (isInitialized && typeof window !== 'undefined') {
            localStorage.setItem('marketbridge_cart', JSON.stringify(items));
        }
    }, [items, isInitialized]);

    const addToCart = (newItem: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
        const qtyToAdd = Math.max(1, quantity);
        setItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.listingId === newItem.listingId);
            if (existingItem) {
                return prevItems.map((item) =>
                    item.listingId === newItem.listingId
                        ? { ...item, quantity: item.quantity + qtyToAdd }
                        : item
                );
            }
            return [...prevItems, { ...newItem, quantity: qtyToAdd }];
        });
    };

    const updateQuantity = (listingId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(listingId);
            return;
        }
        setItems((prevItems) =>
            prevItems.map((item) =>
                item.listingId === listingId ? { ...item, quantity } : item
            )
        );
    };

    const removeFromCart = (listingId: string) => {
        setItems((prevItems) => prevItems.filter((item) => item.listingId !== listingId));
    };

    const clearCart = () => {
        setItems([]);
    };

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart,
                total,
                itemCount,
                cartCount: itemCount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

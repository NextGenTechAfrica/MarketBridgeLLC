# MarketBridge 2.0 — Architecture & Design System Audit

## 1. Verified Brand Identity & Design Tokens

### Brand Core
- **Company Name**: MarketBridge (`Market` + `Bridge`)
- **Wordmark Typography**: Outfit font, ultra-bold / black (`font-black`), tracking tight (`tracking-tight`)
- **Logo Presentation**: `<span class="text-slate-900 dark:text-white">Market</span><span class="text-[#FF6200]">Bridge</span>`
- **Slogan / Value Proposition**: "Abuja's campus marketplace, built for students." / "Buy and sell securely with verified student sellers."

### Verified Color Palette
| Token | Hex / HSL | Usage |
|---|---|---|
| `--color-brand-primary` | `#FF6200` (`hsl(23, 100%, 50%)`) | Primary CTAs, active states, badges, accents |
| `--color-brand-hover` | `#E55800` (`hsl(23, 100%, 45%)`) | Button hover state |
| `--color-brand-light` | `#FFF0E6` / `rgba(255,98,0,0.1)` | Subtle highlights, active pills, badge backgrounds |
| `--bg-light` | `#FFFFFF` / `#F8F9FA` | Light mode page background & surfaces |
| `--bg-dark` | `#0B1120` / `#0A1628` | Dark mode page background & surfaces |
| `--surface-dark` | `#0F172A` / `#162036` | Dark mode cards, menus, dialogs |
| `--border-light` | `#E2E8F0` / `#E5E7EB` | Light mode component borders |
| `--border-dark` | `rgba(255,255,255,0.08)` | Dark mode component borders |
| `--color-verified` | `#10B981` (Emerald 500) | Verified badges, active in-stock badges, escrow safe |
| `--color-rating` | `#F59E0B` (Amber 500) | Star ratings, badges, deal highlights |
| `--color-error` | `#EF4444` (Red 500) | Stock alerts, cancellations, errors |

### Typography Tokens
- **Primary Body Font**: `Manrope` (`--font-manrope`, clean contemporary grotesque sans-serif)
- **Headings & Accents**: `Outfit` (`--font-outfit`, modern geometric display)
- **Data / Codes**: `Geist Mono` (`--font-geist-mono`)

---

## 2. Platform Architecture & Data Flow Audit

### Authentication & Roles
- **Auth Provider**: Supabase Auth (`@supabase/ssr` / `@supabase/supabase-js`)
- **Roles**:
  - `student_buyer`, `buyer`: Campus buyers
  - `student_seller`, `seller`: Campus student merchants & independent dealers
  - `operations_admin`, `technical_admin`, `ceo`: Internal operations & escrow administration

### Commerce & Escrow Workflow
1. **Product Discovery**: Categories (`lib/categories.ts`), Campus filter (Baze, Nile, Veritas, UniAbuja), Search (`lib/ai-search.ts`).
2. **Product Details**: Image gallery, specifications, seller badge & campus verification, ratings/reviews, chat with seller (`lib/chat.ts`), make offer/negotiation, add to cart / buy now.
3. **Cart & Staging**: `CartContext` (`localStorage` persistence, listingId, quantity, unit price, seller ID).
4. **Checkout & Escrow Initiation**: Moniepoint MFB Escrow Account transfer (`platform_settings.bank_details`), proof receipt upload (`receipts` bucket in Supabase Storage), reference tracking, MarketCoins redemption.
5. **Order Verification & Fulfillment**: `orders` and `order_items` tables in Supabase. Admin verifies transfer before releasing to seller fulfillment. Buyer releases on physical inspection/delivery.

### WhatsApp Commerce Integration Blueprint
- Webhook endpoints (`/api/webhooks/whatsapp` or future provider gateway).
- Product Catalog sync: `GET /api/listings` formatted into WhatsApp Interactive Product Messages.
- Order Handshake: `/api/orders/create` triggered via WhatsApp interactive flow with instant escrow payment instructions.

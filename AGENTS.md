# SKYNOVA CRM — Agent Guide

> This file is intended for AI coding agents. It describes the project architecture, conventions, and critical details you need before modifying code.

---

## Project Overview

**SKYNOVA CRM** is a full-stack CRM / ERP web application built with Next.js 14 (App Router). It supports multi-role user management, order lifecycle tracking, warehouse inventory across two countries (Turkey and Syria), employee targets & salaries, expense tracking, customer management, analytics, and an e-commerce affiliate platform.

The UI is primarily **Arabic** and rendered **RTL** (`dir="rtl"`). Most user-facing labels, toast messages, and inline comments are in Arabic. Code identifiers (variables, functions, filenames) remain in English.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI Library | React 18 |
| Styling | Tailwind CSS 3.4.1 |
| Database | PostgreSQL |
| ORM | Prisma 7.3.0 (custom output: `generated/prisma`) |
| Auth | JWT (`jose`) + `bcryptjs` + HTTP-only cookie (`skynova`) |
| State Management | Zustand (minimal stores) |
| Forms | React Hook Form + Zod |
| Charts | Recharts + Tremor |
| PDF/Print | `jspdf`, `jspdf-autotable`, `html2canvas`, `react-to-print` |
| PWA | `@ducanh2912/next-pwa` |
| Image Storage | `@vercel/blob` |
| Cron | `node-cron` (server-side monthly target freeze) |

---

## Project Structure

```
app/                    # Next.js App Router
  api/                  # API routes (login, users, permissions, settings, orders)
  dashboard/            # Protected dashboard pages
    layout.tsx          # Dashboard shell (Sidebar + Navbar, RTL, ThemeProvider)
    page.tsx            # Main dashboard (analytics, targets, activity)
    analytics/
    categories/
    collections/
    customers/
    coupons/
    employee-salaries/
    expenses/
    inventories/
    move-product/
    orders/
    permissions/
    products/
    settings/
    shipping/
    users/
    warranty/
  layout.tsx            # Root layout (fonts, AuthProvider, Toaster)
  page.tsx              # Login page (redirects to /dashboard if session exists)
  manifest.ts           # PWA manifest

server/                 # Server Actions (`'use server'`)
  user.ts               # Auth, user CRUD, targets, impersonation
  order.ts              # Order CRUD, stock adjustments, analytics helpers
  customer.ts
  product.ts
  category.ts
  warehouse.ts
  shipping.ts
  expenses.ts
  analytics.ts
  image.ts              # Vercel Blob image upload
  collections.ts
  coupon.ts             # Coupon CRUD (name, code, discount, usage limit)
  employee-salaries.ts
  warranty.ts
  move.ts
  general-settings.ts

components/             # React components
  pages/                # Page-specific sections
  shared/               # Reusable cross-page components (DataTable, DynamicForm, etc.)
  system/               # Toaster providers
  ui/                   # Low-level UI primitives (Button, Modal, Inputs, Cards)
  navbar.tsx
  sidebar.tsx

orders/                 # Order domain split out from components/
  OrderTable.tsx
  SearchAndFilter.tsx
  ShippingModal.tsx
  StatusCards.tsx
  ViewOrder.tsx
  ViewOrderCustomer.tsx
  orderHelpers.ts
  orderPdf.ts
  useOrderData.ts
  useOrderExport.ts
  useOrderFilters.ts
  useOrderForm.ts

lib/                    # Utilities & configuration
  auth.ts               # JWT encrypt/decrypt (uses hardcoded secret key)
  prisma.ts             # PrismaClient with pg adapter
  utils.ts              # cn() (Tailwind merge), permission helpers, phone formatter
  type.ts               # Shared TypeScript interfaces (User, Permission, NavItem)
  themeProvider.tsx     # Re-exports next-themes provider
  cron.ts               # Monthly target freeze cron job

context/
  AuthContext.tsx       # React context: auth state, impersonation, refreshUser

store/
  customer.ts           # Zustand store for order cash/grand-total state

prisma/
  schema.prisma         # Full schema (Users, Orders, Products, Affiliates, etc.)
  migrations/           # Prisma migrations
```

---

## Build & Development Commands

```bash
# Install dependencies
npm install

# Dev server (runs on port 4000)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

> **Note:** There is no test suite configured in this project. `npm run lint` maps to `next lint`.

---

## Database & Migrations

The project uses **PostgreSQL** via Prisma with the `@prisma/adapter-pg` adapter. The Prisma client is generated to `generated/prisma/`.

```bash
# Generate Prisma client
npx prisma generate

# Create a migration
npx prisma migrate dev --create-only

# Deploy migrations
npx prisma migrate deploy
```

Connection is configured via `DATABASE_URL` in `.env`. A `prisma.config.ts` file is also present for Prisma's new configuration format.

**Important models:** `User`, `Permission`, `Order`, `OrderItem`, `Product`, `ProductStock`, `Warehouse`, `Customer`, `Expense`, `Shipping`, `Warranty`, `WholesaleWarranty`, `Page`, `AffiliateLink`, `Commission`.

**Warehouse access control:** The `Permission` ↔ `Warehouse` many-to-many relation (`allowedWarehouses` / `allowedPermissions`, join table `_PermissionWarehouseAccess`) restricts which warehouses a role may access. An empty list means access to all warehouses. Managed from the permissions page (`app/dashboard/permissions/page.tsx`) via `/api/permissions`; enforced for orders (`server/order.ts`), wholesale orders (`server/wholesale-order.ts`), and the products page (`app/dashboard/products/page.tsx`) — admins bypass all checks. The client user payload (`/api/users/get`, `/api/users/impersonate/[id]`) includes `permission.allowedWarehouses`. Warehouse **lists shown to end users** (orders, wholesale orders, products pages) must come from `getAllowedWarehouses()` in `server/warehouse.ts`, which filters by the session user's `allowedWarehouses`; the unfiltered `getWarehouse()` is reserved for admin screens (permissions, inventories).

---

## Authentication & Authorization

- **Session:** JWT stored in an HTTP-only cookie named `skynova`. Expires in 30 days.
- **Middleware (`middleware.ts`):**
  - Redirects unauthenticated users from `/dashboard/*` to `/`.
  - Redirects authenticated users from `/` to `/dashboard`.
- **Roles:** `ADMIN`, `MANAGER`, `STAFF`.
- **Permissions:** Granular CRUD permissions per module (products, orders, customers, employees, expenses, categories, permissions, pages, analytics). Admins bypass all permission checks.
- **Impersonation:** Admins can impersonate other users via `?asUser=<id>` query param or session storage key `skynova_as_user_id`. Stop impersonation with `?asUser=me`.

### Security Considerations
- **JWT secret is hardcoded** in `lib/auth.ts` as `"secret"`. In production this should be moved to `process.env.JWT_SECRET`.
- No visible rate-limiting or CSRF token implementation.
- Passwords are hashed with `bcryptjs`.

---

## Code Style Guidelines

1. **TypeScript:** Strict mode enabled. Write types for all function inputs/outputs.
2. **Path Aliases:** Use `@/` for imports from the project root (e.g., `@/lib/prisma`, `@/components/ui/button`).
3. **Server vs Client:**
   - Default to **Server Components**.
   - Mark interactive components with `'use client'`.
   - Mark server-only data mutations with `'use server'`.
4. **Styling:** Tailwind CSS. Use `cn()` from `@/lib/utils` for conditional class merging.
5. **RTL:** Dashboard layout sets `dir="rtl"`. All forms, tables, and modals should remain RTL-aware.
6. **Language:** UI text and comments are mostly **Arabic**. Keep new user-facing text in Arabic to match the existing UX.
7. **Forms:** Use `DynamicForm` + `FormInput` / `select-form` + Zod schemas.
8. **Toast Feedback:** Use `react-hot-toast` with Arabic messages (`toast.success("...")`, `toast.error("...")`).

---

## Key Architectural Patterns

### Server Actions
Heavy business logic lives in `server/*.ts` files as async exported functions with `'use server'`. These are imported directly into Server Components or called from Client Components for mutations.

### API Routes
Lightweight API routes exist under `app/api/` for specific needs (login, logout, impersonation, user profile, settings data-transfer, WhatsApp sharing).

### Stock Management
Orders affect stock in real time via `applyOrderStockChange` in `server/order.ts`:
- Sold/delivered statuses **decrease** stock.
- Cancelled/returned statuses **restore** stock.
- Warehouses are located in either Turkey or Syria; stock lookups fall back by location name when `warehouseId` is absent.

### Warranty
Warranty records (`server/warranty.ts`) now require a **warehouse** and **quantity** for every type:
- Creating a warranty decrements stock from the selected warehouse and logs a `StockMovement` of type `OUT`.
- `REPLACEMENT` warranties create a matching `Order` record and store its id on the warranty.
- Deleting a warranty restores the quantity to the linked warehouse. For replacements, the linked order is deleted first; for `DAMAGED`/`MAINTENANCE`, a `StockMovement` of type `RETURN` is also logged.
- `customerId` is optional. The customer field is hidden for `DAMAGED` and optional for `MAINTENANCE`, but it is still required for `REPLACEMENT` because an order must be linked to a customer.

### Wholesale Warranty
The wholesale warranty (`server/wholesale-warranty.ts`, page `app/dashboard/wholesale-warranty/page.tsx`, model `WholesaleWarranty`) mirrors the retail warranty but for wholesale customers:
- It selects from `WholesaleCustomer` records and links to `WholesaleOrder` instead of `Order`.
- `REPLACEMENT` warranties create a `WholesaleOrder` (order number `WHL-...`, status `PENDING`, fully discounted so `finalAmount = 0`), which appears under "طلب جديد" on the wholesale orders page (`/dashboard/wholesale-orders`).
- Stock effects, `StockMovement` logging, and edit/delete restore logic are identical to the retail warranty (reasons are suffixed with "كفالة جملة").
- It reuses the retail warranty permissions (`viewWarranty` / `addWarranty` / `editWarranty` / `deleteWarranty`); the sidebar entry "كفالة الجملة" is gated by `viewWarranty`.

### Cron Jobs
`lib/cron.ts` runs a monthly job (1st of month at 00:00 UTC) that deactivates active `UserTarget` records. It is imported in the root layout so it initializes once per server process.

### Shipping Company Portal
The `shipping` model has a `password` column (default `"1234567"`), settable from the shipping dashboard page (`app/dashboard/shipping/page.tsx`). Shipping companies log in at `/shipping-login` (company name + password) via the `shippingLogin` server action in `server/shipping.ts`, which sets an HTTP-only JWT cookie `skynova_shipping`. `/shipping-orders` shows only that company's orders via `getMyShippingOrders()` (validates the cookie server-side). Both pages are public standalone routes outside `/dashboard`, so `middleware.ts` does not guard them — auth is enforced inside the server actions. Passwords are stored in plaintext (matches the requested default value).

### Fatih Cargo Integration
The shipping company named exactly **"الفاتح"** (`FATIH_COMPANY_NAME` in `lib/fatih.ts` — not in `server/shipping.ts`, since `'use server'` files may only export async functions) is linked to the external Fatih Cargo API (`https://fatihcargo.com/api/v1`). Auth is a Bearer token from `FATIH_API_TOKEN` in `.env` (server-side only).

- Shipping details modal (`app/dashboard/shipping/page.tsx`) shows a "طلبات الفاتح" section for that company, fetched live from `GET /shipping/orders` via `getFatihOrders()`.
- In the orders page shipping modal (`orders/ShippingModal.tsx`), selecting "الفاتح" loads dropdowns (cities, units, weights, sizes) via `getFatihFormOptions()` (`GET /shipping/reference/cities`, `/reference/units`, `/reference/categories?type=weight|size`) and shows all fields required by the Fatih create-shipment API (sender/receiver names, phones, addresses, package count, order value, price, insurance/fee checkboxes, note — see the exported `FatihShipmentInput` type), prefilled from the order and editable. On save, `updateOrderShippingFromTable` in `server/order.ts` auto-creates the shipment via `createFatihShipment()` (`POST /shipping/orders`) using those values (falling back to order-derived fields when left empty).
- `Order` has nullable Fatih columns (`fatihOrderId`, `fatihQrCode`, `fatihCode`, `fatihCitySourceId`, `fatihCityTargetId`, `fatihUnitId`, `fatihWeightId`, `fatihSizeId` — migration `20260829144206_add_fatih_fields_to_order`), included in `orderBaseSelect`. If the Fatih API call fails, the local shipping data is still saved and the response carries `partiallySaved: true`.

---

## Deployment Notes

- The project includes PWA configuration (`next-pwa`) with service worker generation to `public/`.
- Vercel deployment is implied by the presence of `.vercel/` and `@vercel/blob` usage.
- `dev.db` exists in the repo but the app targets PostgreSQL in production.

---

## Quick Checklist Before Editing

- [ ] Does the file need `'use client'` or `'use server'`?
- [ ] Are you using `@/` aliases instead of relative `../../` paths?
- [ ] Are permission checks applied for non-admin users (`hasPermission` / `isAdmin`)?
- [ ] Is user-facing text in Arabic?
- [ ] Did you verify the Prisma schema reflects any new fields?
- [ ] Did you run `npx prisma generate` after schema changes?

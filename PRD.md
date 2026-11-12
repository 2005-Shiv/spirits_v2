# PRD.md — spirits_v2 Liquor Quick-Commerce

## 1. Overview
**Product:** spirits_v2 — Company-owned liquor quick-commerce platform  
**Business Model:** Company-owned rented dark stores (NOT a vendor marketplace)  
**Catalogue:** Centralised product catalogue and pricing  
**Inventory:** Each dark store maintains independent store-specific inventory  
**Budget:** Strictly ₹0 — open-source tools, local development, free tiers, mock integrations  

## 2. Target Users / Interfaces
Four distinct interfaces:
1. **Customer** — Browse liquor, filter, add to cart, pay, track delivery, receive handover
2. **Delivery Partner** — Accept delivery requests, update status, live location, QR handover, OTP verification
3. **Store Operator** — View store orders, mark orders ready for dispatch (no stock modification — Model A)
4. **Super Admin** — Manage stores, users, delivery partners, products, inventory (admin-only stock control)

## 3. Core Features (MVP Scope)
| Feature | Description | Priority |
|---------|-------------|----------|
| User Auth | Register, login, JWT (mock KYC/selfie for MVP) | P0 |
| Product Catalogue | Centralised products, category filter (liquor), search | P0 |
| Store Allocation | Nearest dark store via PostGIS/H3 grid based on user location | P0 |
| Cart | Add/remove/update items (persisted to DB) | P0 |
| Checkout | Mock payment (Stripe in test mode or mock) | P0 |
| Order State Machine | Placed → Confirmed → Packed → Out for Delivery → Delivered/Cancelled | P0 |
| Store Operator Dashboard | View assigned store orders, mark ready | P0 |
| Delivery Partner | Accept order, update status, live location, complete with OTP | P0 |
| QR Handover | Generate QR for pickup, verify on delivery | P0 |
| Delivery OTP | 6-digit code for handover acceptance | P0 |
| Super Admin | Manage stores, users, DPs, products, stock (Model A) | P0 |
| Inventory Ledger | Audit log of all stock changes (admin only) | P1 |

## 4. Out of Scope (MVP)
- Vendor marketplace onboarding
- Real paid SMS/OTP (use mock)
- Real KYC provider (use mock selfie upload)
- Microservices
- Mobile apps (web only)

## 5. Success Metrics
- Customer can place an order and track it end-to-end
- Store Operator can see orders for their store
- Delivery Partner can accept and complete an order with OTP
- Super Admin can modify stock and see audit trail
- All features tested before moving to next feature

# ARCHITECTURE.md — spirits_v2

## 1. Architecture Pattern
**Modular Monolith** — Single backend (Node.js + Express + TypeScript), single PostgreSQL database, single frontend (React + Vite + TypeScript).  
No microservices. Clear module boundaries within the monolith:
- `auth/` — Customer, Store Operator, Delivery Partner, Super Admin authentication
- `catalog/` — Products, categories, centralised pricing
- `store/` — Dark stores, store inventory (store-specific stock)
- `cart/` — Shopping cart (DB-backed)
- `order/` — Orders, order state machine, order items
- `inventory/` — Inventory ledger (audit log, admin-only writes)
- `delivery/` — Delivery partners, delivery assignment, live location, OTP, QR
- `payment/` — Stripe (mock mode for ₹0 budget)
- `kyc/` — Mock KYC/selfie verification

## 2. Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Neon free tier), Prisma ORM |
| Geospatial | PostGIS extension + H3 (grid-based store allocation) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |
| Auth | JWT (access tokens), bcrypt |
| Payments | Stripe (test mode / mock) |
| File Storage | Cloudinary (free tier) |
| Background Jobs | Inngest |
| Email/SMS | Nodemailer (mock SMTP) / Twilio mock |
| QR | `qrcode` library (open source) |

## 3. Database Schema (Key Models)
```
User              — Customers (id, email, password, role, addresses)
Store             — Dark stores (id, name, address, lat, lng, h3Cell, isActive)
StoreOperator     — Store staff (id, storeId, email, password, isActive)
StoreInventory    — Stock per store per product (storeId, productId, quantity, reserved)
Product           — Centralised catalogue (id, name, price, category, image, ...)
InventoryLedger   — Audit log (id, storeId, productId, changeType, quantity, changedBy, reason, createdAt)
Order             — Orders (id, userId, storeId, items, status, total, deliveryPartnerId, deliveryOtp, liveLocation, ...)
DeliveryPartner   — DPs (id, email, password, vehicleType, isActive, currentLat, currentLng)
Address           — User addresses (id, userId, label, address, lat, lng, isDefault)
```

## 4. API Structure (Modular)
```
POST   /api/auth/register          — Customer signup
POST   /api/auth/login             — Customer login
POST   /api/auth/store-operator/register  — Store operator signup
POST   /api/auth/store-operator/login     — Store operator login
POST   /api/auth/dp/login          — Delivery partner login
POST   /api/auth/admin/login       — Super Admin login

GET    /api/products               — List products (filter by category, search)
GET    /api/products/:id           — Product detail
POST   /api/cart                   — Add to cart
GET    /api/cart                   — Get cart
PUT    /api/cart/:itemId           — Update quantity
DELETE /api/cart/:itemId           — Remove from cart

POST   /api/orders                 — Create order (allocates nearest store)
GET    /api/orders                 — User orders
GET    /api/orders/:id             — Order detail + tracking

GET    /api/store/orders           — Store Operator: orders for their store
PUT    /api/store/orders/:id/ready — Mark order ready for dispatch

GET    /api/delivery/available     — Available delivery requests
PUT    /api/delivery/orders/:id/accept — Accept delivery
PUT    /api/delivery/orders/:id/location — Update live location
PUT    /api/delivery/orders/:id/complete — Complete with OTP

GET    /api/admin/stores           — Manage stores
PUT    /api/admin/stock            — Modify stock (Model A — admin only)
GET    /api/admin/inventory-ledger — Audit trail
```

## 5. Order State Machine
```
Placed → Confirmed → Packed → Out for Delivery → Delivered
                              ↳ Cancelled (at any terminal-previous step)
```

## 6. Store Allocation (PostGIS + H3)
- User provides lat/lng (address)
- System computes H3 cell for user location
- Finds active dark stores in same/adjacent H3 cells
- Allocates nearest store by geographic distance
- Order is tied to that store's inventory

## 7. Inventory Model A (Confirmed)
- Only Super Admin can modify `StoreInventory.quantity`
- Store Operators can view stock but NOT change it
- Every stock change is recorded in `InventoryLedger` (who, what, when, why, store, product)

# ROADMAP.md — spirits_v2

## Phase 0: Foundation & Documentation (Current)
- [x] Audit existing repository (backend routes, controllers, Prisma schema, seed)
- [x] Fix bug: stock never decremented in `createOrder` (dead code after `res.json`)
- [x] Create PRD.md, ARCHITECTURE.md, ROADMAP.md, DECISIONS.md, SESSION.md
- [ ] Add Store, StoreOperator, StoreInventory, InventoryLedger models to Prisma
- [ ] Run `prisma db push` and verify tables created in Neon

## Phase 1: Store Infrastructure
- [ ] Store CRUD (Super Admin): create, list, update, deactivate dark stores
- [ ] H3 grid cell assignment for each store
- [ ] StoreOperator auth (register, login, JWT)
- [ ] Store Operator dashboard: view orders assigned to their store
- [ ] Store-specific inventory seeding (each store gets stock of products)

## Phase 2: Customer Flow
- [ ] Product filter by category (liquor) + search
- [ ] Nearest store allocation based on user address lat/lng
- [ ] Cart persisted to database (not just localStorage)
- [ ] Add to cart, update quantity, remove
- [ ] Checkout with mock payment
- [ ] Order creation with state machine (Placed → Confirmed)

## Phase 3: Delivery Partner Flow
- [ ] Delivery Partner login
- [ ] View available delivery requests (orders ready for dispatch)
- [ ] Accept delivery request
- [ ] Update delivery status (Packed → Out for Delivery)
- [ ] Update live location
- [ ] Complete delivery with OTP verification

## Phase 4: Tracking, QR & Handover
- [ ] Customer order tracking page (live DP location on map)
- [ ] QR code generation for pickup handover
- [ ] Delivery OTP (6-digit) for customer acceptance
- [ ] Handover completion flow

## Phase 5: Super Admin & Polish
- [ ] Super Admin dashboard: stores, users, DPs, products, orders
- [ ] Admin-only stock modification (Model A)
- [ ] Inventory Ledger audit trail view
- [ ] Mock KYC/selfie upload (Cloudinary)
- [ ] End-to-end testing of all four interfaces

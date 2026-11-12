# DECISIONS.md — spirits_v2

## Confirmed Decisions

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | **Business Model**: Company-owned rented dark stores (NOT vendor marketplace) | Centralised control, simpler operations | Session start |
| 2 | **Catalogue**: Centralised product catalogue and pricing | Consistency across all stores | Session start |
| 3 | **Inventory**: Each dark store maintains independent store-specific inventory | Store-level stock visibility | Session start |
| 4 | **Store Staff**: Called "Store Operators", not Vendors | Aligns with dark-store model | Session start |
| 5 | **Interfaces**: Customer, Delivery Partner, Store Operator, Super Admin | Four distinct roles | Session start |
| 6 | **Architecture**: Modular monolith, one central backend | Avoids microservices complexity | Session start |
| 7 | **Database**: PostgreSQL + Prisma ORM | Already in existing project | Session start |
| 8 | **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4 | Already in existing project | Session start |
| 9 | **Geospatial**: PostGIS + H3 for store allocation | Grid-based nearest-store matching | Session start |
| 10 | **Budget**: Strictly ₹0 — open-source, free tiers, mock integrations | No paid APIs mandatory | Session start |
| 11 | **Mock Integrations**: Payments, OTP, KYC, GPS all mocked | Zero cost | Session start |
| 12 | **Inventory Control Model**: **Model A** — Only admin modifies stock. Store Operators cannot change stock. | Simplicity, single source of truth, no reconciliation complexity | Confirmed by user |
| 13 | **Audit Trail**: InventoryLedger records all stock changes (admin-only writes) | Accountability even in Model A | Session start |

## Pending Decisions
- KYC provider: Mock (selfie upload to Cloudinary) vs real provider — **decided: Mock**
- Payment provider: Stripe test mode vs full mock — **pending**
- SMS/OTP provider: Mock vs Twilio free tier — **pending**
- Map provider: Leaflet (existing) vs Google Maps — **pending**

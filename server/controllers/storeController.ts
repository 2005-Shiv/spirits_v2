import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

// Haversine distance in km between two lat/lng points
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// GET /api/stores — List all active dark stores
export const getStores = async (req: Request, res: Response) => {
    try {
        const stores = await prisma.store.findMany({
            where: { isActive: true },
            include: {
                inventory: {
                    include: { product: { select: { id: true, name: true, price: true, category: true } } },
                },
            },
            orderBy: { createdAt: "asc" },
        });
        res.json({ stores });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch stores", error: error.message });
    }
};

// GET /api/store/orders — Store Operator: view orders for their store
export const getStoreOrders = async (req: Request, res: Response) => {
    try {
        const storeId = req.operator!.storeId;
        const { status } = req.query;

        const where: any = { storeId };
        if (status && status !== "all") {
            where.status = status;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                user: { select: { name: true, email: true, phone: true } },
                deliveryPartner: { select: { name: true, phone: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({ orders });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch store orders", error: error.message });
    }
};

// PUT /api/store/orders/:id/ready — Mark order ready for dispatch
export const markOrderReady = async (req: Request, res: Response) => {
    try {
        const storeId = req.operator!.storeId;
        const orderId = req.params.id;

        const order = await prisma.order.findFirst({
            where: { id: orderId, storeId },
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found for this store" });
        }

        const allowedStatuses = ["Placed", "Confirmed"];
        if (!allowedStatuses.includes(order.status)) {
            return res.status(400).json({ message: `Cannot mark order as ready from status: ${order.status}` });
        }

        const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as any[];
        history.push({ status: "Ready", note: "Order ready for dispatch", timestamp: new Date() });

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status: "Ready", statusHistory: history },
            include: {
                user: { select: { name: true, email: true, phone: true } },
                deliveryPartner: { select: { name: true, phone: true } },
            },
        });

        res.json({ order: updatedOrder, message: "Order marked ready for dispatch" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update order", error: error.message });
    }
};

// GET /api/stores/nearest — Find nearest store based on user lat/lng
export const getNearestStore = async (req: Request, res: Response) => {
    try {
        const { lat, lng } = req.query;

        if (lat == null || lng == null) {
            return res.status(400).json({ message: "Latitude and longitude are required" });
        }

        const userLat = Number(lat);
        const userLng = Number(lng);

        const stores = await prisma.store.findMany({
            where: { isActive: true },
            include: {
                inventory: {
                    include: { product: { select: { id: true, name: true, price: true, category: true } } },
                },
            },
        });

        if (stores.length === 0) {
            return res.status(404).json({ message: "No active stores found" });
        }

        // Calculate distance for each store and sort
        const storesWithDistance = stores.map((store) => ({
            ...store,
            distanceKm: Math.round(haversineDistance(userLat, userLng, store.lat, store.lng) * 100) / 100,
        }));

        storesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

        res.json({
            nearestStore: storesWithDistance[0],
            allStores: storesWithDistance,
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to find nearest store", error: error.message });
    }
};
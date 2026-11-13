import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { inngest } from "../inngest/index.js";
import Stripe from "stripe";

// Haversine distance in km between two lat/lng points
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Create order
// POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: "No order items" });
    }

    const userLat = shippingAddress?.lat;
    const userLng = shippingAddress?.lng;

    if (userLat == null || userLng == null) {
        return res.status(400).json({ message: "Delivery location coordinates are required" });
    }

    const stores = await prisma.store.findMany({ where: { isActive: true } });
    if (stores.length === 0) {
        return res.status(500).json({ message: "No active stores available" });
    }

    const storesWithDistance = stores.map((s) => ({
        ...s,
        distanceKm: haversineDistance(Number(userLat), Number(userLng), s.lat, s.lng),
    }));

    storesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    const nearestStore = storesWithDistance[0];

    const productIds = items.map((i: any) => i.product);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap: Record<string, (typeof products)[0]> = {};
    products.forEach((p: any) => (productMap[p.id] = p));

    for (const item of items) {
        const product = productMap[item.product];
        if (!product) {
            return res.status(404).json({ message: `Product ${item.product} not found` });
        }

        const storeInventory = await prisma.storeInventory.findUnique({
            where: { storeId_productId: { storeId: nearestStore.id, productId: product.id } },
        });

        if (!storeInventory || storeInventory.quantity < item.quantity) {
            return res.status(404).json({
                message: `Product "${product.name}" out of stock at ${nearestStore.name}`,
            });
        }
    }

    const orderItems = items.map((item: any) => {
        const dbProduct = productMap[item.product];
        if (!dbProduct) throw new Error(`Product ${item.product} not found`);
        return {
            product: dbProduct.id,
            name: dbProduct.name,
            image: dbProduct.image,
            price: dbProduct.price,
            quantity: item.quantity,
            unit: dbProduct.unit,
        };
    });

    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const deliveryFee = subtotal > 20 ? 0 : 1.99;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    const order = await prisma.order.create({
        data: {
            userId: req.user!.id,
            storeId: nearestStore.id,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            deliveryFee,
            tax,
            total,
            statusHistory: [{ status: "Placed", note: "Order placed successfully", timestamp: new Date() }],
        },
    });

    for (const item of orderItems) {
        await prisma.storeInventory.update({
            where: { storeId_productId: { storeId: nearestStore.id, productId: item.product } },
            data: { quantity: { decrement: item.quantity } },
        });

        await prisma.inventoryLedger.create({
            data: {
                storeId: nearestStore.id,
                productId: item.product,
                changeType: "ADJUST",
                quantity: -item.quantity,
                changedBy: req.user!.id,
                reason: `Order ${order.id} placed`,
                referenceOrder: order.id,
            },
        });
    }

    try {
        for (const item of orderItems) {
            await inngest.send({ name: "inventory/stock.updated", data: { productId: item.product } });
        }
        await inngest.send({ name: "order/placed", data: { orderId: order.id } });
    } catch (error: any) {
        console.warn("Inngest event failed (non-fatal):", error.message);
    }

    if (paymentMethod === "card") {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        const session = await stripe.checkout.sessions.create({
            success_url: `${req.headers.origin}/orders?clearCart=true`,
            cancel_url: `${req.headers.origin}/checkout`,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: "Payment Groceries" },
                        unit_amount: Math.round(total * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            metadata: { orderId: order.id },
        });
        return res.json({ url: session.url, order, nearestStore });
    }

    res.json({ order, nearestStore });
};

// Get user's orders
// GET /api/orders
export const getUserOrders = async (req: Request, res: Response) => {
    const { status } = req.query;

    const where: any = {
        userId: req.user!.id,
        NOT: [{ paymentMethod: "card", isPaid: false }],
    };

    if (status && status !== "all") {
        where.status = status;
    }

    const orders = await prisma.order.findMany({
        where,
        include: { deliveryPartner: { select: { name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
};

// Get single order
// GET /api/orders/:id
export const getOrder = async (req: Request, res: Response) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id as string, userId: req.user!.id },
        include: { deliveryPartner: { select: { name: true, phone: true, avatar: true, vehicleType: true } } },
    });

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    res.json({ order });
};

// Update order status (admin)
// PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
    const { status, note } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id as string } });

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as any[];
    history.push({ status, note: note || `Order ${status.toLowerCase()}`, timestamp: new Date() });

    const updatedOrder = await prisma.order.update({
        where: { id: req.params.id as string },
        data: { status, statusHistory: history },
    });

    res.json({ order: updatedOrder });
};

// Get all orders (admin)
// GET /api/orders/all
export const getAllOrders = async (req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
        where: { NOT: [{ paymentMethod: "card", isPaid: false }] },
        include: {
            user: { select: { name: true, email: true } },
            deliveryPartner: { select: { name: true, phone: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
};

// Get Order Location
// GET /api/orders/:id/location
export const getOrderLocation = async (req: Request, res: Response) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id as string, userId: req.user!.id },
        select: { liveLocation: true, status: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ liveLocation: order.liveLocation, status: order.status });
};

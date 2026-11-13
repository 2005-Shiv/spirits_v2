import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt";

// get admin dashboard data
export const getAdminStats = async (req: Request, res: Response) => {
    const [totalOrders, totalUsers, totalProducts, outOfStock, totalPartners, recentOrders] = await Promise.all([
        prisma.order.count({ where: { NOT: [{ paymentMethod: "card", isPaid: false }] } }),
        prisma.user.count(),
        prisma.product.count(),
        prisma.product.count({ where: { stock: 0 } }),
        prisma.deliveryPartner.count(),
        prisma.order.findMany({
            where: { NOT: [{ paymentMethod: "card", isPaid: false }] },
            orderBy: { createdAt: "desc" },
            take: 8,
            include: {
                user: { select: { name: true, email: true } },
                deliveryPartner: { select: { name: true, phone: true } },
            },
        }),
    ]);
    res.json({ totalOrders, totalUsers, totalProducts, outOfStock, totalPartners, recentOrders });
};

// get delivery partners list for admin
export const getDeliveryPartners = async (req: Request, res: Response) => {
    const partners = await prisma.deliveryPartner.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ partners });
};

// create delivery partner profile
export const createDeliveryPartner = async (req: Request, res: Response) => {
    const { name, email, password, phone, vehicleType } = req.body;

    if (!name || !email || !password || !phone) {
        res.status(400).json({ message: "Please provide all required fields" });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const partner = await prisma.deliveryPartner.create({
        data: { name, email: email.toLowerCase(), password: hashedPassword, phone, vehicleType },
    });

    res.status(201).json({ partner });
};

// update delivery partner profile
export const updateDeliveryPartner = async (req: Request, res: Response) => {
    const { name, phone, vehicleType, isActive } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (vehicleType) data.vehicleType = vehicleType;
    data.isActive = isActive;

    try {
        const partner = await prisma.deliveryPartner.update({
            where: { id: req.params.id as string },
            data,
        });
        res.json({ partner });
    } catch (error) {
        res.status(404).json({ message: "Partner not found" });
    }
};

// assign delivery partner for order
export const assignDeliveryPartner = async (req: Request, res: Response) => {
    const { partnerId } = req.body;

    const order = await prisma.order.findUnique({
        where: { id: req.params.id as string },
    });

    const partner = await prisma.deliveryPartner.findUnique({
        where: { id: partnerId },
    });

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    let status = order!.status;

    const history: any[] = Array.isArray(order!.statusHistory) ? order!.statusHistory : [];

    if (order!.status === "Placed" || order!.status === "Confirmed") {
        status = "Assigned";
        history.push({
            status: "Assigned",
            note: `Assigned to ${partner!.name}`,
            timestamp: new Date(),
        });
    }

    await prisma.order.update({
        where: { id: order!.id },
        data: { deliveryPartnerId: partner!.id, deliveryOtp: otp, status, statusHistory: history },
    });

    res.json({ order });
};

// Get store inventory for admin (Model A: admin views and modifies stock)
// GET /api/admin/stores/:storeId/inventory
export const getStoreInventory = async (req: Request, res: Response) => {
    const { storeId } = req.params;

    const inventory = await prisma.storeInventory.findMany({
        where: { storeId: storeId as string },
        include: {
            product: {
                select: { id: true, name: true, price: true, category: true, image: true },
            },
        },
        orderBy: { product: { name: "asc" } },
    });

    res.json({ storeId, inventory });
};

// Modify stock - Super Admin only (Model A)
// PUT /api/admin/stock
export const modifyStock = async (req: Request, res: Response) => {
    const { storeId, productId, quantity, changeType, reason } = req.body;

    if (!storeId || !productId || quantity == null || !changeType || !reason) {
        return res.status(400).json({ message: "storeId, productId, quantity, changeType, and reason are required" });
    }

    const validChangeTypes = ["RECEIVE", "DAMAGE", "EXPIRE", "RECONCILE", "ADJUST"];
    if (!validChangeTypes.includes(changeType)) {
        return res.status(400).json({ message: `Invalid changeType. Must be one of: ${validChangeTypes.join(", ")}` });
    }

    const storeInventory = await prisma.storeInventory.findUnique({
        where: { storeId_productId: { storeId, productId } },
    });

    if (!storeInventory) {
        return res.status(404).json({ message: "Store inventory not found for this product" });
    }

    const newQuantity = storeInventory.quantity + quantity;

    if (newQuantity < 0) {
        return res.status(400).json({ message: "Insufficient stock. Cannot go below zero." });
    }

    const adminId = req.user!.id;

    // Update inventory
    const updatedInventory = await prisma.storeInventory.update({
        where: { storeId_productId: { storeId, productId } },
        data: { quantity: newQuantity },
        include: { product: { select: { id: true, name: true } } },
    });

    // Record in audit ledger
    await prisma.inventoryLedger.create({
        data: {
            storeId,
            productId,
            changeType,
            quantity,
            changedBy: adminId,
            reason,
        },
    });

    res.json({
        message: "Stock updated successfully",
        inventory: updatedInventory,
        changeType,
        quantityChanged: quantity,
        newQuantity,
    });
};

// Inventory Ledger - Audit trail (Model A)
// GET /api/admin/inventory-ledger
export const getInventoryLedger = async (req: Request, res: Response) => {
    const { storeId, productId, changeType, limit } = req.query;

    const where: any = {};

    if (storeId) where.storeId = storeId as string;
    if (productId) where.productId = productId as string;
    if (changeType) where.changeType = changeType as string;

    const ledger = await prisma.inventoryLedger.findMany({
        where,
        include: {
            store: { select: { id: true, name: true } },
            product: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit ? parseInt(limit as string) : 100,
    });

    res.json({ ledger, count: ledger.length });
};

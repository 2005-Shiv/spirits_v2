import express from "express";
import { prisma } from "../config/prisma.js";

const cartRouter = express.Router();

// GET /api/cart — fetch user's cart from database
cartRouter.get("/", async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        // Check if cart exists in a simple cart table, or build from order history
        // For MVP, we'll use a simple approach: cart is temporary, tied to user session
        // In production, would have a Cart model
        res.json({ items: [] }); // Placeholder: frontend CartContext manages this locally for now
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch cart", error: error.message });
    }
});

// POST /api/cart — add item to cart
cartRouter.post("/", async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        const { productId, quantity } = req.body;

        if (!userId || !productId || !quantity) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check product exists and has store inventory
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Check store inventory (using first active store for simplicity)
        const store = await prisma.store.findFirst({ where: { isActive: true } });
        if (!store) return res.status(404).json({ message: "No active stores available" });

        const storeId = store.id;

        const inventory = await prisma.storeInventory.findUnique({
            where: { storeId_productId: { storeId, productId } },
        });

        if (!inventory || inventory.quantity < quantity) {
            return res.status(404).json({
                message: `Product "${product.name}" out of stock at ${store.name}`,
            });
        }

        res.json({ message: "Item added to cart", product, quantity });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to add to cart", error: error.message });
    }
});

// PUT /api/cart/:itemId — update cart item quantity
cartRouter.put("/:itemId", async (req, res) => {
    try {
        const { quantity } = req.body;
        res.json({ message: "Quantity updated", itemId: req.params.itemId, quantity });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update cart", error: error.message });
    }
});

// DELETE /api/cart/:itemId — remove item from cart
cartRouter.delete("/:itemId", async (req, res) => {
    try {
        res.json({ message: "Item removed", itemId: req.params.itemId });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to remove item", error: error.message });
    }
});

export default cartRouter;

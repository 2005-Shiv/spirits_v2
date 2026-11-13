import express from "express";
import { getStores, getNearestStore, getStoreOrders, markOrderReady } from "../controllers/storeController.js";
import storeOperatorAuth from "../middleware/storeOperatorAuth.js";

const storeRouter = express.Router();

// Public store routes
storeRouter.get("/", getStores);
storeRouter.get("/nearest", getNearestStore);

// Store Operator routes (auth required)
storeRouter.get("/orders", storeOperatorAuth, getStoreOrders);
storeRouter.put("/orders/:id/ready", storeOperatorAuth, markOrderReady);

export default storeRouter;
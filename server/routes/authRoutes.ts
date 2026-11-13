import express from "express";
import { login, register, storeOperatorLogin, storeOperatorRegister } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/store-operator/register", storeOperatorRegister);
authRouter.post("/store-operator/login", storeOperatorLogin);

export default authRouter;

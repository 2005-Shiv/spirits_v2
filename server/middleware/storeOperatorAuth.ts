import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

// Type extension for Request with operator
declare global {
  namespace Express {
    interface Request {
      operator: any;
    }
  }
}

const storeOperatorAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string; storeId: string };
        if (decoded.role !== "store_operator") {
            return res.status(403).json({ message: "Access denied. Store operator only." });
        }

        const operator = await prisma.storeOperator.findUnique({
            where: { id: decoded.id },
            include: { store: true },
        });
        if (!operator || !operator.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

        req.operator = operator;
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ message: "Token is not valid" });
    }
};

export default storeOperatorAuth;
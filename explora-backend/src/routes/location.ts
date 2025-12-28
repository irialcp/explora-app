import { Router, Request, Response } from "express";
import { getDB } from "../db";
import { verifyToken } from "../auth";
import { ObjectId } from "mongodb";

const router = Router();

// Middleware: Verifica token
const authenticateToken = (req: Request, res: Response, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid token" });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        (req as any).user_id = decoded.user_id;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
};


// POST /api/location

router.post("/", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user_id;
        const { lat, lng } = req.body;

        // [1] Validazione
        if (typeof lat !== "number" || typeof lng !== "number") {
            return res
                .status(400)
                .json({ error: "lat and lng must be numbers" });
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res
                .status(400)
                .json({ error: "Invalid latitude or longitude" });
        }

        // [2] Update location su MongoDB
        const db = getDB();
        const result = await db
            .collection("users")
            .updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        current_location: {
                            lat: lat,
                            lng: lng,
                            updated_at: new Date(),
                        },
                    },
                }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // [3] Ritorna
        return res.status(200).json({
            message: "Location updated successfully",
            updated_at: new Date(),
        });
    } catch (error) {
        console.error("Location update error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

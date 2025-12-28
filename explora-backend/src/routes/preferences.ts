import { Router, Request, Response } from "express";
import { getDB } from "../db";
import { verifyToken } from "../auth";
import { validateTop3Favorites } from "../utils";
import { UserPreferences } from "../types";
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


// POST /api/preferences/setup

router.post("/setup", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user_id;
        const { profile, travel_preferences, event_preferences } = req.body;

        // [1] Validazione base
        if (!profile || !travel_preferences || !event_preferences) {
            return res
                .status(400)
                .json({ error: "Missing required preference fields" });
        }

        // [2] Valida top_3_favorites
        if (!validateTop3Favorites(event_preferences.top_3_favorites)) {
            return res.status(400).json({
                error: "top_3_favorites must have 1-3 items",
            });
        }

        // [3] Crea documento preferences
        const newPreferences: UserPreferences = {
            user_id: new ObjectId(userId),
            profile: {
                age: profile.age,
                bio: profile.bio || "",
                favorite_activities: profile.favorite_activities || [],
                music_genres: profile.music_genres || [],
                dietary_restrictions: profile.dietary_restrictions || [],
                travel_style: profile.travel_style || "moderate",
                average_daily_budget: profile.average_daily_budget || 50,
            },
            travel_preferences: {
                preferred_climate: travel_preferences.preferred_climate || "moderate",
                travel_pace: travel_preferences.travel_pace || "medium",
                accommodation_type: travel_preferences.accommodation_type || "airbnb",
                group_size: travel_preferences.group_size || "solo",
            },
            event_preferences: {
                categories: event_preferences.categories || {},
                top_3_favorites: event_preferences.top_3_favorites,
                preferred_time: event_preferences.preferred_time || "evening",
                group_or_solo: event_preferences.group_or_solo || "both",
            },
            share_profile: false,
            created_at: new Date(),
            updated_at: new Date(),
        };

        // [4] Salva su MongoDB
        const db = getDB();
        const result = await db.collection("user_preferences").insertOne(newPreferences);

        // [5] Aggiorna user con preferences_id
        await db
            .collection("users")
            .updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        preferences_id: result.insertedId,
                        preferences_completed: true,
                    },
                }
            );

        // [6] Ritorna
        return res.status(201).json({
            message: "Preferences saved successfully",
            preferences_id: result.insertedId,
        });
    } catch (error) {
        console.error("Preferences setup error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});


// GET /api/preferences

router.get("/", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user_id;
        const db = getDB();

        // [1] Trova le preferences dell'user
        const preferences = await db
            .collection("user_preferences")
            .findOne({ user_id: new ObjectId(userId) });

        if (!preferences) {
            return res.status(404).json({ error: "Preferences not found" });
        }

        // [2] Ritorna
        return res.status(200).json(preferences);
    } catch (error) {
        console.error("Get preferences error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});


// PUT /api/preferences

router.put("/", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user_id;
        const { profile, travel_preferences, event_preferences } = req.body;

        // [1] Validazione
        if (event_preferences?.top_3_favorites) {
            if (!validateTop3Favorites(event_preferences.top_3_favorites)) {
                return res.status(400).json({
                    error: "top_3_favorites must have 1-3 items",
                });
            }
        }

        // [2] Prepara update
        const updateData: any = { updated_at: new Date() };

        if (profile) updateData.profile = profile;
        if (travel_preferences) updateData.travel_preferences = travel_preferences;
        if (event_preferences) updateData.event_preferences = event_preferences;

        // [3] Update su MongoDB
        const db = getDB();
        const result = await db
            .collection("user_preferences")
            .updateOne(
                { user_id: new ObjectId(userId) },
                { $set: updateData }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Preferences not found" });
        }

        // [4] Ritorna
        return res.status(200).json({
            message: "Preferences updated successfully",
        });
    } catch (error) {
        console.error("Update preferences error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

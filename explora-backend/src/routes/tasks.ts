import { Router, Request, Response } from "express";
import { getDB } from "../db";
import { verifyToken } from "../auth";
import { calculateDistance, calculateTaskPoints, getRarityMultiplier } from "../utils";
import { ObjectId } from "mongodb";

const router = Router();

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

router.get("/today", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user_id;
        const { lat, lng, show_all } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: "lat and lng query parameters are required" });
        }

        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);

        if (isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({ error: "Invalid lat or lng" });
        }

        const db = getDB();
        const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const allEvents = await db.collection("events").find({ active: true }).toArray();

        const nearbyEvents = allEvents.filter((event: any) => {
            const distance = calculateDistance(userLat, userLng, event.location.lat, event.location.lng);
            return distance <= 5000;
        });

        let filteredEvents = nearbyEvents;
        let filtered = false;

        if (show_all !== "true" && user.preferences_id) {
            const preferences = await db.collection("user_preferences").findOne({ _id: user.preferences_id });

            if (preferences) {
                filtered = true;
                filteredEvents = nearbyEvents.filter((event: any) => {
                    const categoryScore = preferences.event_preferences.categories[event.category] || 0;
                    return categoryScore > 30;
                });
            }
        }

        const tasks = await db
            .collection("daily_tasks")
            .find({
                event_id: { $in: filteredEvents.map((e: any) => e._id) },
                active: true,
            })
            .toArray();

        return res.status(200).json({
            tasks: tasks,
            events: filteredEvents,
            filtered_count: filteredEvents.length,
            total_count: nearbyEvents.length,
            user_score: user.total_score,
            user_preferences: {
                active_filters: filtered ? "personalized" : "all",
                show_all: show_all === "true",
            },
        });
    } catch (error) {
        console.error("Get tasks error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/:taskId/claim", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user_id;
        const { taskId } = req.params;
        const { lat, lng } = req.body;

        if (!lat || !lng || typeof lat !== "number" || typeof lng !== "number") {
            return res.status(400).json({ error: "lat and lng (numbers) are required" });
        }

        const db = getDB();
        const task = await db.collection("daily_tasks").findOne({ _id: new ObjectId(taskId) });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        const event = await db.collection("events").findOne({ _id: task.event_id });

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        const alreadyCompleted = task.completed_by && task.completed_by.some((c: any) => c.user_id.toString() === userId);

        if (alreadyCompleted) {
            return res.status(409).json({
                status: "already_completed",
                message: "You have already completed this task",
            });
        }

        const distance = calculateDistance(lat, lng, event.location.lat, event.location.lng);

        if (distance > 50) {
            return res.status(400).json({
                status: "failed_distance",
                message: `You are ${Math.round(distance)}m away (max 50m allowed)`,
                distance_meters: distance,
            });
        }

        const isFirst = !task.completed_by || task.completed_by.length === 0;
        const rarityMultiplier = getRarityMultiplier(event.rarity);

        const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

        let isFavoriteCategory = false;
        if (user && user.preferences_id) {
            const preferences = await db.collection("user_preferences").findOne({ _id: user.preferences_id });

            if (preferences) {
                isFavoriteCategory = preferences.event_preferences.top_3_favorites.includes(event.category);
            }
        }

        const pointsAwarded = calculateTaskPoints(task.base_points, isFirst, rarityMultiplier, isFavoriteCategory);

        await db.collection("task_claims").insertOne({
            user_id: new ObjectId(userId),
            task_id: new ObjectId(taskId),
            event_id: task.event_id,
            user_location: {
                lat: lat,
                lng: lng,
                timestamp: new Date(),
            },
            event_location: {
                lat: event.location.lat,
                lng: event.location.lng,
            },
            distance_meters: distance,
            status: "success",
            points_awarded: pointsAwarded,
            was_first: isFirst,
            bonus_applied: isFavoriteCategory,
            claimed_at: new Date(),
        } as any);

        await db
            .collection("daily_tasks")
            .updateOne(
                { _id: new ObjectId(taskId) },
                {
                    $push: {
                        completed_by: {
                            user_id: new ObjectId(userId),
                            completed_at: new Date(),
                            points_awarded: pointsAwarded,
                        },
                    } as any,
                    ...(isFirst && { $set: { first_completer: new ObjectId(userId) } }),
                } as any
            );

        await db
            .collection("users")
            .updateOne(
                { _id: new ObjectId(userId) },
                {
                    $inc: { total_score: pointsAwarded },
                    $push: {
                        tasks_completed: {
                            task_id: taskId,
                            completed_at: new Date(),
                            points_earned: pointsAwarded,
                            was_first: isFirst,
                        },
                    } as any,
                } as any
            );

        const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });

        return res.status(200).json({
            status: "success",
            message: isFirst ? `Congratulations! You're first! 🎉 +${pointsAwarded} points` : `Task completed! +${pointsAwarded} points`,
            points_awarded: pointsAwarded,
            user_new_score: updatedUser?.total_score || 0,
            was_first: isFirst,
            bonus_applied: isFavoriteCategory,
        });
    } catch (error) {
        console.error("Claim task error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

import { Router, Request, Response } from "express";
import { getDB } from "../db";
import {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
} from "../auth";
import { validateEmail, validatePassword } from "../utils";
import { User } from "../types";
import { ObjectId } from "mongodb";

const router = Router();

// ============================================
// POST /auth/signup
// ============================================
router.post("/signup", async (req: Request, res: Response) => {
    try {
        const { email, password, username } = req.body;

        // [1] Validazione
        if (!email || !password || !username) {
            return res
                .status(400)
                .json({ error: "Email, password, and username are required" });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (!validatePassword(password)) {
            return res
                .status(400)
                .json({ error: "Password must be at least 8 characters" });
        }

        // [2] Controlla se user esiste già
        const db = getDB();
        const existingUser = await db
            .collection("users")
            .findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(409).json({ error: "Email already registered" });
        }

        // [3] Hash della password
        const passwordHash = await hashPassword(password);

        // [4] Crea nuovo user
        const newUser: User = {
            email: email.toLowerCase(),
            password_hash: passwordHash,
            username: username,
            current_location: {
                lat: 0,
                lng: 0,
                updated_at: new Date(),
            },
            city: "catania",
            preferences_completed: false,
            total_score: 0,
            tasks_completed: [],
            created_at: new Date(),
            last_login: new Date(),
        };

        // [5] Salva su MongoDB
        const result = await db.collection("users").insertOne(newUser);

        // [6] Genera JWT token
        const token = generateToken(result.insertedId.toString());

        // [7] Ritorna al client
        return res.status(201).json({
            message: "User registered successfully",
            user_id: result.insertedId,
            username: newUser.username,
            email: newUser.email,
            token: token,
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ============================================
// POST /auth/login
// ============================================
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // [1] Validazione
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email and password are required" });
        }

        // [2] Trova user nel database
        const db = getDB();
        const user = await db
            .collection("users")
            .findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // [3] Confronta password
        const isPasswordValid = await comparePassword(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // [4] Aggiorna last_login
        await db
            .collection("users")
            .updateOne(
                { _id: user._id },
                { $set: { last_login: new Date() } }
            );

        // [5] Genera JWT token
        const token = generateToken(user._id.toString());

        // [6] Ritorna al client
        return res.status(200).json({
            message: "Login successful",
            user_id: user._id,
            username: user.username,
            email: user.email,
            token: token,
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ============================================
// GET /auth/me (verifica token)
// ============================================
router.get("/me", async (req: Request, res: Response) => {
    try {
        // [1] Estrai il token dall'header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid token" });
        }

        const token = authHeader.substring(7); // Rimuove "Bearer "

        // [2] Verifica il token
        const decoded = verifyToken(token);

        // [3] Trova l'user
        const db = getDB();
        const user = await db
            .collection("users")
            .findOne({ _id: new ObjectId(decoded.user_id) });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // [4] Ritorna i dati dell'user (senza password!)
        return res.status(200).json({
            user_id: user._id,
            username: user.username,
            email: user.email,
            total_score: user.total_score,
            preferences_completed: user.preferences_completed,
        });
    } catch (error) {
        console.error("Auth error:", error);
        return res.status(401).json({ error: "Invalid token" });
    }
});

export default router;

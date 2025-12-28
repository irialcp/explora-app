import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./db";
import authRoutes from "./routes/auth";
import preferencesRoutes from "./routes/preferences";
import locationRoutes from "./routes/location";
import tasksRoutes from "./routes/tasks";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
    res.json({ message: "eXPlora API v1.0 - Ready!" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

// Auth routes
app.use("/auth", authRoutes);

// API routes
app.use("/api/preferences", preferencesRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/tasks", tasksRoutes);

// Start server
const startServer = async () => {
    try {
        await connectDB();
        console.log("🗄️  Database connected successfully");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

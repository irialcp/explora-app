import { MongoClient, Db } from "mongodb";

let db: Db;

export const connectDB = async (): Promise<Db> => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is not defined in .env");
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("✅ Connected to MongoDB Atlas");

        db = client.db("explora");
        return db;
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        throw error;
    }
};

export const getDB = (): Db => {
    if (!db) {
        throw new Error("Database not connected. Call connectDB() first.");
    }
    return db;
};

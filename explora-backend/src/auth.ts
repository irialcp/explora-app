import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

// Hash della password
export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// Confronta password in plaintext con hash salvato
export const comparePassword = async (
    password: string,
    hash: string
): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

// Genera JWT token
export const generateToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
        { user_id: userId },
        secret,
        { expiresIn: "7d" } // Token scade dopo 7 giorni
    );

    return token;
};

// Verifica JWT token
export const verifyToken = (token: string): { user_id: string } => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }

    try {
        const decoded = jwt.verify(token, secret) as { user_id: string };
        return decoded;
    } catch (error) {
        throw new Error("Invalid or expired token");
    }
};

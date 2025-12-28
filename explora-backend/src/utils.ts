import { EventRarity } from "./types";

export const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const validatePassword = (password: string): boolean => {
    return password.length >= 8;
};

export const validateTop3Favorites = (favorites: string[]): boolean => {
    return favorites.length <= 3 && favorites.length > 0;
};

export const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    const R = 6371000; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) *
        Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export const calculateTaskPoints = (
    basePoints: number,
    isFirst: boolean,
    rarityMultiplier: number,
    isFavoriteCategory: boolean
): number => {
    let points = basePoints;

    if (isFirst) {
        points += 25;
    }

    points = Math.floor(points * rarityMultiplier);

    if (isFavoriteCategory) {
        points += 5;
    }

    return points;
};

export const getRarityMultiplier = (rarity: EventRarity): number => {
    switch (rarity) {
        case EventRarity.COMMON:
            return 1.0;
        case EventRarity.RARE:
            return 1.5;
        case EventRarity.VERY_RARE:
            return 2.0;
        default:
            return 1.0;
    }
};

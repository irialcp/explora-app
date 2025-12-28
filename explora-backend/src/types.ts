import { ObjectId } from "mongodb";

// ENUMS

export enum EventCategory {
    KARAOKE = "karaoke",
    CONCERT = "concert",
    MUSEUM = "museum",
    APERITIF = "aperitif",
    CLUB = "club",
    THEATER = "theater",
    RESTAURANT = "restaurant",
}

export enum EventRarity {
    COMMON = "common",
    RARE = "rare",
    VERY_RARE = "very_rare",
}

export enum DietaryRestriction {
    VEGAN = "vegan",
    VEGETARIAN = "vegetarian",
    GLUTEN_FREE = "gluten_free",
    DAIRY_FREE = "dairy_free",
    NONE = "none",
}

export enum TravelStyle {
    BUDGET = "budget",
    MODERATE = "moderate",
    LUXURY = "luxury",
}

export enum TravelPace {
    SLOW = "slow",
    MEDIUM = "medium",
    FAST = "fast",
}

// INTERFACES

export interface User {
    _id?: ObjectId;
    email?: string;
    password_hash?: string;
    google_id?: string;
    google_email?: string;
    username: string;
    avatar_url?: string;
    current_location: {
        lat: number;
        lng: number;
        updated_at: Date;
    };
    city: "catania";
    preferences_id?: ObjectId;
    preferences_completed: boolean;
    total_score: number;
    tasks_completed: {
        task_id: string;
        completed_at: Date;
        points_earned: number;
        was_first?: boolean;
    }[];
    created_at: Date;
    last_login: Date;
}

export interface UserPreferences {
    _id?: ObjectId;
    user_id: ObjectId;
    profile: {
        age: number;
        bio?: string;
        favorite_activities: string[];
        music_genres: string[];
        dietary_restrictions: string[];
        travel_style: TravelStyle;
        average_daily_budget: number;
    };
    travel_preferences: {
        preferred_climate: "cold" | "warm" | "moderate";
        travel_pace: TravelPace;
        accommodation_type: "hostel" | "airbnb" | "hotel";
        group_size: "solo" | "couple" | "small_group" | "large_group";
    };
    event_preferences: {
        categories: {
            karaoke: number;
            concert: number;
            museum: number;
            aperitif: number;
            club: number;
            theater?: number;
            restaurant?: number;
        };
        top_3_favorites: string[];
        preferred_time: "morning" | "afternoon" | "evening" | "night";
        group_or_solo: "group_activity" | "solo_exploration" | "both";
    };
    share_profile: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Event {
    _id?: ObjectId;
    title: string;
    description: string;
    category: EventCategory;
    location: {
        lat: number;
        lng: number;
        address: string;
        city: "catania";
    };
    event_date: Date;
    duration_minutes: number;
    rarity: EventRarity;
    source: "instagram_post" | "google_search" | "manual_admin" | "user_submitted";
    source_url?: string;
    ai_generated_description?: string;
    created_at: Date;
    active: boolean;
}

export interface DailyTask {
    _id?: ObjectId;
    event_id: ObjectId;
    task_date: Date;
    title: string;
    description: string;
    ai_generated: boolean;
    base_points: number;
    first_completion_bonus: number;
    rarity_multiplier: number;
    completed_by: {
        user_id: ObjectId;
        completed_at: Date;
        points_awarded: number;
    }[];
    first_completer?: ObjectId;
    created_at: Date;
    active: boolean;
}

export interface TaskClaim {
    _id?: ObjectId;
    user_id: ObjectId;
    task_id: ObjectId;
    event_id: ObjectId;
    user_location: {
        lat: number;
        lng: number;
        timestamp: Date;
    };
    event_location: {
        lat: number;
        lng: number;
    };
    distance_meters: number;
    status: "success" | "failed_distance" | "already_completed";
    points_awarded: number;
    was_first?: boolean;
    bonus_applied?: boolean;
    claimed_at: Date;
}

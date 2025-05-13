import { supabase } from './supabaseClient';
import { UserProfile } from './userService';

export interface Story {
    id: string;
    user_id: string;
    media_url: string;
    media_type: 'image' | 'video';
    latitude: number;
    longitude: number;
    created_at: string;
    profiles?: UserProfile; // jointure facultative
}

const TABLE = 'stories';
const EARTH_RADIUS_KM = 6371;

/* --- utilitaire distance haversine -------------------- */
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

/* --- création d’une story --------------------------------------------- */
export const createStory = async (opts: {
    userId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    latitude: number;
    longitude: number;
}): Promise<void> => {
    const { error } = await supabase.from(TABLE).insert({
        user_id: opts.userId,
        media_url: opts.mediaUrl,
        media_type: opts.mediaType,
        latitude: opts.latitude,
        longitude: opts.longitude,
    });
    if (error) throw error;
};

/* --- récupération des stories proches --------------------------------- */
export const fetchNearbyStories = async (
    latitude: number,
    longitude: number,
    radiusKm = 10,
    max = 100,
): Promise<Story[]> => {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*, profiles(id, username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(max);

    if (error) throw error;

    return (data as Story[]).filter(
        (s) => haversine(latitude, longitude, s.latitude, s.longitude) <= radiusKm,
    );
};

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

/* ------------------------------------------------------------------ */
/*  Création de story                                    */
/* ------------------------------------------------------------------ */
export const createStory = async (opts: {
    /** URL publique du média déjà uploadé */
    mediaUrl: string;
    mediaType: 'image' | 'video';
    latitude: number;
    longitude: number;
    /** Id de l'utilisateur ; impose la cohérence RLS */
    userId: string;
}): Promise<void> => {
    const { error } = await supabase.from('stories').insert({
        user_id: opts.userId,
        media_url: opts.mediaUrl,
        media_type: opts.mediaType,
        latitude: opts.latitude,
        longitude: opts.longitude,
    });
    if (error) throw error;
};

/* ------------------------------------------------------------------ */
/*  Stories proches : filtrage *côté serveur* via RPC                  */
/* ------------------------------------------------------------------ */
export const fetchNearbyStories = async (
    latitude: number,
    longitude: number,
    radiusKm = 10,
    max = 100,
): Promise<Story[]> => {
    /* 1. Appel de la fonction Postgres */
    const { data, error } = await supabase.rpc('nearby_stories', {
        p_lat: latitude,
        p_lon: longitude,
        p_radius_km: radiusKm,
    });

    if (error) throw error;
    const stories = (data ?? []) as Story[];
    if (stories.length === 0) return [];

    /* 2. Limite côté client */
    const limited = stories.slice(0, max);

    /* 3. Récupération des profils associés en une requête */
    const userIds = Array.from(new Set(limited.map((s) => s.user_id)));
    const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

    if (profErr) throw profErr;
    const profileMap = new Map(
        (profData ?? []).map((p) => [p.id, p as UserProfile]),
    );

    /* 4. Fusion data + profils */
    return limited.map((s) => ({ ...s, profiles: profileMap.get(s.user_id) }));
};

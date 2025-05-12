import { supabase } from './supabaseClient';

/** Représentation locale de la table `profiles`. */
export interface UserProfile {
    id: string;              // identique à auth.users.id
    username: string | null;
    avatar_url: string | null;
    created_at: string;
}

const TABLE = 'profiles';

/**
 * Récupère le profil d’un utilisateur.
 * @param userId L’UUID de l’utilisateur (auth.users.id)
 * @returns Le profil ou null si inexistant
 */
export const getProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data as UserProfile;
};

/**
 * Crée ou met à jour un profil (clé primaire : id).
 * @param profile Les champs à insérer/upserter (au minimum { id })
 */
export const upsertProfile = async (
    profile: Partial<UserProfile> & { id: string },
): Promise<void> => {
    const { error } = await supabase
        .from(TABLE)
        .upsert(profile, { onConflict: 'id' });

    if (error) throw error;
};

/**
 * Supprime le profil d’un utilisateur.
 * @param userId L’UUID de l’utilisateur
 */
export const deleteProfile = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', userId);

    if (error) throw error;
};

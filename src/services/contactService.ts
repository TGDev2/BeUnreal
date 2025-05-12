import { supabase } from './supabaseClient';
import { UserProfile } from './userService';

const CONTACTS_TABLE = 'contacts';
const PROFILES_TABLE = 'profiles';

/**
 * Recherche des profils par username ou email,
 * en excluant l’utilisateur courant.
 */
export const searchUsers = async (
    query: string,
    currentUserId: string,
): Promise<UserProfile[]> => {
    if (!query.trim()) return [];

    const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select('id, username, avatar_url, email, created_at')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', currentUserId)
        .limit(20);

    if (error) throw error;
    return (data ?? []) as UserProfile[];
};

/**
 * Ajoute un contact (relation user → contact).
 * Ignore l’erreur en cas de doublon (code 23505).
 */
export const addContact = async (
    userId: string,
    contactId: string,
): Promise<void> => {
    const { error } = await supabase
        .from(CONTACTS_TABLE)
        .insert({ user_id: userId, contact_id: contactId });

    if (error && error.code !== '23505') throw error;
};

/**
 * Récupère la liste des UserProfile pour chacun des contacts de l’utilisateur.
 */
export const getContacts = async (userId: string): Promise<UserProfile[]> => {
    // 1) On récupère d’abord tous les contact_id
    const { data: rows, error } = await supabase
        .from(CONTACTS_TABLE)
        .select('contact_id')
        .eq('user_id', userId);

    if (error) throw error;
    const ids = (rows ?? []).map((r) => (r as { contact_id: string }).contact_id);
    if (ids.length === 0) return [];

    // 2) Puis on charge tous les profils correspondants
    const { data, error: err2 } = await supabase
        .from(PROFILES_TABLE)
        .select('id, username, avatar_url, email, created_at')
        .in('id', ids);

    if (err2) throw err2;
    return (data ?? []) as UserProfile[];
};

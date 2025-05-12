import { supabase } from './supabaseClient';

/** Représentation d’un groupe de discussion. */
export interface Group {
    id: string;
    name: string;
    created_at: string;
}

/** Informations sur l’appartenance d’un utilisateur à un groupe. */
export interface GroupMember {
    group_id: string;
    user_id: string;
    role: 'owner' | 'member';
    joined_at: string;
}

const GROUPS_TABLE = 'groups';
const MEMBERS_TABLE = 'group_members';

/**
 * Crée un nouveau groupe et ajoute immédiatement le créateur avec le rôle owner.
 * @returns Le groupe créé.
 */
export const createGroup = async (
    name: string,
    ownerId: string
): Promise<Group> => {
    // 1) Insertion du groupe
    const { data, error } = await supabase
        .from(GROUPS_TABLE)
        .insert({ name })
        .select()
        .single();

    if (error) throw error;
    const group = data as Group;

    // 2) Ajout du créateur dans les membres (role owner)
    const { error: memberErr } = await supabase
        .from(MEMBERS_TABLE)
        .insert({
            group_id: group.id,
            user_id: ownerId,
            role: 'owner',
        });

    // on continue si doublon (code 23505) sinon on remonte l’erreur
    if (memberErr && memberErr.code !== '23505') throw memberErr;

    return group;
};

/**
 * Ajoute plusieurs utilisateurs à un groupe (doublons fusionnés via upsert).
 */
export const addMembers = async (
    groupId: string,
    userIds: string[]
): Promise<void> => {
    const rows = userIds.map((userId) => ({
        group_id: groupId,
        user_id: userId,
        role: 'member' as const,
    }));

    // upsert avec onConflict en string pour ignorer les doublons
    const { error } = await supabase
        .from(MEMBERS_TABLE)
        .upsert(rows, { onConflict: 'group_id,user_id' });

    if (error) throw error;
};

/**
 * Récupère tous les groupes auxquels appartient un utilisateur.
 */
export const getUserGroups = async (userId: string): Promise<Group[]> => {
    const { data, error } = await supabase
        .from(MEMBERS_TABLE)
        .select('groups(id,name,created_at)')
        .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map((row: any) => row.groups as Group);
};

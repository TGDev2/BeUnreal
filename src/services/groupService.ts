import { supabase } from './supabaseClient';
import { UserProfile } from './userService';

/** Représentation d’un groupe de discussion. */
export interface Group {
    id: string;
    name: string;
    created_at: string;
}

const GROUPS_TABLE = 'groups';
const MEMBERS_TABLE = 'group_members';

/* ────────────────────────────────
 * Lecture d’un groupe par id
 * ────────────────────────────────*/
export const getGroup = async (groupId: string): Promise<Group | null> => {
    const { data, error } = await supabase
        .from(GROUPS_TABLE)
        .select('*')
        .eq('id', groupId)
        .single();

    if (error) throw error;
    return data as Group;
};

/* ────────────────────────────────
 * Création atomique + owner
 * ────────────────────────────────*/
export const createGroup = async (name: string): Promise<Group> => {
    const { data: newId, error } = await supabase.rpc('create_group', {
        p_name: name,
    });
    if (error) throw error;

    const { data: groupData, error: fetchErr } = await supabase
        .from(GROUPS_TABLE)
        .select('*')
        .eq('id', newId as string)
        .single();

    if (fetchErr) throw fetchErr;
    return groupData as Group;
};

/* ────────────────────────────────
 * Ajout (upsert) de membres
 * ────────────────────────────────*/
export const addMembers = async (
    groupId: string,
    userIds: string[],
): Promise<void> => {
    const rows = userIds.map((id) => ({
        group_id: groupId,
        user_id: id,
        role: 'member' as const,
    }));
    const { error } = await supabase.from(MEMBERS_TABLE).upsert(rows, {
        onConflict: 'group_id,user_id',
    });
    if (error) throw error;
};

/* ────────────────────────────────
 * Liste des groupes d’un utilisateur
 * ────────────────────────────────*/
export const getUserGroups = async (userId: string) => {
    const { data, error } = await supabase
        .from(MEMBERS_TABLE)
        .select('groups(id,name,created_at)')
        .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map((r: any) => r.groups as Group);
};

/* ────────────────────────────────
 * Membres actuels d’un groupe
 * ────────────────────────────────*/
export const getGroupMembers = async (
    groupId: string,
): Promise<UserProfile[]> => {
    const { data, error } = await supabase
        .from(MEMBERS_TABLE)
        .select('profiles:profiles(id, username, avatar_url, email, created_at)')
        .eq('group_id', groupId);

    if (error) throw error;
    return (data ?? []).map((row: any) => row.profiles as UserProfile);
};

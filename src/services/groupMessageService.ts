import { supabase } from './supabaseClient';

export interface GroupMessage {
    id: string;
    group_id: string;
    sender_id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
}

const TABLE = 'group_messages';

/**
 * Récupère l’historique d’un groupe (ordre chronologique ascendant).
 */
export const fetchGroupMessages = async (
    groupId: string,
    limit = 100,
): Promise<GroupMessage[]> => {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return data as GroupMessage[];
};

/**
 * Envoie un message dans un groupe.
 */
export const sendGroupMessage = async (opts: {
    groupId: string;
    senderId: string;
    content?: string;
    imageUrl?: string;
}): Promise<void> => {
    const { error } = await supabase.from(TABLE).insert({
        group_id: opts.groupId,
        sender_id: opts.senderId,
        content: opts.content ?? null,
        image_url: opts.imageUrl ?? null,
    });
    if (error) throw error;
};

/**
 * Abonnement temps-réel à un groupe.
 * Retourne la fonction de désabonnement.
 */
export const subscribeToGroupMessages = (
    groupId: string,
    onNew: (msg: GroupMessage) => void,
) => {
    const channel = supabase
        .channel(`group:${groupId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: TABLE,
                filter: `group_id=eq.${groupId}`,
            },
            (payload) => onNew(payload.new as GroupMessage),
        )
        .subscribe();

    return () => void supabase.removeChannel(channel);
};

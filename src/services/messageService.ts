import { supabase } from './supabaseClient';

export interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
}

const TABLE = 'messages';

/** Récupère l’historique dans l’ordre chronologique ascendant. */
export const fetchConversation = async (
    uid: string,
    contactId: string,
    limit = 100,
): Promise<Message[]> => {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .or(
            `and(sender_id.eq.${uid},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${uid})`,
        )
        .order('created_at', { ascending: true })
        .limit(limit);
    if (error) throw error;
    return data as Message[];
};

/** Envoie un message texte (image_url facultatif). */
export const sendMessage = async (opts: {
    senderId: string;
    recipientId: string;
    content?: string;
    imageUrl?: string;
}): Promise<void> => {
    const { error } = await supabase.from(TABLE).insert({
        sender_id: opts.senderId,
        recipient_id: opts.recipientId,
        content: opts.content ?? null,
        image_url: opts.imageUrl ?? null,
    });
    if (error) throw error;
};

/**
 * S’abonne en temps réel à la conversation.  
 * Retourne la fonction de désabonnement.
 */
export const subscribeToConversation = (
    uid: string,
    contactId: string,
    onNew: (msg: Message) => void,
) => {
    const channel = supabase
        .channel(`chat:${uid}:${contactId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: TABLE,
                filter: `recipient_id=in.(${uid},${contactId})`,
            },
            payload => {
                onNew(payload.new as Message);
            },
        )
        .subscribe();

    return () => void supabase.removeChannel(channel);
};

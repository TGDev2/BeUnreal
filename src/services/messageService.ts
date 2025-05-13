import { supabase } from './supabaseClient';

/** Représentation d’un message privé. */
export interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
}

const TABLE = 'messages';

/* -------------------------------------------------- */
/* Lecture historique                                 */
/* -------------------------------------------------- */
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

/* -------------------------------------------------- */
/* Envoi d’un message                                 */
/* -------------------------------------------------- */
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

/* -------------------------------------------------- */
/* Souscription temps-réel à UNE conversation         */
/* -------------------------------------------------- */
export const subscribeToConversation = (
    uid: string,
    contactId: string,
    onNew: (msg: Message) => void,
) => {
    /** Nom symétrique et stable pour la chaîne : évite les doublons. */
    const channelName = `chat:${[uid, contactId].sort().join(':')}`;
    const channel = supabase.channel(channelName);

    /* Messages envoyés par l’utilisateur AU contact */
    channel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: TABLE,
            filter: `sender_id=eq.${uid},recipient_id=eq.${contactId}`,
        },
        (payload) => onNew(payload.new as Message),
    );

    /* Messages envoyés PAR le contact à l’utilisateur */
    channel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: TABLE,
            filter: `sender_id=eq.${contactId},recipient_id=eq.${uid}`,
        },
        (payload) => onNew(payload.new as Message),
    );

    channel.subscribe();

    /** Fonction de désabonnement propre : supprime la chaîne côté client. */
    return () => {
        supabase.removeChannel(channel);
    };
};

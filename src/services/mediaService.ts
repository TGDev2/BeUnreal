import { supabase } from './supabaseClient';

/**
 * Construit un Blob depuis une DataURL (base64).
 */
const dataUrlToBlob = (dataUrl: string): { blob: Blob; mime: string; ext: string } => {
    const [meta, base64] = dataUrl.split(',');
    const mimeMatch = /data:(.*);base64/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mime.split('/')[1] ?? 'jpg';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    return { blob: new Blob([bytes], { type: mime }), mime, ext };
};

/**
 * Upload une image et retourne son URL publique.
 * @param dataUrl résultat `photo.dataUrl` du plugin Camera
 */
export const uploadChatImage = async (dataUrl: string): Promise<string> => {
    const { blob, mime, ext } = dataUrlToBlob(dataUrl);

    // Nom de fichier unique
    const filename = `chat/${Date.now()}-${crypto
        .randomUUID()
        .replace(/-/g, '')
        .slice(0, 12)}.${ext}`;

    // Assurez-vous d’avoir créé le bucket “chat-images” (public) côté Supabase.
    const { error } = await supabase.storage
        .from('chat-images')
        .upload(filename, blob, { contentType: mime });

    if (error) throw error;

    const { data } = supabase.storage.from('chat-images').getPublicUrl(filename);
    if (!data?.publicUrl) throw new Error('Unable to retrieve public URL after upload.');

    return data.publicUrl;
};

/**
 * Upload d’une image de story, renvoie l’URL publique.
 */
export const uploadStoryImage = async (dataUrl: string): Promise<string> => {
    const { blob, mime, ext } = dataUrlToBlob(dataUrl);

    const filename = `stories/${Date.now()}-${crypto
        .randomUUID()
        .replace(/-/g, '')
        .slice(0, 12)}.${ext}`;

    const { error } = await supabase.storage
        .from('story-media')
        .upload(filename, blob, { contentType: mime });

    if (error) throw error;

    const { data } = supabase.storage.from('story-media').getPublicUrl(filename);
    if (!data?.publicUrl) throw new Error('Unable to retrieve public URL after upload.');

    return data.publicUrl;
};

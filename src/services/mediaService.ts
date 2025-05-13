import { supabase } from './supabaseClient';

/* ---------- Utilitaires génériques ------------------------------------ */
const randomName = (prefix: string, ext: string) =>
    `${prefix}/${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}.${ext}`;

const uploadFile = async (
    bucket: string,
    pathPrefix: string,
    file: Blob | File,
): Promise<string> => {
    const ext = (file instanceof File && file.name.split('.').pop()) || 'bin';
    const filename = randomName(pathPrefix, ext);

    const { error } = await supabase
        .storage
        .from(bucket)
        .upload(filename, file, { contentType: (file as any).type || 'application/octet-stream' });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    if (!data?.publicUrl) throw new Error('Unable to retrieve public URL after upload.');

    return data.publicUrl;
};

/* ---------- Upload image de chat --------------------------- */
export const uploadChatImage = async (dataUrl: string): Promise<string> => {
    const [meta, base64] = dataUrl.split(',');
    const mime = /data:(.*);base64/.exec(meta)?.[1] ?? 'image/jpeg';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext = mime.split('/')[1] ?? 'jpg';

    return uploadFile('chat-images', 'chat', new File([blob], `tmp.${ext}`, { type: mime }));
};

/* ---------- Upload vidéo de chat ---------------------------- */
export const uploadChatVideo = async (file: File): Promise<string> =>
    uploadFile('chat-media', 'chat/videos', file);

/* ---------- Upload image de story ------------------------- */
export const uploadStoryImage = async (dataUrl: string): Promise<string> => {
    const [meta, base64] = dataUrl.split(',');
    const mime = /data:(.*);base64/.exec(meta)?.[1] ?? 'image/jpeg';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext = mime.split('/')[1] ?? 'jpg';

    return uploadFile('story-media', 'stories', new File([blob], `tmp.${ext}`, { type: mime }));
};

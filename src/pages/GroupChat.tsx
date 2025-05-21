import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    IonAlert,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToast,
    IonToolbar,
} from '@ionic/react';
import {
    cameraOutline,
    sendOutline,
    videocamOutline,
    personAddOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchGroupMessages,
    GroupMessage,
    sendGroupMessage,
    subscribeToGroupMessages,
} from '../services/groupMessageService';
import {
    addMembers,
    getGroup,
    getGroupMembers,
} from '../services/groupService';
import { getContacts } from '../services/contactService';
import { uploadChatImage, uploadChatVideo } from '../services/mediaService';
import { UserProfile } from '../services/userService';
import type { AlertInput } from '@ionic/react';

const MAX_VIDEO_SECONDS = 10;

const GroupChat: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    if (!id) return null;
    const groupId = id;

    const { session } = useAuth();
    const uid = session!.user.id;

    const [groupName, setGroupName] = useState('Group');
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);

    /* ──────────────────────────────── 
     *  Gestion des membres 
     * ────────────────────────────────*/
    const [members,  setMembers]  = useState<UserProfile[]>([]);
    const [contacts, setContacts] = useState<UserProfile[]>([]);
    const [showAdd,  setShowAdd]  = useState(false);

    /* ---------- Chargement initial groupe + historique + membres + contacts ---------- */
    useEffect(() => {
        const load = async () => {
            try {
                const [grp, hist, mems, myContacts] = await Promise.all([
                    getGroup(groupId),
                    fetchGroupMessages(groupId),
                    getGroupMembers(groupId),
                    getContacts(uid),
                ]);
                if (grp) setGroupName(grp.name);
                setMessages(hist);
                setMembers(mems);
                setContacts(myContacts);
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setBusy(false);
            }
        };
        load();
    }, [groupId, uid]);

    /* ---------- Abonnement temps-réel (avec cleanup) ---------- */
    useEffect(() => {
        const unsubscribe = subscribeToGroupMessages(groupId, (msg) =>
            setMessages((prev) => [...prev, msg]),
        );
        return () => unsubscribe();
    }, [groupId]);

    /* ---------- Scroll auto ---------- */
    useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

    /* ---------- Ajout de nouveaux membres ---------- */
    const handleAddMembers = async (e: CustomEvent) => {
        const { role, data } = e.detail as {
            role: string;
            data: { values: Record<string, any> };
        };
        if (role !== 'confirm') return;

        const ids: string[] = Array.isArray(data.values.contacts)
            ? data.values.contacts
            : [];

        if (ids.length === 0) return;

        try {
            setBusy(true);
            await addMembers(groupId, ids);
            const refreshed = await getGroupMembers(groupId);
            setMembers(refreshed);
            setToast(`${ids.length} member(s) added`);
        } catch (err: any) {
            setToast(err.message);
        } finally {
            setBusy(false);
            setShowAdd(false);
        }
    };

    /* ---------- Inputs à cocher : seulement les contacts non-membres ---------- */
    /** 
     * Inputs à cocher : seulement les contacts non-membres 
     * Typés explicitement pour AlertInput afin que `type: 'checkbox'` soit reconnu 
     */
    const selectableContacts = contacts.filter((c) => !members.some((m) => m.id === c.id));
    const alertInputs: AlertInput[] = selectableContacts.map((c) => ({
        name : 'contacts',
        type : 'checkbox' as const,
        label: c.username ?? c.email ?? 'Unnamed user',
        value: c.id,
    }));

    /* ---------- Envoi texte ---------- */
    const sendText = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setText('');
        try {
            await sendGroupMessage({ groupId, senderId: uid, content: trimmed });
        } catch (e: any) {
            setToast(e.message);
        }
    };

    /* ---------- Photo ---------- */
    const sendPhoto = async () => {
        try {
            const photo = await Camera.getPhoto({
                quality: 80,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
            });
            if (!photo.dataUrl) return;

            const url = await uploadChatImage(photo.dataUrl);
            await sendGroupMessage({ groupId, senderId: uid, imageUrl: url });
        } catch (e: any) {
            if (e?.message?.includes('User cancelled')) return;
            setToast(e.message);
        }
    };

    /* ---------- Vidéo (≤ 10 s) ---------- */
    const isVideoWithinLimit = (file: File, maxSec = MAX_VIDEO_SECONDS): Promise<boolean> =>
        new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(video.duration <= maxSec);
            };
            video.src = url;
        });

    const handleVideoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!(await isVideoWithinLimit(file))) {
            setToast(`Video must be ${MAX_VIDEO_SECONDS} seconds or shorter.`);
            e.target.value = '';
            return;
        }

        try {
            const publicUrl = await uploadChatVideo(file);
            await sendGroupMessage({ groupId, senderId: uid, imageUrl: publicUrl });
        } catch (err: any) {
            setToast(err.message);
        } finally {
            e.target.value = ''; // allow re-selecting same file later
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{groupName}</IonTitle>

                    {/* bouton Add */}
                    <IonButton slot="end" onClick={() => setShowAdd(true)}>
                        <IonIcon icon={personAddOutline} />
                    </IonButton>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                {busy && <IonSpinner name="dots" />}

                {!busy && (
                    <>
                        <IonList lines="none">
                            {messages.map((m) => (
                                <IonItem
                                    key={m.id}
                                    className={m.sender_id === uid ? 'ion-text-right' : 'ion-text-left'}
                                >
                                    <IonLabel className="ion-padding-vertical">
                                        {m.image_url && m.image_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                            <video
                                                src={m.image_url}
                                                controls
                                                style={{ maxWidth: '60%', borderRadius: 8 }}
                                            />
                                        ) : m.image_url ? (
                                            <img
                                                src={m.image_url}
                                                alt="sent"
                                                style={{ maxWidth: '60%', borderRadius: 8 }}
                                            />
                                        ) : null}
                                        {m.content && <p>{m.content}</p>}
                                        <small>
                                            {new Date(m.created_at).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </small>
                                    </IonLabel>
                                </IonItem>
                            ))}
                        </IonList>
                        <div ref={bottomRef} />
                    </>
                )}
            </IonContent>

            {/* ---------- Barre de composition ---------- */}
            <IonItem lines="none">
                {/* Photo */}
                <IonButton slot="start" fill="clear" onClick={sendPhoto}>
                    <IonIcon icon={cameraOutline} />
                </IonButton>

                {/* Vidéo */}
                <IonButton slot="start" fill="clear" onClick={() => videoInputRef.current?.click()}>
                    <IonIcon icon={videocamOutline} />
                </IonButton>
                <input
                    ref={videoInputRef}
                    hidden
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={handleVideoSelected}
                />

                {/* Texte */}
                <IonInput
                    value={text}
                    onIonChange={(e) => setText(e.detail.value ?? '')}
                    placeholder="Type a message…"
                    onKeyDown={(e) => e.key === 'Enter' && sendText()}
                />

                {/* Envoi */}
                <IonButton slot="end" onClick={sendText}>
                    <IonIcon icon={sendOutline} />
                </IonButton>
            </IonItem>

            {/* ---------- Alerte « Ajouter des membres » ---------- */}
            <IonAlert
                isOpen={showAdd}
                header="Add members"
                inputs={alertInputs}
                buttons={[
                    { text: 'Cancel', role: 'cancel' },
                    { text: 'Add',    role: 'confirm' },
                ]}
                onDidDismiss={handleAddMembers}
            />

            <IonToast
                isOpen={!!toast}
                message={toast}
                duration={2500}
                onDidDismiss={() => setToast(undefined)}
            />
        </IonPage>
    );
};

export default GroupChat;

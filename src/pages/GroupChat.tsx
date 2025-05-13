import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
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
import { cameraOutline, sendOutline, videocamOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchGroupMessages,
    GroupMessage,
    sendGroupMessage,
    subscribeToGroupMessages,
} from '../services/groupMessageService';
import { getGroup } from '../services/groupService';
import { uploadChatImage, uploadChatVideo } from '../services/mediaService';

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

    /* ---------- Chargement initial groupe + historique ---------- */
    useEffect(() => {
        const load = async () => {
            try {
                const [grp, hist] = await Promise.all([
                    getGroup(groupId),
                    fetchGroupMessages(groupId),
                ]);
                if (grp) setGroupName(grp.name);
                setMessages(hist);
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setBusy(false);
            }
        };
        load();
    }, [groupId]);

    /* ---------- Abonnement temps-réel ---------- */
    useEffect(
        () => subscribeToGroupMessages(groupId, (msg) => setMessages((p) => [...p, msg])),
        [groupId],
    );

    /* ---------- Scroll auto ---------- */
    useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

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

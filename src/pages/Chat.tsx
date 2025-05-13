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
    IonToolbar,
    IonToast,
} from '@ionic/react';
import { cameraOutline, sendOutline, videocamOutline } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchConversation,
    Message,
    sendMessage,
    subscribeToConversation,
} from '../services/messageService';
import { getProfile, UserProfile } from '../services/userService';
import { uploadChatImage, uploadChatVideo } from '../services/mediaService';

const Chat: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    if (!id) return null; // ou un spinner personnalisé
    const contactId = id;
    const { session } = useAuth();
    const uid = session!.user.id;

    const [contact, setContact] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();
    const bottomRef = useRef<HTMLDivElement | null>(null);

    /* Charge profil + historique */
    useEffect(() => {
        const load = async () => {
            try {
                const [prof, hist] = await Promise.all([
                    getProfile(contactId),
                    fetchConversation(uid, contactId),
                ]);
                setContact(prof);
                setMessages(hist);
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setBusy(false);
            }
        };
        load();
    }, [uid, contactId]);

    /* Abonnement temps réel */
    useEffect(() => {
        const unsubscribe = subscribeToConversation(uid, contactId, (msg) =>
            setMessages((prev) => [...prev, msg]),
        );
        return unsubscribe;
    }, [uid, contactId]);

    /* Scroll auto vers le bas */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /** Envoi d'un texte */
    const handleSendText = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setText('');
        try {
            await sendMessage({
                senderId: uid,
                recipientId: contactId,
                content: trimmed,
            });
        } catch (e: any) {
            setToast(e.message);
        }
    };

    /** Capture d'une photo, upload, puis envoi */
    const handleCapturePhoto = async () => {
        try {
            const photo = await Camera.getPhoto({
                quality: 80,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
            });

            if (!photo.dataUrl) return;
            const publicUrl = await uploadChatImage(photo.dataUrl);

            await sendMessage({
                senderId: uid,
                recipientId: contactId,
                imageUrl: publicUrl,
            });
        } catch (e: any) {
            // Annulation silencieuse si l’utilisateur ferme la caméra sans prendre de photo
            if (e?.message?.includes('User cancelled')) return;
            setToast(e.message);
        }
    };

    /* -------------------------- vidéo --------------------------------- */
    const videoInputRef = useRef<HTMLInputElement | null>(null);

    const isVideoWithinLimit = (file: File, maxSec = 10): Promise<boolean> =>
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
            setToast('Video must be 10 seconds or shorter.');
            return;
        }

        try {
            const publicUrl = await uploadChatVideo(file);
            await sendMessage({
                senderId: uid,
                recipientId: contactId,
                imageUrl: publicUrl, // on réutilise le champ existant
            });
        } catch (err: any) {
            setToast(err.message);
        } finally {
            e.target.value = ''; // reset pour pouvoir re-sélectionner le même fichier
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{contact?.username ?? 'Chat'}</IonTitle>
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
                                        {/* Affichage image ou texte */}
                                        {m.image_url && (
                                            <img
                                                src={m.image_url}
                                                alt="sent"
                                                style={{ maxWidth: '60%', borderRadius: 8 }}
                                            />
                                        )}
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

            {/* Barre de composition */}
            <IonItem lines="none">
                {/* Caméra photo */}
                <IonButton slot="start" fill="clear" onClick={handleCapturePhoto}>
                    <IonIcon icon={cameraOutline} />
                </IonButton>

                {/* Caméra vidéo */}
                <IonButton
                    slot="start"
                    fill="clear"
                    onClick={() => videoInputRef.current?.click()}
                >
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

                {/* Saisie texte */}
                <IonInput
                    value={text}
                    onIonChange={(e) => setText(e.detail.value ?? '')}
                    placeholder="Type a message…"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                />

                {/* Envoi texte */}
                <IonButton slot="end" onClick={handleSendText}>
                    <IonIcon icon={sendOutline} />
                </IonButton>
            </IonItem>

            {/* Liste des messages */}
            <IonList lines="none">
                {messages.map((m) => (
                    <IonItem key={m.id} className={m.sender_id === uid ? 'ion-text-right' : 'ion-text-left'}>
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

            <IonToast
                isOpen={!!toast}
                message={toast}
                duration={2500}
                onDidDismiss={() => setToast(undefined)}
            />
        </IonPage>
    );
};

export default Chat;

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
    IonTitle,
    IonToolbar,
    IonSpinner,
    IonToast,
} from '@ionic/react';
import { cameraOutline, sendOutline } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchConversation,
    Message,
    sendMessage,
    subscribeToConversation,
} from '../services/messageService';
import { getProfile, UserProfile } from '../services/userService';
import { uploadChatImage } from '../services/mediaService';

interface MatchParams {
    id: string; // contactId
}

const Chat: React.FC<RouteComponentProps<MatchParams>> = ({ match }) => {
    const contactId = match.params.id;
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
                {/* Bouton caméra */}
                <IonButton slot="start" fill="clear" onClick={handleCapturePhoto}>
                    <IonIcon icon={cameraOutline} />
                </IonButton>

                {/* Saisie texte */}
                <IonInput
                    value={text}
                    onIonChange={(e) => setText(e.detail.value ?? '')}
                    placeholder="Type a message…"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendText();
                    }}
                />

                {/* Envoi texte */}
                <IonButton slot="end" onClick={handleSendText}>
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

export default Chat;

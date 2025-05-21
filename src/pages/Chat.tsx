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
    if (!id) return null;
    const contactId = id;

    const { session } = useAuth();
    const uid = session!.user.id;

    const [contact, setContact] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);

    /* ---------- Initial load ---------- */
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

    /* ---------- Realtime (avec cleanup & déduplication) ---------- */
    useEffect(() => {
        const unsubscribe = subscribeToConversation(uid, contactId, (msg) => {
            setMessages(prev => 
                prev.some(m => m.id === msg.id) ? prev : [...prev, msg]
            );
        });
        return () => unsubscribe();
    }, [uid, contactId]);

    /* ---------- Auto-scroll ---------- */
    useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

    /* ---------- Send text ---------- */
    const handleSendText = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setText('');
        
        // mise à jour locale immédiate 
        const optimistic: Message = { 
            id: `tmp-${Date.now()}`, 
            sender_id: uid, 
            recipient_id: contactId, 
            content: trimmed, 
            image_url: null, 
            created_at: new Date().toISOString(), 
        }; 
        setMessages(prev => [...prev, optimistic]); 
        
        try {
            await sendMessage({ senderId: uid, recipientId: contactId, content: trimmed });
        } catch (e: any) {
            setToast(e.message);
        }
    };

    /* ---------- Send photo ---------- */
    const handleCapturePhoto = async () => {
        try {
            const photo = await Camera.getPhoto({
                quality: 80,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
            });

            if (!photo.dataUrl) return;
            const publicUrl = await uploadChatImage(photo.dataUrl);

            await sendMessage({ senderId: uid, recipientId: contactId, imageUrl: publicUrl });
        } catch (e: any) {
            if (e?.message?.includes('User cancelled')) return;
            setToast(e.message);
        }
    };

    /* ---------- Send video (≤ 10 s) ---------- */
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
            e.target.value = '';
            return;
        }

        try {
            const publicUrl = await uploadChatVideo(file);
            await sendMessage({ senderId: uid, recipientId: contactId, imageUrl: publicUrl });
        } catch (err: any) {
            setToast(err.message);
        } finally {
            e.target.value = '';
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{contact?.username || contact?.email || 'Chat'}</IonTitle>
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
                            {/* ancre pour auto-scroll */}
                            <div ref={bottomRef} />
                        </IonList>
                    </>
                )}
            </IonContent>

            {/* ------- Composer bar (outside scroll area) ------- */}
            <IonItem lines="none">
                <IonButton slot="start" fill="clear" onClick={handleCapturePhoto}>
                    <IonIcon icon={cameraOutline} />
                </IonButton>

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

                <IonInput
                    value={text}
                    onIonChange={(e) => setText(e.detail.value ?? '')}
                    placeholder="Type a message…"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                />

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

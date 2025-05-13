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
import { cameraOutline, sendOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchGroupMessages,
    GroupMessage,
    sendGroupMessage,
    subscribeToGroupMessages,
} from '../services/groupMessageService';
import { getGroup } from '../services/groupService';
import { uploadChatImage } from '../services/mediaService';

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

    /* Charge groupe + historique */
    useEffect(() => {
        const load = async () => {
            try {
                const [grp, hist] = await Promise.all([getGroup(groupId), fetchGroupMessages(groupId)]);
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

    /* Abonnement temps réel */
    useEffect(
        () => subscribeToGroupMessages(groupId, (msg) => setMessages((p) => [...p, msg])),
        [groupId],
    );

    /* Scroll auto */
    useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

    /* Envoi texte */
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

    /* Photo */
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
                                        {m.image_url && (
                                            <img src={m.image_url} alt="sent" style={{ maxWidth: '60%', borderRadius: 8 }} />
                                        )}
                                        {m.content && <p>{m.content}</p>}
                                        <small>
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </small>
                                    </IonLabel>
                                </IonItem>
                            ))}
                        </IonList>
                        <div ref={bottomRef} />
                    </>
                )}
            </IonContent>

            {/* Composer bar */}
            <IonItem lines="none">
                <IonButton slot="start" fill="clear" onClick={sendPhoto}>
                    <IonIcon icon={cameraOutline} />
                </IonButton>
                <IonInput
                    value={text}
                    onIonChange={(e) => setText(e.detail.value ?? '')}
                    placeholder="Type a message…"
                    onKeyDown={(e) => e.key === 'Enter' && sendText()}
                />
                <IonButton slot="end" onClick={sendText}>
                    <IonIcon icon={sendOutline} />
                </IonButton>
            </IonItem>

            <IonToast isOpen={!!toast} message={toast} duration={2500} onDidDismiss={() => setToast(undefined)} />
        </IonPage>
    );
};

export default GroupChat;

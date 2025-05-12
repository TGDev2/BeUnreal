import {
    IonButton,
    IonContent,
    IonHeader,
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
import { useEffect, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchConversation,
    Message,
    sendMessage,
    subscribeToConversation,
} from '../services/messageService';
import { getProfile, UserProfile } from '../services/userService';

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
        const unsubscribe = subscribeToConversation(uid, contactId, msg =>
            setMessages(prev => [...prev, msg]),
        );
        return unsubscribe;
    }, [uid, contactId]);

    /* Scroll auto vers le bas */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
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
                            {messages.map(m => (
                                <IonItem
                                    key={m.id}
                                    className={
                                        m.sender_id === uid ? 'ion-text-right' : 'ion-text-left'
                                    }
                                >
                                    <IonLabel>
                                        <p>{m.content}</p>
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

            {/* zone de saisie fixe en bas */}
            <IonItem lines="none">
                <IonInput
                    value={text}
                    onIonChange={e => setText(e.detail.value ?? '')}
                    placeholder="Type a message…"
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleSend();
                    }}
                />
                <IonButton slot="end" onClick={handleSend}>
                    Send
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

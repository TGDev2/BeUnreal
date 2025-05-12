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
    IonSearchbar,
    IonSpinner,
    IonTitle,
    IonToast,
    IonToolbar,
    IonAvatar,
} from '@ionic/react';
import { personAddOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addContact, searchUsers } from '../services/contactService';
import { UserProfile } from '../services/userService';

const FindFriends: React.FC = () => {
    const { session } = useAuth();
    const uid = session!.user.id;

    const [term, setTerm] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<string>();

    /* Re­cherche (debounce 400 ms). */
    useEffect(() => {
        const t = setTimeout(async () => {
            if (!term.trim()) return setResults([]);
            try {
                setBusy(true);
                const res = await searchUsers(term.trim(), uid);
                setResults(res);
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setBusy(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [term, uid]);

    const handleAdd = async (contactId: string) => {
        try {
            await addContact(uid, contactId);
            setToast('Contact added ✓');
        } catch (e: any) {
            setToast(e.message);
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Find friends</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <IonSearchbar
                    debounce={0}
                    value={term}
                    onIonInput={(e) => setTerm(e.detail.value!)}
                    placeholder="Search by username or email"
                />

                {busy && <IonSpinner name="dots" />}

                {!busy && (
                    <IonList>
                        {results.map((u) => (
                            <IonItem key={u.id}>
                                {u.avatar_url && (
                                    <IonAvatar slot="start">
                                        <img src={u.avatar_url} alt="avatar" />
                                    </IonAvatar>
                                )}
                                <IonLabel>
                                    <h2>{u.username ?? 'Unnamed user'}</h2>
                                    <p>{u.email}</p>
                                </IonLabel>
                                <IonButton
                                    slot="end"
                                    fill="outline"
                                    size="small"
                                    onClick={() => handleAdd(u.id)}
                                >
                                    <IonIcon slot="icon-only" icon={personAddOutline} />
                                </IonButton>
                            </IonItem>
                        ))}
                    </IonList>
                )}

                <IonToast isOpen={!!toast} message={toast} duration={2500} onDidDismiss={() => setToast(undefined)} />
            </IonContent>
        </IonPage>
    );
};

export default FindFriends;

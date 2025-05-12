import {
    IonAvatar,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToolbar,
    IonToast,
} from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';
import { getContacts } from '../services/contactService';
import { useEffect, useState } from 'react';
import { UserProfile } from '../services/userService';

const Contacts: React.FC = () => {
    const { session } = useAuth();
    const uid = session!.user.id;

    const [contacts, setContacts] = useState<UserProfile[]>([]);
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();

    /* Charge la liste des contacts à l’ouverture */
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const data = await getContacts(uid);
                setContacts(data);
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setBusy(false);
            }
        };
        fetchContacts();
    }, [uid]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>My contacts</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {busy && <IonSpinner name="dots" />}

                {!busy && (
                    <IonList>
                        {contacts.map((c) => (
                            <IonItem key={c.id} routerLink={`/chat/${c.id}`}>
                                {c.avatar_url && (
                                    <IonAvatar slot="start">
                                        <img src={c.avatar_url} alt="avatar" />
                                    </IonAvatar>
                                )}
                                <IonLabel>
                                    <h2>{c.username ?? 'Unnamed user'}</h2>
                                    <p>{c.email}</p>
                                </IonLabel>
                            </IonItem>
                        ))}
                        {contacts.length === 0 && (
                            <IonItem lines="none">
                                <IonLabel className="ion-text-center">
                                    You don’t have any contacts yet.
                                </IonLabel>
                            </IonItem>
                        )}
                    </IonList>
                )}

                <IonToast
                    isOpen={!!toast}
                    message={toast}
                    duration={2500}
                    onDidDismiss={() => setToast(undefined)}
                />
            </IonContent>
        </IonPage>
    );
};

export default Contacts;

import { useEffect, useState } from 'react';
import {
    IonAvatar,
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
    IonAlert,
} from '@ionic/react';
import {
    logOutOutline,
    personCircleOutline,
    trashBinOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import {
    getProfile,
    upsertProfile,
    deleteAccount,
    UserProfile,
} from '../services/userService';

const Profile: React.FC = () => {
    const { session, signOut } = useAuth();
    const history = useHistory();
    const uid = session?.user.id;

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [toast, setToast] = useState<string>();
    const [confirmOpen, setConfirmOpen] = useState(false);

    /* ---------- Chargement profil ---------- */
    useEffect(() => {
        const fetch = async () => {
            if (!uid) return;
            try {
                const data = await getProfile(uid);
                setProfile(data);
                setUsername(data?.username ?? '');
                setAvatarUrl(data?.avatar_url ?? '');
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [uid]);

    /* ---------- Mise à jour ---------- */
    const save = async () => {
        if (!uid) return;
        try {
            await upsertProfile({ id: uid, username, avatar_url: avatarUrl });
            const refreshed = await getProfile(uid);
            if (refreshed) setProfile(refreshed);
            setToast('Profile updated');
        } catch (e: any) {
            setToast(e.message);
        }
    };

    /* ---------- Déconnexion ---------- */
    const handleSignOut = async () => {
        // ➊ redirection immédiate – évite l’écran blanc
        history.replace('/login');
        // ➋ déconnexion asynchrone
        try {
            await signOut();
        } catch {
            /* ignoré : l’utilisateur est déjà sur /login */
        }
    };

    /* ---------- Suppression de compte ---------- */
    const handleDelete = async () => {
        if (!uid) return;
        try {
            await deleteAccount(uid);
            history.replace('/login');
            await signOut();
        } catch (e: any) {
            setToast(e.message);
        }
    };

    /* ---------- Rendu ---------- */
    if (loading) {
        return (
            <IonPage>
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>Profile</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonContent className="ion-padding" fullscreen>
                    <IonSpinner name="crescent" />
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Profile</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding" fullscreen>
                <IonList>
                    <IonItem lines="none" className="ion-text-center">
                        {avatarUrl ? (
                            <IonAvatar slot="start">
                                <img src={avatarUrl} alt="Avatar" />
                            </IonAvatar>
                        ) : (
                            <IonIcon icon={personCircleOutline} size="large" />
                        )}
                    </IonItem>

                    <IonItem>
                        <IonLabel position="stacked">Username</IonLabel>
                        <IonInput
                            value={username}
                            onIonChange={(e) => setUsername(e.detail.value ?? '')}
                            placeholder="Choose a display name"
                        />
                    </IonItem>

                    <IonItem>
                        <IonLabel position="stacked">Avatar URL</IonLabel>
                        <IonInput
                            value={avatarUrl}
                            onIonChange={(e) => setAvatarUrl(e.detail.value ?? '')}
                            placeholder="https://example.com/avatar.png"
                        />
                    </IonItem>
                </IonList>

                <IonButton expand="block" onClick={save}>
                    Save
                </IonButton>

                <IonButton
                    expand="block"
                    fill="outline"
                    color="medium"
                    onClick={handleSignOut}
                >
                    <IonIcon icon={logOutOutline} slot="start" />
                    Sign&nbsp;Out
                </IonButton>

                <IonButton
                    expand="block"
                    fill="clear"
                    color="danger"
                    onClick={() => setConfirmOpen(true)}
                >
                    <IonIcon icon={trashBinOutline} slot="start" />
                    Delete&nbsp;Account
                </IonButton>

                {/* Confirmation irréversible */}
                <IonAlert
                    isOpen={confirmOpen}
                    header="Delete account"
                    message="This action permanently deletes your account and all associated data. It cannot be undone."
                    buttons={[
                        { text: 'Cancel', role: 'cancel' },
                        { text: 'Delete', role: 'destructive', handler: handleDelete },
                    ]}
                    onDidDismiss={() => setConfirmOpen(false)}
                />

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

export default Profile;

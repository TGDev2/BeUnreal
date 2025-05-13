import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToast,
    IonToolbar,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createStory, fetchNearbyStories, Story } from '../services/storyService';
import { uploadStoryImage } from '../services/mediaService';

const Stories: React.FC = () => {
    const { session } = useAuth();
    const uid = session!.user.id;

    const [stories, setStories] = useState<Story[]>([]);
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();

    const loadStories = async () => {
        try {
            setBusy(true);
            const {
                coords: { latitude, longitude },
            } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

            setStories(await fetchNearbyStories(latitude, longitude));
        } catch (e: any) {
            setToast(e.message);
        } finally {
            setBusy(false);
        }
    };

    /* Chargement initial */
    useEffect(() => {
        loadStories();
    }, []);

    /* Ajout d’une nouvelle story */
    const addStory = async () => {
        try {
            const {
                coords: { latitude, longitude },
            } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

            const photo = await Camera.getPhoto({
                quality: 85,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
            });
            if (!photo.dataUrl) return;

            const mediaUrl = await uploadStoryImage(photo.dataUrl);

            await createStory({
                userId: uid,
                mediaUrl,
                mediaType: 'image',
                latitude,
                longitude,
            });

            await loadStories();
        } catch (e: any) {
            if (e?.message?.includes('User cancelled')) return;
            setToast(e.message);
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Nearby Stories</IonTitle>
                    <IonButton slot="end" onClick={loadStories} disabled={busy}>
                        Refresh
                    </IonButton>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="ion-padding">
                {busy && <IonSpinner name="dots" />}

                {!busy && stories.length === 0 && (
                    <p>No stories around you yet. Be the first to post!</p>
                )}

                {stories.map((s) => (
                    <IonCard key={s.id}>
                        <img src={s.media_url} alt="story" />
                        <IonCardHeader>
                            <IonCardTitle>{s.profiles?.username ?? 'Anonymous'}</IonCardTitle>
                            <IonCardSubtitle>
                                {new Date(s.created_at).toLocaleString()}
                            </IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent></IonCardContent>
                    </IonCard>
                ))}

                <IonToast
                    isOpen={!!toast}
                    message={toast}
                    duration={2500}
                    onDidDismiss={() => setToast(undefined)}
                />

                <IonFab vertical="bottom" horizontal="end">
                    <IonFabButton onClick={addStory}>
                        <IonIcon icon={add} />
                    </IonFabButton>
                </IonFab>
            </IonContent>
        </IonPage>
    );
};

export default Stories;

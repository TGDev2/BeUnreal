import {
    IonActionSheet,
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
import { add, videocamOutline, imageOutline, refreshOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createStory, fetchNearbyStories, Story } from '../services/storyService';
import { uploadStoryImage, uploadStoryVideo } from '../services/mediaService';

const MAX_VIDEO_SECONDS = 10;

const Stories: React.FC = () => {
    const { session } = useAuth();
    const uid = session!.user.id;

    const [stories, setStories] = useState<Story[]>([]);
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();
    const [sheetOpen, setSheetOpen] = useState(false);

    const videoInputRef = useRef<HTMLInputElement | null>(null);

    /* ---------- Chargement des stories proches ---------- */
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

    useEffect(() => {
        loadStories();
    }, []);

    /* ---------- Ajout photo ---------- */
    const addPhotoStory = async () => {
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

    /* ---------- Utils vidéo ---------- */
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

    /* ---------- Ajout vidéo ---------- */
    const handleVideoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!(await isVideoWithinLimit(file))) {
            setToast(`Video must be ${MAX_VIDEO_SECONDS} s or shorter.`);
            e.target.value = '';
            return;
        }

        try {
            const {
                coords: { latitude, longitude },
            } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

            const mediaUrl = await uploadStoryVideo(file);

            await createStory({
                userId: uid,
                mediaUrl,
                mediaType: 'video',
                latitude,
                longitude,
            });

            await loadStories();
        } catch (err: any) {
            setToast(err.message);
        } finally {
            e.target.value = ''; // reset so same file can be selected again
        }
    };

    /* ---------- Rendu ---------- */
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Nearby Stories</IonTitle>
                    <IonButton slot="end" onClick={loadStories} disabled={busy}>
                        <IonIcon icon={refreshOutline} />
                    </IonButton>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="ion-padding">
                {busy && <IonSpinner name="dots" />}

                {!busy && stories.length === 0 && <p>No stories around you yet. Be the first to post!</p>}

                {stories.map((s) => (
                    <IonCard key={s.id}>
                        {s.media_type === 'video' ? (
                            <video src={s.media_url} controls style={{ width: '100%' }} />
                        ) : (
                            <img src={s.media_url} alt="story" />
                        )}
                        <IonCardHeader>
                            <IonCardTitle>{s.profiles?.username ?? 'Anonymous'}</IonCardTitle>
                            <IonCardSubtitle>{new Date(s.created_at).toLocaleString()}</IonCardSubtitle>
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

                {/* ---------- Action FAB ---------- */}
                <IonFab vertical="bottom" horizontal="end">
                    <IonFabButton onClick={() => setSheetOpen(true)}>
                        <IonIcon icon={add} />
                    </IonFabButton>
                </IonFab>

                {/* ---------- Choix photo / vidéo ---------- */}
                <IonActionSheet
                    isOpen={sheetOpen}
                    onDidDismiss={() => setSheetOpen(false)}
                    buttons={[
                        {
                            text: 'Take Photo',
                            icon: imageOutline,
                            handler: addPhotoStory,
                        },
                        {
                            text: 'Record Video',
                            icon: videocamOutline,
                            handler: () => videoInputRef.current?.click(),
                        },
                        { text: 'Cancel', role: 'cancel' },
                    ]}
                />

                {/* input caché pour capture vidéo */}
                <input
                    ref={videoInputRef}
                    hidden
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={handleVideoSelected}
                />
            </IonContent>
        </IonPage>
    );
};

export default Stories;

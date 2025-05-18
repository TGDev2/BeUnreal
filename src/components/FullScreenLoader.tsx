import { IonContent, IonPage, IonSpinner } from '@ionic/react';

/**
 * Affiche un spinner centré occupant tout l’écran.
 * Utilisé lorsque l’application attend une ressource
 * critique (ex. session Supabase).
 */
const FullScreenLoader: React.FC = () => (
    <IonPage>
        <IonContent
            fullscreen
            className="ion-padding ion-text-center ion-justify-content-center"
            style={{ display: 'flex', alignItems: 'center' }}
        >
            <IonSpinner name="crescent" />
        </IonContent>
    </IonPage>
);

export default FullScreenLoader;

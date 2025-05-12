import { useState } from 'react';
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
    IonToast,
    IonToolbar,
} from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
    const { signIn, signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [toast, setToast] = useState<string>();

    const handle =
        (action: 'in' | 'up') =>
            async () => {
                try {
                    action === 'in'
                        ? await signIn({ email, password })
                        : await signUp({ email, password });
                    if (action === 'up')
                        setToast('Verification email sent – check your inbox.');
                } catch (e: any) {
                    setToast(e.message);
                }
            };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>BeUnreal – Log in</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonList>
                    <IonItem>
                        <IonLabel position="stacked">Email</IonLabel>
                        <IonInput
                            type="email"
                            value={email}
                            onIonChange={(e) => setEmail(e.detail.value!)}
                            autocomplete="email"
                        />
                    </IonItem>
                    <IonItem>
                        <IonLabel position="stacked">Password</IonLabel>
                        <IonInput
                            type="password"
                            value={password}
                            onIonChange={(e) => setPassword(e.detail.value!)}
                            autocomplete="current-password"
                        />
                    </IonItem>
                </IonList>

                <IonButton expand="block" className="ion-margin-top" onClick={handle('in')}>
                    Sign&nbsp;In
                </IonButton>
                <IonButton
                    expand="block"
                    fill="outline"
                    className="ion-margin-top"
                    onClick={handle('up')}
                >
                    Create&nbsp;Account
                </IonButton>

                <IonToast
                    isOpen={!!toast}
                    message={toast}
                    duration={3000}
                    onDidDismiss={() => setToast(undefined)}
                />
            </IonContent>
        </IonPage>
    );
};

export default Login;

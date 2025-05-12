import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
} from '@ionic/react';
import { useHistory } from 'react-router';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>BeUnreal</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonButton expand="block" onClick={() => history.push('/profile')}>
          My Profile
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={() => history.push('/friends')}>
          Find friends
        </IonButton>
        <IonButton expand="block" fill="clear" onClick={() => history.push('/contacts')}>
          My contacts
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Home;

import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>BeUnreal</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonButton expand="block" onClick={() => navigate('/profile')}>
          My Profile
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={() => navigate('/friends')}>
          Find friends
        </IonButton>
        <IonButton expand="block" fill="clear" onClick={() => navigate('/contacts')}>
          My contacts
        </IonButton>
        <IonButton expand="block" fill="solid" color="tertiary" onClick={() => navigate('/groups')}>
          Groups
        </IonButton>
        <IonButton expand="block" fill="solid" color="success" onClick={() => navigate('/stories')}>
          Nearby Stories
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Home;

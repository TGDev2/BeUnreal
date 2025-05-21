import {
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonRouterOutlet,
    IonIcon,
    IonLabel,
} from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';

import {
    locationOutline,
    peopleOutline,
    chatbubbleEllipsesOutline,
    personCircleOutline,
} from 'ionicons/icons';

import Stories from './Stories';
import Contacts from './Contacts';
import Groups from './Groups';
import Profile from './Profile';

/**
 * Conteneur principal : 4 onglets bas.
 * Chaque sous-page reste protégée par <PrivateRoute> au niveau supérieur (App.tsx).
 */
const Tabs: React.FC = () => (
    <IonTabs>
        {/* --- Outlet interne --- */}
        <IonRouterOutlet>
            <Route exact path="/tabs/stories" component={Stories} />
            <Route exact path="/tabs/contacts" component={Contacts} />
            <Route exact path="/tabs/groups" component={Groups} />
            <Route exact path="/tabs/profile" component={Profile} />
            <Route exact path="/tabs" render={() => <Redirect to="/tabs/stories" />} />
        </IonRouterOutlet>

        {/* --- Barre d’onglets --- */}
        <IonTabBar slot="bottom">
            <IonTabButton tab="stories" href="/tabs/stories">
                <IonIcon icon={locationOutline} />
                <IonLabel>Stories</IonLabel>
            </IonTabButton>

            <IonTabButton tab="contacts" href="/tabs/contacts">
                <IonIcon icon={peopleOutline} />
                <IonLabel>Contacts</IonLabel>
            </IonTabButton>

            <IonTabButton tab="groups" href="/tabs/groups">
                <IonIcon icon={chatbubbleEllipsesOutline} />
                <IonLabel>Groups</IonLabel>
            </IonTabButton>

            <IonTabButton tab="profile" href="/tabs/profile">
                <IonIcon icon={personCircleOutline} />
                <IonLabel>Profile</IonLabel>
            </IonTabButton>
        </IonTabBar>
    </IonTabs>
);

export default Tabs;

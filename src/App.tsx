import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import Home from './pages/Home';
import FindFriends from './pages/FindFriends';
import Contacts from './pages/Contacts';
import Chat from './pages/Chat';
import Groups from './pages/Groups';
import GroupChat from './pages/GroupChat';
import Stories from './pages/Stories';
import Tabs from './pages/Tabs';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* --- Public --- */}
          <Route exact path="/login" component={Login} />

          {/* --- Container Tabs (protégé) --- */}
          <Route
            path="/tabs"
            render={() => (
              <PrivateRoute>
                <Tabs />
              </PrivateRoute>
            )}
          />

          {/* --- Routes protégées hors-tabs --- */}
          <Route exact path="/home"         render={() => <PrivateRoute><Home /></PrivateRoute>} />
          <Route exact path="/friends"      render={() => <PrivateRoute><FindFriends /></PrivateRoute>} />
          <Route exact path="/contacts"     render={() => <PrivateRoute><Contacts /></PrivateRoute>} />
          <Route exact path="/chat/:id"     render={() => <PrivateRoute><Chat /></PrivateRoute>} />
          <Route exact path="/groups"       render={() => <PrivateRoute><Groups /></PrivateRoute>} />
          <Route exact path="/group/:id"    render={() => <PrivateRoute><GroupChat /></PrivateRoute>} />
          <Route exact path="/stories"      render={() => <PrivateRoute><Stories /></PrivateRoute>} />

          {/* --- Fallback racine --- */}
          <Route exact path="/" render={() => <Redirect to="/tabs/stories" />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;

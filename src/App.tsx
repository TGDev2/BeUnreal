import { IonApp, IonReactRouter, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { Routes, Route, Navigate } from 'react-router-dom';

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
          {/* Route publique */}
          <Route path="/login" element={<Login />} />

          {/* Container Tabs */}
          <Route
            path="/tabs/*"
            element={
              <PrivateRoute>
                <Tabs />
              </PrivateRoute>
            }
          />

          {/* Routes protégées hors-tabs */}
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/friends" element={<PrivateRoute><FindFriends /></PrivateRoute>} />
          <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
          <Route path="/chat/:id" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
          <Route path="/group/:id" element={<PrivateRoute><GroupChat /></PrivateRoute>} />
          <Route path="/stories" element={<PrivateRoute><Stories /></PrivateRoute>} />

          {/* redirection par défaut */}
          <Route path="/" element={<Navigate to="/tabs/stories" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;

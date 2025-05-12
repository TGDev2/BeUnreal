import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import FindFriends from './pages/FindFriends';
import Contacts from './pages/Contacts';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

/* Ionic core styles */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional utilities */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login" component={Login} />
          <PrivateRoute exact path="/home" component={Home} />
          <PrivateRoute exact path="/profile" component={Profile} />
          <PrivateRoute exact path="/friends" component={FindFriends} />
          <PrivateRoute exact path="/contacts" component={Contacts} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;

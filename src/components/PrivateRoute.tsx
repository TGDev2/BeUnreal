import { ReactNode } from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FullScreenLoader from './FullScreenLoader';

/**
 * Protège les routes en affichant soit l’enfant,
 * soit un loader plein écran, soit une redirection.
 */
interface PrivateRouteProps {
    children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { session, loading } = useAuth();

    if (loading) return <FullScreenLoader />;

    return session ? <>{children}</> : <Redirect to="/login" />;
};

export default PrivateRoute;

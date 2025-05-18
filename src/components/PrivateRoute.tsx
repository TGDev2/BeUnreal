import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
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

    if (loading) {
        // ↳ Phase d’initialisation : on montre un spinner
        return <FullScreenLoader />;
    }

    return session ? <>{children}</> : <Navigate to="/login" replace />;
};

export default PrivateRoute;

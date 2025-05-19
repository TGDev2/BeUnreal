/**
 * Shim pour injecter `withRouter` (supprimé en RRv6)
 * requis par @ionic/react-router v8.x.
 * Tous les autres exports sont relayés depuis
 * le bundle officiel ESM (dist/index.js).
 */

import * as Original from 'react-router-dom/dist/index.js';
import React from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom/dist/index.js';
import type { To } from 'react-router-dom/dist/index.js';

// Ré-export de tout le bundle ESM officiel
export * from 'react-router-dom/dist/index.js';

// Ajout de withRouter
export function withRouter<P>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const Wrapped: React.FC<P> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const params   = useParams();

    return (
      <Component
        {...props}
        history={{
          push: navigate,
          replace: (to: To, state?: any) =>
            navigate(to, { replace: true, state }),
        }}
        location={location}
        match={{ params }}
      />
    );
  };
  Wrapped.displayName =
    `withRouter(${Component.displayName||Component.name||'Component'})`;
  return Wrapped;
}

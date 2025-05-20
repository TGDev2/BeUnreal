/**
 * Shim React-Router-DOM pour @ionic/react-router 8
 *
 * ▸ ré-exporte intégralement la librairie originale
 * ▸ fournit un export default pour les imports par défaut
 * ▸ réimplémente withRouter (compatibilité v5)
 */

import * as RRD from 'react-router-dom/dist/index.js';
import React from 'react';

// ré-export NOMMÉ + export default
export * from 'react-router-dom/dist/index.js';
export default RRD;

/* --- Hooks utilisés -------------------------------------------------- */
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom/dist/index.js';
import type { To } from 'react-router-dom/dist/index.js';

/* --------------------------------------------------------------------- */
/*  Polyfill withRouter                                                  */
/* --------------------------------------------------------------------- */
export function withRouter<P>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  const Wrapped: React.FC<P> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    const history = {
      push: (to: To, state?: any) => navigate(to, { state }),
      replace: (to: To, state?: any) => navigate(to, { replace: true, state }),
      go: (delta: number) => navigate(delta),
      goBack: () => navigate(-1),
      location,                  // ← indispensable à Ionic
      listen: () => () => { },   // stub suffisant
      createHref: (to: To) =>
        typeof to === 'string' ? to : to.pathname ?? '',
    };

    return (
      <Component
        {...(props as P)}
        history={history as any}
        location={location as any}
        match={{ params } as any}
      />
    );
  };

  Wrapped.displayName =
    `withRouter(${Component.displayName || Component.name || 'Component'})`;

  return Wrapped;
}

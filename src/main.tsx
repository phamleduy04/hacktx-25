import { ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Auth0Provider } from '@auth0/auth0-react';
import { ConvexProviderWithAuth0 } from 'convex/react-auth0';
import { Suspense } from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import routes from '~react-pages';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>{useRoutes(routes)}</Suspense>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN as string}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID as string}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <ConvexProviderWithAuth0 client={convex}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexProviderWithAuth0>
    </Auth0Provider>
  </StrictMode>,
);

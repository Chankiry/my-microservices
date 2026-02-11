import Keycloak from 'keycloak-js';

let keycloakInstance: Keycloak | null = null;

export const getKeycloakInstance = (): Keycloak => {
  if (typeof window === 'undefined') {
    throw new Error('Keycloak can only be initialized on the client side');
  }

  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'microservices',
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'next-web-client',
    });
  }

  return keycloakInstance;
};
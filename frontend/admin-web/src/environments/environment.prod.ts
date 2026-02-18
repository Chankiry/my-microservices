export const environment = {
  production: true,
  apiUrl: window.location.origin + '/api',
  keycloak: {
    url: window.location.origin + ':8080',
    realm: 'microservices',
    clientId: 'angular-admin-client',
  },
  testCredentials: {
    user: { email: '', password: '' },
    admin: { email: '', password: '' },
  },
};

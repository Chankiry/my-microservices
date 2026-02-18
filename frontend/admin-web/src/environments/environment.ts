export const environment = {
  production: false,
  // API Gateway URL
  apiUrl: 'http://localhost:8000',
  
  // Keycloak Configuration
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'microservices',
    clientId: 'angular-admin-client',
  },
  
  // Test credentials (for development only)
  testCredentials: {
    user: { email: 'user@example.com', password: 'Password123!' },
    admin: { email: 'admin@example.com', password: 'Admin123!' },
  },
};

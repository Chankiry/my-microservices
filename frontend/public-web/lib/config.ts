// Environment configuration
export const config = {
  // Keycloak Configuration
  keycloak: {
    url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'microservices',
    clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'next-web-client',
  },
  
  // API Gateway URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  // Test credentials (for development only)
  testCredentials: {
    user: { email: 'user@example.com', password: 'Password123!' },
    admin: { email: 'admin@example.com', password: 'Admin123!' },
  },
};

// Validate required configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.keycloak.url) {
    errors.push('NEXT_PUBLIC_KEYCLOAK_URL is not set');
  }
  
  if (!config.keycloak.realm) {
    errors.push('NEXT_PUBLIC_KEYCLOAK_REALM is not set');
  }
  
  if (!config.keycloak.clientId) {
    errors.push('NEXT_PUBLIC_KEYCLOAK_CLIENT_ID is not set');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

import Keycloak from 'keycloak-js';
import { config } from './config';

// Keycloak instance
let keycloakInstance: Keycloak | null = null;

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  realm_access?: {
    roles: string[];
  };
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  session_state: string;
  scope: string;
}

// Get Keycloak instance (client-side only)
export function getKeycloak(): Keycloak {
  if (typeof window === 'undefined') {
    throw new Error('Keycloak can only be used on the client side');
  }

  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: config.keycloak.url,
      realm: config.keycloak.realm,
      clientId: config.keycloak.clientId,
    });
  }

  return keycloakInstance;
}

// Login with username/password (Direct Grant - custom UI)
export async function login(username: string, password: string): Promise<TokenResponse> {
  const tokenUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`;
  
  const body = new URLSearchParams();
  body.set('grant_type', 'password');
  body.set('client_id', config.keycloak.clientId);
  body.set('username', username);
  body.set('password', password);
  body.set('scope', 'openid profile email');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Login failed');
  }

  const data: TokenResponse = await response.json();
  
  // Store tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('id_token', data.id_token);
  
  return data;
}

// Register new user
export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<void> {
  // Get admin token
  const adminTokenUrl = `${config.keycloak.url}/realms/master/protocol/openid-connect/token`;
  
  const adminBody = new URLSearchParams();
  adminBody.set('grant_type', 'password');
  adminBody.set('client_id', 'admin-cli');
  adminBody.set('username', 'admin');
  adminBody.set('password', 'admin123');

  const adminResponse = await fetch(adminTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: adminBody.toString(),
  });
  
  const adminData = await adminResponse.json();
  const adminToken = adminData.access_token;

  // Create user
  const createUserUrl = `${config.keycloak.url}/admin/realms/${config.keycloak.realm}/users`;
  
  const userData = {
    username: email,
    email: email,
    firstName: firstName,
    lastName: lastName,
    enabled: true,
    emailVerified: true,
    credentials: [{
      type: 'password',
      value: password,
      temporary: false,
    }],
  };

  const createResponse = await fetch(createUserUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(userData),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.errorMessage || 'Registration failed');
  }

  // Assign default 'user' role
  await assignRole(adminToken, email, 'user');
}

async function assignRole(adminToken: string, userEmail: string, roleName: string): Promise<void> {
  // Get user ID
  const usersUrl = `${config.keycloak.url}/admin/realms/${config.keycloak.realm}/users?email=${userEmail}`;
  const usersResponse = await fetch(usersUrl, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const users = await usersResponse.json();
  const userId = users[0]?.id;

  if (!userId) return;

  // Get role
  const roleUrl = `${config.keycloak.url}/admin/realms/${config.keycloak.realm}/roles/${roleName}`;
  const roleResponse = await fetch(roleUrl, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const role = await roleResponse.json();

  // Assign role
  const assignUrl = `${config.keycloak.url}/admin/realms/${config.keycloak.realm}/users/${userId}/role-mappings/realm`;
  await fetch(assignUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify([role]),
  });
}

// Logout
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token');
  
  try {
    const logoutUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/logout`;
    
    const body = new URLSearchParams();
    body.set('client_id', config.keycloak.clientId);
    body.set('refresh_token', refreshToken || '');

    await fetch(logoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
  }
}

// Load user info
export async function loadUserInfo(): Promise<UserInfo | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const userInfoUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/userinfo`;
    
    const response = await fetch(userInfoUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Get token
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// Refresh token
export async function refreshToken(): Promise<TokenResponse | null> {
  const refreshTokenValue = localStorage.getItem('refresh_token');
  if (!refreshTokenValue) return null;

  const tokenUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`;
  
  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('client_id', config.keycloak.clientId);
  body.set('refresh_token', refreshTokenValue);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) return null;

  const data: TokenResponse = await response.json();
  
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('id_token', data.id_token);
  
  return data;
}

// Check if authenticated
export async function isAuthenticated(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  
  const userInfo = await loadUserInfo();
  return !!userInfo;
}

// Has role
export function hasRole(userInfo: UserInfo | null, role: string): boolean {
  return userInfo?.realm_access?.roles?.includes(role) || false;
}

// Get user display name
export function getUserDisplayName(userInfo: UserInfo | null): string {
  if (userInfo?.name) return userInfo.name;
  if (userInfo?.given_name && userInfo?.family_name) {
    return `${userInfo.given_name} ${userInfo.family_name}`;
  }
  return userInfo?.preferred_username || userInfo?.email || 'User';
}

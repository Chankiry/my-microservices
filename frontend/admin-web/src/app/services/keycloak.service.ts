import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import Keycloak from 'keycloak-js';

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
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

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private keycloak: Keycloak;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private userInfoSubject = new BehaviorSubject<UserInfo | null>(null);
  
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public userInfo$ = this.userInfoSubject.asObservable();

  constructor(private http: HttpClient) {
    this.keycloak = new Keycloak({
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId,
    });
  }

  // Static initialization for APP_INITIALIZER
  static init(): Promise<boolean> {
    const keycloak = new Keycloak({
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId,
    });

    return new Promise((resolve) => {
      keycloak.init({
        onLoad: 'check-sso',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
        pkceMethod: 'S256',
      }).then((authenticated) => {
        if (authenticated) {
          // Store tokens
          localStorage.setItem('access_token', keycloak.token || '');
          localStorage.setItem('refresh_token', keycloak.refreshToken || '');
        }
        resolve(true);
      }).catch(() => {
        resolve(true); // Resolve anyway to let the app load
      });
    });
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const userInfo = await this.loadUserInfo();
      return !!userInfo;
    } catch {
      return false;
    }
  }

  // Login with username/password (Direct Grant - custom UI)
  login(username: string, password: string): Observable<TokenResponse> {
    const tokenUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
    
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', environment.keycloak.clientId);
    body.set('username', username);
    body.set('password', password);
    body.set('scope', 'openid profile email');

    return this.http.post<TokenResponse>(tokenUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap((response) => {
        this.storeTokens(response);
        this.isAuthenticatedSubject.next(true);
        this.loadUserInfo().then(userInfo => {
          this.userInfoSubject.next(userInfo);
        });
      })
    );
  }

  // Register new user via Keycloak REST API
  async register(email: string, password: string, firstName: string, lastName: string): Promise<void> {
    // First, get admin token
    const adminTokenUrl = `${environment.keycloak.url}/realms/master/protocol/openid-connect/token`;
    
    const adminBody = new URLSearchParams();
    adminBody.set('grant_type', 'password');
    adminBody.set('client_id', 'admin-cli');
    adminBody.set('username', 'admin');
    adminBody.set('password', 'admin123');

    const adminTokenResponse = await fetch(adminTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: adminBody.toString(),
    });
    
    const adminTokenData = await adminTokenResponse.json();
    const adminToken = adminTokenData.access_token;

    // Create user
    const createUserUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;
    
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
    await this.assignRole(adminToken, email, 'user');
  }

  private async assignRole(adminToken: string, userEmail: string, roleName: string): Promise<void> {
    // Get user ID
    const usersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users?email=${userEmail}`;
    const usersResponse = await fetch(usersUrl, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const users = await usersResponse.json();
    const userId = users[0]?.id;

    if (!userId) return;

    // Get role
    const roleUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/roles/${roleName}`;
    const roleResponse = await fetch(roleUrl, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const role = await roleResponse.json();

    // Assign role
    const assignUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users/${userId}/role-mappings/realm`;
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
  logout(): Observable<void> {
    return from(this.performLogout());
  }

  private async performLogout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    
    try {
      const logoutUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/logout`;
      
      const body = new URLSearchParams();
      body.set('client_id', environment.keycloak.clientId);
      body.set('refresh_token', refreshToken || '');

      await fetch(logoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      this.isAuthenticatedSubject.next(false);
      this.userInfoSubject.next(null);
    }
  }

  // Refresh token
  refreshToken(): Observable<TokenResponse> {
    const tokenUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
    const refreshToken = this.getRefreshToken();

    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', environment.keycloak.clientId);
    body.set('refresh_token', refreshToken || '');

    return this.http.post<TokenResponse>(tokenUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap((response) => {
        this.storeTokens(response);
      })
    );
  }

  // Load user info
  async loadUserInfo(): Promise<UserInfo | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const userInfoUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/userinfo`;
      
      const response = await fetch(userInfoUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return null;
      
      const userInfo = await response.json();
      this.userInfoSubject.next(userInfo);
      return userInfo;
    } catch (error) {
      return null;
    }
  }

  // Token management
  private storeTokens(response: TokenResponse): void {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('id_token', response.id_token);
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  // Role checking
  hasRole(role: string): boolean {
    const userInfo = this.userInfoSubject.value;
    return userInfo?.realm_access?.roles?.includes(role) || false;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  // Get user display name
  getUserDisplayName(): string {
    const userInfo = this.userInfoSubject.value;
    if (userInfo?.name) return userInfo.name;
    if (userInfo?.given_name && userInfo?.family_name) {
      return `${userInfo.given_name} ${userInfo.family_name}`;
    }
    return userInfo?.preferred_username || userInfo?.email || 'User';
  }
}

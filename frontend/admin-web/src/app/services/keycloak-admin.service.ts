import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// User interface for Keycloak user
export interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
  createdTimestamp?: number;
  attributes?: any;
}

// Role interface
export interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
}

// User with roles
export interface UserWithRoles extends KeycloakUser {
  roles: string[];
}

// Password update request
export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeycloakAdminService {
  private keycloakUrl = environment.keycloak.url;
  private realm = environment.keycloak.realm;
  private adminToken: string | null = null;
  private adminTokenExpiry: number = 0;

  constructor(private http: HttpClient) {}

  // ==========================================
  // Admin Token Management
  // ==========================================

  private async getAdminToken(): Promise<any> {
    // Check if token is still valid (with 30 second buffer)
    if (this.adminToken && Date.now() < this.adminTokenExpiry - 30000) {
      return this.adminToken;
    }

    const tokenUrl = `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`;
    
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', 'admin-cli');
    body.set('username', 'admin');
    body.set('password', 'admin123');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to get admin token');
    }

    const data = await response.json();
    this.adminToken = data.access_token;
    this.adminTokenExpiry = Date.now() + (data.expires_in * 1000);
    
    return this.adminToken;
  }

  // ==========================================
  // User Management (Admin Operations)
  // ==========================================

  // Get all users
  async getUsers(search?: string): Promise<UserWithRoles[]> {
    const token = await this.getAdminToken();
    let url = `${this.keycloakUrl}/admin/realms/${this.realm}/users?max=100`;
    
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const users: KeycloakUser[] = await response.json();
    
    // Fetch roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = await this.getUserRoles(user.id!);
        return { ...user, roles };
      })
    );

    return usersWithRoles;
  }

  // Get user by ID
  async getUserById(userId: string): Promise<UserWithRoles | null> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const user: KeycloakUser = await response.json();
    const roles = await this.getUserRoles(userId);
    
    return { ...user, roles };
  }

  // Create new user
  async createUser(userData: {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password: string;
    enabled?: boolean;
    emailVerified?: boolean;
    roles?: string[];
  }): Promise<string> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users`;

    const userPayload: any = {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      enabled: userData.enabled !== false,
      emailVerified: userData.emailVerified !== false,
      credentials: [{
        type: 'password',
        value: userData.password,
        temporary: false,
      }],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errorMessage || 'Failed to create user');
    }

    // Get the new user ID from Location header
    const locationHeader = response.headers.get('Location');
    const userId = locationHeader?.split('/').pop();

    // Assign roles if specified
    if (userId && userData.roles && userData.roles.length > 0) {
      for (const role of userData.roles) {
        await this.assignRole(userId, role);
      }
    }

    return userId || '';
  }

  // Update user
  async updateUser(userId: string, userData: Partial<KeycloakUser>): Promise<void> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errorMessage || 'Failed to update user');
    }
  }

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  }

  // Reset user password (admin)
  async resetUserPassword(userId: string, newPassword: string, temporary: boolean = false): Promise<void> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/reset-password`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'password',
        value: newPassword,
        temporary: temporary,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errorMessage || 'Failed to reset password');
    }
  }

  // ==========================================
  // Role Management
  // ==========================================

  // Get all realm roles
  async getRoles(): Promise<KeycloakRole[]> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/roles`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    const roles: KeycloakRole[] = await response.json();
    // Filter out default roles
    return roles.filter(role => !role.name.startsWith('default-') && !role.name.startsWith('offline_access') && role.name !== 'uma_authorization');
  }

  // Get user's roles
  async getUserRoles(userId: string): Promise<string[]> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      return [];
    }

    const roles: KeycloakRole[] = await response.json();
    return roles.map(r => r.name).filter(name => !name.startsWith('default-'));
  }

  // Assign role to user
  async assignRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();
    
    // Get role details
    const roleUrl = `${this.keycloakUrl}/admin/realms/${this.realm}/roles/${roleName}`;
    const roleResponse = await fetch(roleUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!roleResponse.ok) {
      throw new Error(`Role ${roleName} not found`);
    }
    
    const role = await roleResponse.json();

    // Assign role
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify([role]),
    });

    if (!response.ok) {
      throw new Error('Failed to assign role');
    }
  }

  // Remove role from user
  async removeRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();
    
    // Get role details
    const roleUrl = `${this.keycloakUrl}/admin/realms/${this.realm}/roles/${roleName}`;
    const roleResponse = await fetch(roleUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!roleResponse.ok) {
      throw new Error(`Role ${roleName} not found`);
    }
    
    const role = await roleResponse.json();

    // Remove role
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify([role]),
    });

    if (!response.ok) {
      throw new Error('Failed to remove role');
    }
  }

  // ==========================================
  // Self-Service Operations (User's own account)
  // ==========================================

  // Update own profile (uses user's token, not admin)
  async updateOwnProfile(userToken: string, userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<void> {
    const url = `${this.keycloakUrl}/realms/${this.realm}/account`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
  }

  // Change own password (uses user's token)
  async changeOwnPassword(userToken: string, data: PasswordUpdate): Promise<void> {
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('New passwords do not match');
    }

    // Keycloak Account API for password change
    const url = `${this.keycloakUrl}/realms/${this.realm}/account/password`;

    const body = new URLSearchParams();
    body.set('password', data.currentPassword);
    body.set('password-new', data.newPassword);
    body.set('password-confirm', data.confirmPassword);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${userToken}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      if (text.includes('Invalid password')) {
        throw new Error('Current password is incorrect');
      }
      throw new Error('Failed to change password');
    }
  }

  // Get user sessions
  async getUserSessions(userId: string): Promise<any[]> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/sessions`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  // Logout all sessions for user
  async logoutAllSessions(userId: string): Promise<void> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/logout`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to logout sessions');
    }
  }

  // ==========================================
  // Impersonation (Optional - for admin)
  // ==========================================

  async impersonateUser(userId: string): Promise<string | null> {
    const token = await this.getAdminToken();
    const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/impersonation`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.redirect;
  }
}

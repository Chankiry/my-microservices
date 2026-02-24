import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class KeycloakService {
    private readonly logger = new Logger(KeycloakService.name);
    private readonly keycloakUrl: string;
    private readonly realm: string;
    private readonly clientId: string;
    private readonly clientSecret: string;

    constructor(private httpService: HttpService) {
        this.keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
        this.realm = process.env.KEYCLOAK_REALM || 'master';
        this.clientId = process.env.KEYCLOAK_CLIENT_ID || 'auth-service-client';
        this.clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || '';
    }

    getPublicConfig() {
        return {
            url: this.keycloakUrl,
            realm: this.realm,
            clientId: 'next-web-client', // Public client for frontend
        };
    }

    async authenticate(username: string, password: string) {
        const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);
        params.append('username', username);
        params.append('password', password);

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, params.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );

            return response.data;
        } catch (error) {
            this.logger.error('Keycloak authentication failed', error.response?.data);
            throw error;
        }
    }

    async refreshToken(refreshToken: string) {
        const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);
        params.append('refresh_token', refreshToken);

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, params.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );

            return response.data;
        } catch (error) {
            this.logger.error('Keycloak token refresh failed', error.response?.data);
            throw error;
        }
    }

    async logout(token: string) {
        const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;
        
        const params = new URLSearchParams();
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);
        params.append('token', token);

        try {
            await firstValueFrom(
                this.httpService.post(url, params.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );
        } catch (error) {
            this.logger.error('Keycloak logout failed', error.response?.data);
        }
    }

    async validateToken(token: string) {
        const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`;
        
        const params = new URLSearchParams();
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);
        params.append('token', token);

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, params.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );

            return response.data;
        } catch (error) {
            this.logger.error('Keycloak token validation failed', error.response?.data);
            throw error;
        }
    }

    async getUserInfo(token: string) {
        const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }),
            );

            return response.data;
        } catch (error) {
            this.logger.error('Keycloak get user info failed', error.response?.data);
            throw error;
        }
    }

    async createUser(email: string, password: string, name: string): Promise<string> {
        const adminToken = await this.getAdminToken();
        const url = `${this.keycloakUrl}/admin/realms/${this.realm}/users`;

        const userData = {
            username: email,
            email,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || '',
            enabled: true,
            emailVerified: false,
            credentials: [
                {
                    type: 'password',
                    value: password,
                    temporary: false,
                },
            ],
        };

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, userData, {
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            // Extract user ID from Location header
            const locationHeader = response.headers['location'];
            const userId = locationHeader?.split('/').pop();
            
            return userId;
        } catch (error) {
            this.logger.error('Keycloak create user failed', error.response?.data);
            throw error;
        }
    }

    private async getAdminToken(): Promise<string> {
        const url = `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', 'admin-cli');
        params.append('username', 'admin');
        params.append('password', 'admin123');

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, params.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );

            return response.data.access_token;
        } catch (error) {
            this.logger.error('Keycloak admin token retrieval failed', error.response?.data);
            throw error;
        }
    }
}

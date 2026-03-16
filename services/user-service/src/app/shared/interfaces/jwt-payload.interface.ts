export interface JwtPayload {
    sub: string;
    username: string;
    email: string;
    roles: string[];
    realmRoles?: string[];
    clientRoles?: string[];
    iat?: number;
    exp?: number;
}
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

const RESTRICT_CLIENTS_KEY = 'restrict_clients';
export const RestrictClients = (clients: string[]) => SetMetadata(RESTRICT_CLIENTS_KEY, clients);

@Injectable()
export class ServerAuthGuard implements CanActivate {
    constructor(
        private reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const allowedClients = this.reflector.get<string[]>(RESTRICT_CLIENTS_KEY, context.getHandler());
        
        if (!allowedClients || allowedClients.length === 0) {
            throw new UnauthorizedException('No client restrictions specified');
        }

        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid Authorization header');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('Token not provided');
        }

        // const serverAuth = await ServerAuth.findOne({
        //     where: { token, client_name: allowedClients, status_code: StatusCodeEnum.ACTIVE },
        // });

        // if (!serverAuth) {
        //     throw new UnauthorizedException('Invalid token or unauthorized client');
        // }

        // request['serverAuth'] = serverAuth;
        return true;
    }
}
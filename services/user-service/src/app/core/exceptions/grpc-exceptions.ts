// src/common/grpc-exceptions.ts
import { status } from '@grpc/grpc-js';

export class GrpcError extends Error {
    constructor(
        public code: number,
        message: string,
        public details?: any,
    ) {
        super(message);
        this.name = 'GrpcError';
    }
}

// Error mapping utilities
export function mapToGrpcError(error: any): GrpcError {
    if (error.name === 'EntityNotFound') {
        return new GrpcError(status.NOT_FOUND, error.message);
    }
    if (error.name === 'ValidationError') {
        return new GrpcError(status.INVALID_ARGUMENT, error.message);
    }
    if (error.name === 'UnauthorizedException') {
        return new GrpcError(status.UNAUTHENTICATED, error.message);
    }
    if (error.name === 'ForbiddenException') {
        return new GrpcError(status.PERMISSION_DENIED, error.message);
    }
    
    return new GrpcError(status.INTERNAL, 'Internal server error');
}
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: any[];
    timestamp: string;
    path?: string;
}

export class ResponseUtil {
    static success<T>(data: T, message = 'Success'): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        };
    }

    static error(message: string, errors?: any[]): ApiResponse {
        return {
            success: false,
            message,
            errors,
            timestamp: new Date().toISOString(),
        };
    }

    static created<T>(data: T, message = 'Created successfully'): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        };
    }

    static updated<T>(data: T, message = 'Updated successfully'): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        };
    }

    static deleted(message = 'Deleted successfully'): ApiResponse {
        return {
            success: true,
            message,
            timestamp: new Date().toISOString(),
        };
    }

    static notFound(resource: string): ApiResponse {
        return {
            success: false,
            message: `${resource} not found`,
            timestamp: new Date().toISOString(),
        };
    }

    static unauthorized(message = 'Unauthorized'): ApiResponse {
        return {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };
    }

    static forbidden(message = 'Forbidden'): ApiResponse {
        return {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };
    }
}

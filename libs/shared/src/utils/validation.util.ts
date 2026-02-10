import { BadRequestException } from '@nestjs/common';

export class ValidationUtil {
    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    static isValidPhone(phone: string): boolean {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
    }

    static validatePassword(password: string): { valid: boolean; message?: string } {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        if (!/[!@#$%^&*]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
        }
        return { valid: true };
    }

    static validateRequiredFields(data: any, requiredFields: string[]): void {
        const missingFields = requiredFields.filter(field => {
            const value = data[field];
            return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
            throw new BadRequestException(`Missing required fields: ${missingFields.join(', ')}`);
        }
    }

    static sanitizeString(input: string): string {
        return input.trim().replace(/[<>]/g, '');
    }
}

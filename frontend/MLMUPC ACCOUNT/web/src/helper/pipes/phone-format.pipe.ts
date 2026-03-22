import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'phoneFormat',
    standalone: true,
})
export class PhoneFormatPipe implements PipeTransform {
    transform(value: string): string {
        if (!value) return '';

        // Remove all non-digit characters
        const cleaned = value.replace(/\D/g, '');

        // Handle different phone number lengths
        if (cleaned.length === 9) {
            // Format: xxx xxx xxx
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        } else if (cleaned.length === 10) {
            // Format: xxx xxx xxxx
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
        } else if (cleaned.length === 8) {
            // Format: xx xxx xxx (for shorter numbers)
            return cleaned.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3');
        } else if (cleaned.length === 11 && cleaned.startsWith('855')) {
            // Handle Cambodia country code: +855 xx xxx xxx
            return cleaned.replace(
                /(\d{3})(\d{2})(\d{3})(\d{3})/,
                '+$1 $2 $3 $4'
            );
        } else if (cleaned.length >= 6) {
            // For other lengths, try to format as xxx xxx...
            const firstPart = cleaned.substring(0, 3);
            const secondPart = cleaned.substring(3, 6);
            const remaining = cleaned.substring(6);

            if (remaining) {
                return `${firstPart} ${secondPart} ${remaining}`;
            } else {
                return `${firstPart} ${secondPart}`;
            }
        }

        // Return original if can't format properly
        return value;
    }
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'relativeTime',
    standalone: true
})
export class RelativeTimePipe implements PipeTransform {

    transform(value: string | Date): string {
        if (!value) return '';

        const date = new Date(value);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInSeconds = Math.floor(diffInMs / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInMonths = Math.floor(diffInDays / 30);
        const diffInYears = Math.floor(diffInDays / 365);

        // Khmer relative time translations
        if (diffInSeconds < 60) {
            return diffInSeconds <= 1 ? 'ថ្មីៗ' : `${diffInSeconds} វិនាទីមុន`;
        } else if (diffInMinutes < 60) {
            return diffInMinutes === 1 ? '1 នាទីមុន' : `${diffInMinutes} នាទីមុន`;
        } else if (diffInHours < 24) {
            return diffInHours === 1 ? '1 ម៉ោងមុន' : `${diffInHours} ម៉ោងមុន`;
        } else if (diffInDays < 30) {
            return diffInDays === 1 ? '1 ថ្ងៃមុន' : `${diffInDays} ថ្ងៃមុន`;
        } else if (diffInMonths < 12) {
            return diffInMonths === 1 ? '1 ខែមុន' : `${diffInMonths} ខែមុន`;
        } else {
            return diffInYears === 1 ? '1 ឆ្នាំមុន' : `${diffInYears} ឆ្នាំមុន`;
        }
    }
}

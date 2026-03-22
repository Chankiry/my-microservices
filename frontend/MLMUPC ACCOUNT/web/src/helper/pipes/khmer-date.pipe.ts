import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

@Pipe({
    name: 'khmerDate',
    standalone: true
})
export class KhmerDatePipe implements PipeTransform {
    private khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា',
        'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា',
        'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    private khmerNumerals = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    private khmerTimeUnits = {
        second: 'វិនាទី',
        minute: 'នាទី',
        hour: 'ម៉ោង',
        day: 'ថ្ងៃ',
        week: 'សប្តាហ៍',
        month: 'ខែ',
        year: 'ឆ្នាំ'
    };

    transform(value: any, format: string = 'default'): string {
        try {
            const date = this.parseDate(value);
            if (!date || isNaN(date.getTime())) return value;

            if (format === 'relative') {
                return this.getRelativeTime(date);
            }

            if (format === 'full') {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
            }

            switch (format) {
                case 'd MMMM':
                    const day = date.getDate(); // Keep as regular number
                    const month = this.khmerMonths[date.getMonth()];
                    return `${day} ${month}`;

                case 'dd/MM/yyyy':
                    const day1 = date.getDate(); // Keep as regular number
                    const month1 = date.getMonth() + 1; // Keep as regular number
                    const year1 = date.getFullYear(); // Keep as regular number
                    return `${day1}/${month1}/${year1}`;

                case 'dd/MMMM/yyyy':
                    const day2 = date.getDate(); // Keep as regular number
                    const monthName = this.khmerMonths[date.getMonth()];
                    const year2 = date.getFullYear(); // Keep as regular number
                    return `${day2}/${monthName}/${year2}`;

                case 'yyyy/MM/dd':
                    const year3 = date.getFullYear(); // Keep as regular number
                    const month3 = date.getMonth() + 1; // Keep as regular number
                    const day3 = date.getDate(); // Keep as regular number
                    return `${year3}/${month3}/${day3}`;

                case 'full':
                    const day4 = date.getDate(); // Keep as regular number
                    const month4 = this.khmerMonths[date.getMonth()];
                    const year4 = date.getFullYear(); // Keep as regular number
                    return `${day4} ${month4} ${year4}`;

                case 'dd-mmm-yyyy':
                    const day5 = date.getDate(); // Keep as regular number
                    const month5 = this.khmerMonths[date.getMonth()];
                    const year5 = date.getFullYear(); // Keep as regular number
                    return `${day5}-${month5}-${year5}`;

                case 'dd/MMM/yyyy':
                    const day6 = date.getDate(); // Keep as regular number
                    const month6 = this.khmerMonths[date.getMonth()];
                    const year6 = date.getFullYear(); // Keep as regular number
                    return `${day6} ${month6} ${year6}`;

                case 'h/m/dd/MMM/yyyy':
                    const day7 = date.getDate(); // Keep as regular number
                    const month7 = this.khmerMonths[date.getMonth()];
                    const year7 = date.getFullYear(); // Keep as regular number
                    const hour7 = date.getHours(); // Keep as regular number
                    const minute7 = date.getMinutes(); // Keep as regular number
                    return `${day7} ${month7} ${year7} ម៉ោង${hour7} និង${minute7}នាទី`;

                case 'dd/MMM':
                    const day8 = date.getDate(); // Keep as regular number
                    const month8 = this.khmerMonths[date.getMonth()];
                    const year8 = date.getFullYear(); // Keep as regular number
                    return `${day8}-${month8}-${year8}`;

                default:
                    const day20 = date.getDate(); // Keep as regular number
                    const month20 = this.khmerMonths[date.getMonth()];
                    const year20 = date.getFullYear(); // Keep as regular number
                    return `${day20} ${month20} ${year20}`;
            }
        } catch (e) {
            console.error('Date formatting error:', e);
            return value;
        }
    }

    private getRelativeTime(date: Date): string {
        const now = new Date();

        // Convert now and date to Cambodia time (UTC+7)
        const offset = 7 * 60; // Cambodia is UTC+7, offset in minutes

        const nowCambodia = new Date(now.getTime() + offset * 60000);
        const dateCambodia = new Date(date.getTime() + offset * 60000);

        const nowUTC = Date.UTC(
            nowCambodia.getUTCFullYear(),
            nowCambodia.getUTCMonth(),
            nowCambodia.getUTCDate(),
            nowCambodia.getUTCHours(),
            nowCambodia.getUTCMinutes(),
            nowCambodia.getUTCSeconds()
        );

        const dateUTC = Date.UTC(
            dateCambodia.getUTCFullYear(),
            dateCambodia.getUTCMonth(),
            dateCambodia.getUTCDate(),
            dateCambodia.getUTCHours(),
            dateCambodia.getUTCMinutes(),
            dateCambodia.getUTCSeconds()
        );

        const seconds = Math.floor((nowUTC - dateUTC) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                const khmerUnit = this.khmerTimeUnits[unit as keyof typeof this.khmerTimeUnits];
                const khmerNum = this.toKhmerNumerals(interval);
                return `${khmerNum} ${khmerUnit}មុន`;
            }
        }

        return 'ឥឡូវនេះ'; // Just now
    }

    private toKhmerNumerals(num: number): string {
        return num.toString().split('').map(d => this.khmerNumerals[parseInt(d)]).join('');
    }

    private parseDate(value: any): Date | null {
        if (!value) return null;

        if (value instanceof Date) return value;

        if (typeof value === 'number') return new Date(value);

        if (typeof value === 'string') {
            // Check if it's in DD-MM-YYYY format
            const ddmmyyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
            const match = value.match(ddmmyyyyPattern);

            if (match) {
                const [, day, month, year] = match;
                // Create date using YYYY, MM-1, DD format (month is 0-indexed)
                const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return isNaN(parsed.getTime()) ? null : parsed;
            }

            // For other formats, use standard Date parsing
            const parsed = new Date(value);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        return null;
    }

    // Rest of the methods remain the same but are kept for compatibility
    private parseDateStringUTC(dateString: string) {
        const date: number = moment.utc(dateString).date();
        const month: number = moment.utc(dateString).month() + 1;
        const year: number = moment.utc(dateString).year();
        const days: number = moment.utc(dateString).days();
        const hours: number = moment.utc(dateString).hours();
        const minutes: number = moment.utc(dateString).minutes();
        const seconds: number = moment.utc(dateString).seconds();
        return { date, month, year, days, hours, minutes, seconds };
    }

    private parseDateOrString(dateString: string | Date) {
        const date: number = moment(dateString).date();
        const month: number = moment(dateString).month() + 1;
        const year: number = moment(dateString).year();
        const days: number = moment(dateString).days();
        const hours: number = moment(dateString).hours();
        const minutes: number = moment(dateString).minutes();
        const seconds: number = moment(dateString).seconds();
        return { date, month, year, days, hours, minutes, seconds };
    }

    // ... (keeping all the other private methods for compatibility)
    // These methods still use Khmer numerals for the formatDate method
    private formatDate(date: number, month: number, year: number, days: number, hours: number, minutes: number, seconds: number, format: string): string {
        const yearStr: string = year.toString();
        const dateStr: string = date.toString().padStart(2, '0');

        const khmerYear = this.convertToKhmerNumeral(yearStr);
        const khmerMonth = this.convertToKhmerMonth(month);
        const khmerDay = this.convertToKhmerNumeral(dateStr);
        const khmerDayOfWeek = this.convertToKhmerDayOfWeek(days);

        switch (format) {
            case 'd':
            case 'D':
                return `ថ្ងៃទី${khmerDay}`;
            case 'dd':
            case 'DD':
                return `ថ្ងៃ${khmerDayOfWeek} ទី${khmerDay}`;
            case 'm':
            case 'M':
                return `ខែ${khmerMonth}`;
            case 'y':
            case 'Y':
                return `ឆ្នាំ${khmerYear}`;
            case 'd m':
            case 'D M':
                return `ថ្ងៃទី${khmerDay} ខែ${khmerMonth}`;
            case 'dd m':
            case 'DD M':
                return `ថ្ងៃ${khmerDayOfWeek} ទី${khmerDay} ខែ${khmerMonth}`;
            case 'd m y':
            case 'D M Y':
                return `${khmerDay} ${khmerMonth} ${khmerYear}`;
            case 'dd m y':
            case 'DD M Y':
                return `ថ្ងៃ${khmerDayOfWeek} ទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear}`;
            case 'h:m':
            case 'H:m':
                return `${this.convertToKhmerTime(hours, minutes, seconds, false)}`;
            case 'h:m:s':
            case 'H:M:S':
                return `${this.convertToKhmerTime(hours, minutes, seconds, true)}`;
            case 'd m y h:m':
            case 'D M Y H:M':
                return `ថ្ងៃទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear} ${this.convertToKhmerTime(hours, minutes, seconds, false)}`;
            case 'd-m-y-h-m':
            case 'D-M-Y-H-M':
                return `${khmerDay} ${khmerMonth} ${khmerYear} ${this.convertToKhmerTime(hours, minutes, seconds, false)}`;
            case 'd m y h:m:s':
            case 'D M Y H:M:S':
                return `ថ្ងៃទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear} ${this.convertToKhmerTime(hours, minutes, seconds, true)}`;
            case 'dd m y h:m':
            case 'DD M Y H:M':
                return `ថ្ងៃ${khmerDayOfWeek} ទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear} ${this.convertToKhmerTime(hours, minutes, seconds, false)}`;
            case 'dd m y h:m:s':
            case 'DD M Y H:M:S':
                return `ថ្ងៃ${khmerDayOfWeek} ទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear} ${this.convertToKhmerTime(hours, minutes, seconds, true)}`;
            default:
                return `ថ្ងៃទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear}`;
        }
    }

    private convertToKhmerDayOfWeek(dayOfWeek: number): string {
        const khmerDaysOfWeek = [
            'អាទិត្យ',
            'ចន្ទ',
            'អង្គារ',
            'ពុធ',
            'ព្រហស្បតិ៍',
            'សុក្រ',
            'សៅរ៍'
        ];
        return khmerDaysOfWeek[dayOfWeek];
    }

    private convertToKhmerNumeral(number: string): string {
        const khmerNumerals = {
            '0': '០',
            '1': '១',
            '2': '២',
            '3': '៣',
            '4': '៤',
            '5': '៥',
            '6': '៦',
            '7': '៧',
            '8': '៨',
            '9': '៩'
        };
        return number.split('').map(digit => khmerNumerals[digit]).join('');
    }

    private convertToKhmerMonth(month: number): string {
        const khmerMonths = {
            1: 'មករា',
            2: 'កុម្ភះ',
            3: 'មីនា',
            4: 'មេសា',
            5: 'ឧសភា',
            6: 'មិថុនា',
            7: 'កក្កដា',
            8: 'សីហា',
            9: 'កញ្ញា',
            10: 'តុលា',
            11: 'វិច្ឆិកា',
            12: 'ធ្នូ'
        };

        return khmerMonths[month] || '';
    }

    private convertToKhmerTime(hours: number, minutes: number, seconds: number, includeSeconds: boolean = true): string {
        let hoursNum = hours;
        if (hoursNum > 12) {
            hoursNum = hoursNum - 12;
        }
        let khmerHours = this.convertToKhmerNumeral(hoursNum.toString().padStart(2, '0'));
        const khmerMinutes = this.convertToKhmerNumeral(minutes.toString().padStart(2, '0'));
        const khmerSeconds = includeSeconds ? this.convertToKhmerNumeral(seconds.toString().padStart(2, '0')) : '';

        // Define the Khmer time periods
        const khmerPeriods = ['ព្រឹក', 'ល្ងាច'];

        // Adjust the hours to be in the range of 0 to 23
        hours %= 24;

        // Determine the Khmer period based on the hours
        const periodIndex = Math.floor(hours / 12) % 2;

        const khmerPeriod = khmerPeriods[periodIndex];

        khmerHours = khmerHours === '០០' ? '១២' : khmerHours;

        if (includeSeconds) return `${khmerHours}ៈ${khmerMinutes}ៈ${khmerSeconds} ${khmerPeriod}`;

        return `${khmerHours}ៈ${khmerMinutes} ${khmerPeriod}`;
    }
}

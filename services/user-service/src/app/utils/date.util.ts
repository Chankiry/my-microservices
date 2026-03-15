import { Op } from "sequelize";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { DateFormatEnum, TimezoneEnum } from "../enums/datetime.enum";
dayjs.extend(utc);
dayjs.extend(timezone);

export class DateUtil {

    static calculateAge(date: Date): number {
        const now = new Date();
        const age = now.getFullYear() - date.getFullYear();
        return age;
    }

    static toTimezone(date: string | Date, timeZone: TimezoneEnum): Date {
        const localTime = date.toLocaleString("en-US", { timeZone });
        return new Date(localTime);
    }

    static timezoneToUTC(date: string | Date, tz: TimezoneEnum, asDate = true): dayjs.Dayjs | Date {
        const result = dayjs.tz(date, tz).utc();
        return asDate ? result.toDate() : result;
    }

    static combineDateAndTimeToUTC(date: string | Date, time: string, prev_tz = TimezoneEnum.PHNOM_PENH) {
        const format = `${dayjs(date).format(DateFormatEnum.DATE_ONLY)} ${time}`;
        return DateUtil.timezoneToUTC(format, prev_tz);
    }

    static formatDate(date: string | Date, format: DateFormatEnum = DateFormatEnum.DATETIME): string {
        return dayjs(date).format(format);
    }
    
    // FOMART DATE: DD-MM-YYYY H:i:s
    static formatBasicDate(date: Date): string {
        return DateUtil.formatDate(date, DateFormatEnum.DATETIME);
    }

    // FOMART DATE: DD-MM-YYYY
    static formatBasicDateOnly(date: Date): string {
        return DateUtil.formatDate(date, DateFormatEnum.DATE_ONLY);
    }

     // YYYY-MM-DD
    static formatBasicDateISO(date: Date): string {
        return DateUtil.formatDate(date, DateFormatEnum.DATE_ONLY);
    }

    // FOMART DATE: DDMMYYYY
    static formatBasicDateOnlyNoDash(date: Date): string {
        return DateUtil.formatDate(date, DateFormatEnum.DATE_ONLY_NO_DASH);
    }

    // FOMART DATE: YYYY-MM
    static formatBasicYearMonth(date: Date): string {
        return DateUtil.formatDate(date, DateFormatEnum.DATE_YM);
    }

    // FOMART DATE TO TIME: H:i:s
    static formatDateToTime(date: Date): string {
        return DateUtil.formatDate(date, DateFormatEnum.TIME_HMS);
    }

    // FOMART DATE TO TIME: H:i:s
    static formatDateToTimeHHMM(date: Date): string {
        return DateUtil.formatDate(date, DateFormatEnum.TIME_HM);
    }

    static getStartOfDate(datetime: Date) {
        return new Date(datetime.setHours(0, 0, 0, 0));
    }

    static getEndOfDate(datetime: Date) {
        return new Date(datetime.setHours(23, 59, 59, 999));
    }

    static toCambodiaTime(date: Date): Date {
        const timeZone = TimezoneEnum.PHNOM_PENH;
        const localTime = date.toLocaleString("en-US", { timeZone });
        return new Date(localTime);
    }

    static getStartEndDateThisMonth() {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            startDate, endDate
        }
    }

    static getFirstDayOfMonth(date: Date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    static getLastDayOfMonth(date: Date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    static getDiffDate(start_date: Date, end_date: Date) {
        const diffTime = Math.abs(end_date.getTime() - start_date.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    }

    static timeStringToMilliseconds(timeStr: string): number {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return (
            (hours || 0) * 60 * 60 * 1000 +
            (minutes || 0) * 60 * 1000 +
            (seconds || 0) * 1000
        );
    }

    // HOUR::MM
    static formatHourMM(decimalHour: number): string {
        const hours = Math.floor(decimalHour);
        const minutes = Math.round((decimalHour - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

}

export function getStartOfDate(datetime: Date) {
    return new Date(datetime.setHours(0, 0, 0, 0));
}

export function getEndOfDate(datetime: Date) {
    return new Date(datetime.setHours(23, 59, 59, 999));
}

export function toCambodiaTime(date: Date): Date {
    const timeZone = TimezoneEnum.PHNOM_PENH;
    const localTime = date.toLocaleString("en-US", { timeZone });
    return new Date(localTime);
}

export function getStartEndDateThisMonth() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        startDate, endDate
    }
}

export function getFirstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getLastDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getDiffDate(start_date: Date, end_date: Date) {
    const diffTime = Math.abs(end_date.getTime() - start_date.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; 
}

export function timeStringToMilliseconds(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return (
        (hours || 0) * 60 * 60 * 1000 +
        (minutes || 0) * 60 * 1000 +
        (seconds || 0) * 1000
    );
}

// HOUR::MM
export function formatHourMM(decimalHour: number): string {
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export interface DATE_RANGE {
    date: Date
    , key: string
    , date_only: string
    , is_weekend: boolean
    , is_holiday: boolean
}


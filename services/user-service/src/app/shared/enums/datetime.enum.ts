export enum TimezoneEnum {
    PHNOM_PENH = 'Asia/Phnom_Penh'
}

export enum DateFormatEnum {
    /** 2025-08-09 13:45:30 */
    DATETIME = 'YYYY-MM-DD HH:mm:ss',

    /** 2025-08-09 */
    DATE_ONLY = 'YYYY-MM-DD',

    /** 20250809 */
    DATE_ONLY_NO_DASH = 'YYYYMMDD',

    /** 2025-08 */
    DATE_YM = 'YYYY-MM',

    /** 09/08/2025 */
    DATE_DDMMYYYY = 'DD/MM/YYYY',

    /** Aug 9, 2025 */
    DATE_MEDIUM = 'MMM D, YYYY',

    /** Saturday, August 9 2025 */
    DATE_LONG = 'dddd, MMMM D YYYY',

    /** 13:45 */
    TIME_HM = 'HH:mm',

    /** 13:45:30 */
    TIME_HMS = 'HH:mm:ss',

    /** 01:45 PM */
    TIME_HM_12 = 'hh:mm A',

    /** 01:45:30 PM */
    TIME_HMS_12 = 'hh:mm:ss A',

    /** 2025-08-09T13:45:30Z (ISO 8601) */
    ISO = 'YYYY-MM-DDTHH:mm:ss[Z]',
}

export interface HelperConfirmationConfig {
    title?: string;
    message?: string;
    icon?: {
        show?: boolean;
        name?: string;
        color?:
            | 'primary'
            | 'accent'
            | 'warn'
            | 'basic'
            | 'info'
            | 'success'
            | 'warning'
            | 'error';
    };
    actions?: {
        confirm?: {
            show?: boolean;
            label?: string;
            color?: 'primary' | 'accent' | 'warn' | 'success' | 'info';
        };
        cancel?: {
            show?: boolean;
            label?: string;
        };
    };
    dismissible?: boolean;
}

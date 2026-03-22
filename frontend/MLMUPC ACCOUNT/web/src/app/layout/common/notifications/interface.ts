export interface Notification {
    id: number;
    title: string;
    text: string;
    read: boolean;
    assigned_at: Date;
    cv_id: number,
    tracking_id: number,
    creator: {
        id: number;
        name: string;
        avatar: string;
    } | null;
    receiver: {
        id: number;
        name: string;
        avatar: string;
    } | null;
    link?: string
}

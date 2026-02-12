export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  link?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

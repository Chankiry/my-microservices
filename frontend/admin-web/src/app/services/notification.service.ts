import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { Notification, EmailLog, NotificationListResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private api: ApiService) {}

  getNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number }
  ): Observable<NotificationListResponse> {
    let httpParams = new HttpParams();
    if (options?.unreadOnly) httpParams = httpParams.set('unreadOnly', 'true');
    if (options?.page) httpParams = httpParams.set('page', options.page.toString());
    if (options?.limit) httpParams = httpParams.set('limit', options.limit.toString());
    
    return this.api.get(`/api/notifications/${userId}`, httpParams);
  }

  createNotification(data: any): Observable<{ success: boolean; message: string; data: Notification }> {
    return this.api.post('/api/notifications', data);
  }

  markAsRead(id: string): Observable<{ success: boolean; message: string; data: Notification }> {
    return this.api.put(`/api/notifications/${id}/read`, {});
  }

  sendEmail(data: any): Observable<{ success: boolean; message: string; data: EmailLog }> {
    return this.api.post('/api/notifications/email', data);
  }
}

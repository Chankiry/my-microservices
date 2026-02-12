import { Component, OnInit } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { NotificationService } from '../../services/notification.service';
import { Notification, EmailLog } from '../../models';

@Component({
  selector: 'app-notifications',
  templateUrl: './template.html',
  styles: []
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  emailLogs: EmailLog[] = [];
  loading = true;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  filterType = 'all';
  selectedNotification: Notification | null = null;
  Math = Math;

  // Stats
  totalNotifications = 0;
  unreadCount = 0;
  readCount = 0;

  // Email modal
  showEmailModal = false;
  sendingEmail = false;
  emailForm = {
    to: '',
    subject: '',
    body: ''
  };

  constructor(
    private keycloakService: KeycloakService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadNotifications();
    this.loadEmailLogs();
  }

  loadNotifications() {
    this.loading = true;
    const userId = 'admin'; // In real app, get from Keycloak
    
    this.notificationService.getNotifications(userId, {
      unreadOnly: this.filterType === 'unread',
      page: this.currentPage,
      limit: +this.pageSize
    }).subscribe({
      next: (response) => {
        this.notifications = this.filterType === 'read' 
          ? response.data.filter(n => n.isRead)
          : response.data;
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.totalNotifications = response.pagination.total;
        this.unreadCount = response.data.filter(n => !n.isRead).length;
        this.readCount = response.data.filter(n => n.isRead).length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.loading = false;
      }
    });
  }

  loadEmailLogs() {
    // In a real app, you'd have an endpoint to fetch email logs
    // For now, we'll use mock data
    this.emailLogs = [];
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Failed to mark notification as read:', err);
        alert('Failed to mark notification as read');
      }
    });
  }

  markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    Promise.all(unreadNotifications.map(n => 
      this.notificationService.markAsRead(n.id).toPromise()
    )).then(() => {
      this.loadNotifications();
    }).catch((err) => {
      console.error('Failed to mark all notifications as read:', err);
      alert('Failed to mark all notifications as read');
    });
  }

  viewDetails(notification: Notification) {
    this.selectedNotification = notification;
  }

  openEmailModal() {
    this.showEmailModal = true;
    this.emailForm = { to: '', subject: '', body: '' };
  }

  closeEmailModal() {
    this.showEmailModal = false;
  }

  sendEmail() {
    this.sendingEmail = true;
    this.notificationService.sendEmail({
      to: this.emailForm.to,
      subject: this.emailForm.subject,
      body: this.emailForm.body
    }).subscribe({
      next: () => {
        this.sendingEmail = false;
        this.closeEmailModal();
        alert('Email sent successfully!');
        this.loadEmailLogs();
      },
      error: (err) => {
        console.error('Failed to send email:', err);
        this.sendingEmail = false;
        alert('Failed to send email');
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadNotifications();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'sms': return 'bg-green-100 text-green-800';
      case 'push': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getEmailStatusClass(status: string): string {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  logout() {
    this.keycloakService.logout();
  }
}

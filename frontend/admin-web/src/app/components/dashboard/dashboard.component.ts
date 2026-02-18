import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KeycloakService, UserInfo } from '../../services/keycloak.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './template.html',
  styles: [`
    .dashboard-page {
      padding: 32px 0;
    }

    .welcome-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .welcome-content h1 {
      font-size: 28px;
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 4px;
    }

    .welcome-content p {
      color: var(--gray-500);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--gray-200);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon.blue { background: var(--primary-100); color: var(--primary-600); }
    .stat-icon.green { background: #dcfce7; color: var(--success-600); }
    .stat-icon.purple { background: #f3e8ff; color: #9333ea; }
    .stat-icon.orange { background: #fff7ed; color: #ea580c; }

    .stat-value {
      display: block;
      font-size: 28px;
      font-weight: 700;
      color: var(--gray-900);
    }

    .stat-label {
      font-size: 14px;
      color: var(--gray-500);
    }

    .content-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .profile-card {
      grid-column: span 2;
    }

    .profile-content {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .profile-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
    }

    .profile-info {
      flex: 1;
    }

    .profile-info h4 {
      font-size: 18px;
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 4px;
    }

    .profile-info p {
      color: var(--gray-500);
      margin-bottom: 8px;
    }

    .profile-roles {
      display: flex;
      gap: 8px;
    }

    .role-badge {
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      background: var(--primary-100);
      color: var(--primary-700);
    }

    .role-badge.admin {
      background: #f3e8ff;
      color: #9333ea;
    }

    .activity-count {
      font-size: 12px;
      color: var(--gray-400);
    }

    .activity-list {
      display: flex;
      flex-direction: column;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--gray-100);
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .activity-icon.user { background: var(--primary-100); color: var(--primary-600); }
    .activity-icon.order { background: #dcfce7; color: var(--success-600); }
    .activity-icon.payment { background: #f3e8ff; color: #9333ea; }

    .activity-text {
      font-size: 14px;
      color: var(--gray-700);
      margin: 0;
    }

    .activity-time {
      font-size: 12px;
      color: var(--gray-400);
    }

    .quick-links {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .quick-link-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      background: var(--gray-50);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--gray-700);
      transition: all 0.2s;
    }

    .quick-link-item:hover {
      background: var(--primary-50);
      color: var(--primary-600);
    }

    .status-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--gray-50);
      border-radius: var(--radius-md);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-indicator.healthy { background: var(--success-500); }
    .status-indicator.warning { background: var(--warning-500); }
    .status-indicator.error { background: var(--error-500); }

    .status-name {
      flex: 1;
      font-size: 14px;
      color: var(--gray-700);
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-badge.healthy { background: #dcfce7; color: var(--success-600); }
    .status-badge.warning { background: #fef3c7; color: var(--warning-600); }
    .status-badge.error { background: #fee2e2; color: var(--error-600); }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .content-grid {
        grid-template-columns: 1fr;
      }
      .profile-card {
        grid-column: span 1;
      }
    }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .welcome-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      .profile-content {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  userInfo: UserInfo | null = null;
  
  stats = {
    users: 156,
    orders: 483,
    revenue: '12,450',
    notifications: 23
  };

  recentActivity = [
    { type: 'user', text: 'New user registered: john@example.com', time: '2 min ago' },
    { type: 'order', text: 'Order #1234 was placed', time: '15 min ago' },
    { type: 'payment', text: 'Payment received for order #1233', time: '1 hour ago' },
    { type: 'user', text: 'User profile updated: jane@example.com', time: '3 hours ago' },
  ];

  services = [
    { name: 'Keycloak', status: 'healthy' },
    { name: 'Kong Gateway', status: 'healthy' },
    { name: 'User Service', status: 'healthy' },
    { name: 'Order Service', status: 'healthy' },
    { name: 'Payment Service', status: 'warning' },
    { name: 'Notification Service', status: 'healthy' },
  ];

  constructor(private keycloakService: KeycloakService) {}

  async ngOnInit() {
    this.userInfo = await this.keycloakService.loadUserInfo();
  }

  getUserGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  getUserInitials(): string {
    const name = this.userInfo?.name || this.userInfo?.preferred_username || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getUserRoles(): string[] {
    return this.userInfo?.realm_access?.roles?.filter(r => !r.startsWith('default-')) || [];
  }
}

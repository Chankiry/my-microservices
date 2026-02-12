import { Component, OnInit } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { OrderService } from '../../services/order.service';
import { PaymentService } from '../../services/payment.service';
import { NotificationService } from '../../services/notification.service';
import { Order, Payment, Notification } from '../../models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './template.html',
  styles: []
})
export class DashboardComponent implements OnInit {
  userProfile: any = {};
  userRoles: string[] = [];
  
  totalOrders = 0;
  totalPayments = 0;
  pendingOrders = 0;
  totalNotifications = 0;
  
  recentOrders: Order[] = [];
  recentPayments: Payment[] = [];
  recentNotifications: Notification[] = [];
  
  loading = true;

  constructor(
    private keycloakService: KeycloakService,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    if (await this.keycloakService.isLoggedIn()) {
      this.userProfile = await this.keycloakService.loadUserProfile();
      const tokenParsed = this.keycloakService.getKeycloakInstance().tokenParsed;
      this.userRoles = tokenParsed?.realm_access?.roles || [];
      
      this.loadDashboardData();
    }
  }

  loadDashboardData() {
    this.loading = true;
    
    // Load orders
    this.orderService.getOrders({ page: 1, limit: 5 }).subscribe({
      next: (response) => {
        this.recentOrders = response.data;
        this.totalOrders = response.pagination.total;
        this.pendingOrders = response.data.filter(o => o.status === 'pending').length;
      },
      error: (err) => console.error('Failed to load orders:', err)
    });

    // Load payments
    this.paymentService.getPayments({ page: 1, limit: 5 }).subscribe({
      next: (response) => {
        this.recentPayments = response.data;
        this.totalPayments = response.pagination.total;
      },
      error: (err) => console.error('Failed to load payments:', err)
    });

    this.loading = false;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  logout() {
    this.keycloakService.logout();
  }
}

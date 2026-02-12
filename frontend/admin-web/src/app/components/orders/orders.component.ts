import { Component, OnInit } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models';

@Component({
  selector: 'app-orders',
  templateUrl: './template.html',
  styles: []
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  statusFilter = '';
  Math = Math;

  constructor(
    private keycloakService: KeycloakService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.orderService.getOrders({ 
      page: this.currentPage, 
      limit: +this.pageSize 
    }).subscribe({
      next: (response) => {
        this.orders = this.statusFilter 
          ? response.data.filter(o => o.status === this.statusFilter)
          : response.data;
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.loading = false;
      }
    });
  }

  updateStatus(orderId: string, status: string) {
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Failed to update order status:', err);
        alert('Failed to update order status');
      }
    });
  }

  cancelOrder(orderId: string) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    this.orderService.cancelOrder(orderId).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Failed to cancel order:', err);
        alert('Failed to cancel order');
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadOrders();
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  logout() {
    this.keycloakService.logout();
  }
}

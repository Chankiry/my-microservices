import { Component, OnInit } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { PaymentService } from '../../services/payment.service';
import { Payment } from '../../models';

@Component({
  selector: 'app-payments',
  templateUrl: './template.html',
  styles: []
})
export class PaymentsComponent implements OnInit {
  payments: Payment[] = [];
  loading = true;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  statusFilter = '';
  selectedPayment: Payment | null = null;
  Math = Math;

  // Stats
  totalPayments = 0;
  completedPayments = 0;
  pendingPayments = 0;
  failedPayments = 0;

  constructor(
    private keycloakService: KeycloakService,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments() {
    this.loading = true;
    this.paymentService.getPayments({ 
      page: this.currentPage, 
      limit: +this.pageSize 
    }).subscribe({
      next: (response) => {
        this.payments = this.statusFilter 
          ? response.data.filter(p => p.status === this.statusFilter)
          : response.data;
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        
        // Calculate stats
        this.totalPayments = response.pagination.total;
        this.completedPayments = response.data.filter(p => p.status === 'completed').length;
        this.pendingPayments = response.data.filter(p => p.status === 'pending').length;
        this.failedPayments = response.data.filter(p => p.status === 'failed').length;
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load payments:', err);
        this.loading = false;
      }
    });
  }

  viewDetails(payment: Payment) {
    this.selectedPayment = payment;
  }

  refundPayment(paymentId: string) {
    if (!confirm('Are you sure you want to refund this payment?')) return;
    
    this.paymentService.refundPayment(paymentId, { reason: 'Admin refund' }).subscribe({
      next: () => {
        this.loadPayments();
      },
      error: (err) => {
        console.error('Failed to refund payment:', err);
        alert('Failed to refund payment');
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPayments();
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
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  logout() {
    this.keycloakService.logout();
  }
}

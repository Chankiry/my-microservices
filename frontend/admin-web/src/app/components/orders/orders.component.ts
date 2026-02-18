import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="orders-page">
      <div class="container">
        <div class="page-header">
          <div>
            <h1>Order Management</h1>
            <p>Track and manage customer orders</p>
          </div>
          <div class="header-actions">
            <select class="form-control" style="width: 150px;">
              <option>All Status</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>

        <!-- Stats -->
        <div class="order-stats">
          <div class="stat-item">
            <span class="stat-value">{{ orderStats.pending }}</span>
            <span class="stat-label">Pending</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ orderStats.processing }}</span>
            <span class="stat-label">Processing</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ orderStats.completed }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ orderStats.cancelled }}</span>
            <span class="stat-label">Cancelled</span>
          </div>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let order of orders">
                  <td><strong>#{{ order.id }}</strong></td>
                  <td>{{ order.customer }}</td>
                  <td>{{ order.items }} items</td>
                  <td>\${{ order.total }}</td>
                  <td>
                    <span class="badge" [ngClass]="getStatusClass(order.status)">
                      {{ order.status }}
                    </span>
                  </td>
                  <td>{{ order.date }}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .orders-page {
      padding: 32px 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 24px;
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 4px;
    }

    .page-header p {
      color: var(--gray-500);
    }

    .order-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-item {
      background: white;
      padding: 20px;
      border-radius: var(--radius-lg);
      text-align: center;
      border: 1px solid var(--gray-200);
    }

    .stat-value {
      display: block;
      font-size: 32px;
      font-weight: 700;
      color: var(--gray-900);
    }

    .stat-label {
      font-size: 14px;
      color: var(--gray-500);
    }

    .badge.pending { background: #fef3c7; color: #b45309; }
    .badge.processing { background: var(--primary-100); color: var(--primary-700); }
    .badge.completed { background: #dcfce7; color: var(--success-600); }
    .badge.cancelled { background: #fee2e2; color: var(--error-600); }
  `]
})
export class OrdersComponent {
  orderStats = {
    pending: 12,
    processing: 8,
    completed: 156,
    cancelled: 3
  };

  orders = [
    { id: '1001', customer: 'John Doe', items: 3, total: '125.00', status: 'pending', date: '2024-02-15' },
    { id: '1002', customer: 'Jane Smith', items: 1, total: '45.00', status: 'processing', date: '2024-02-15' },
    { id: '1003', customer: 'Bob Wilson', items: 5, total: '289.00', status: 'completed', date: '2024-02-14' },
    { id: '1004', customer: 'Alice Brown', items: 2, total: '78.00', status: 'completed', date: '2024-02-14' },
  ];

  getStatusClass(status: string): string {
    return status;
  }
}

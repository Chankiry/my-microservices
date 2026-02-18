import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template.html',
  styles: [`
    .payments-page {
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

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: white;
      padding: 24px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid var(--gray-200);
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .summary-icon.green { background: #dcfce7; color: var(--success-600); }
    .summary-icon.blue { background: var(--primary-100); color: var(--primary-600); }
    .summary-icon.orange { background: #fff7ed; color: #ea580c; }

    .summary-label {
      display: block;
      font-size: 14px;
      color: var(--gray-500);
    }

    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--gray-900);
    }

    .badge.completed { background: #dcfce7; color: var(--success-600); }
    .badge.pending { background: #fef3c7; color: #b45309; }
    .badge.failed { background: #fee2e2; color: var(--error-600); }
    .badge.refunded { background: var(--gray-100); color: var(--gray-600); }

    code {
      background: var(--gray-100);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  `]
})
export class PaymentsComponent {
  payments = [
    { id: 'TXN001', orderId: '1001', amount: '125.00', method: 'Credit Card', status: 'completed', date: '2024-02-15' },
    { id: 'TXN002', orderId: '1002', amount: '45.00', method: 'PayPal', status: 'pending', date: '2024-02-15' },
    { id: 'TXN003', orderId: '1003', amount: '289.00', method: 'Credit Card', status: 'completed', date: '2024-02-14' },
    { id: 'TXN004', orderId: '1004', amount: '78.00', method: 'Bank Transfer', status: 'completed', date: '2024-02-14' },
  ];

  getStatusClass(status: string): string {
    return status;
  }
}

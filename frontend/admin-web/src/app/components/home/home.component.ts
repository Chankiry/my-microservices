import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './template.html',
  styles: [`
    .home-page {
      overflow-x: hidden;
    }

    /* Hero Section */
    .hero {
      padding: 80px 0;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }

    .hero .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
    }

    .hero-content h1 {
      font-size: 48px;
      font-weight: 700;
      color: var(--gray-900);
      line-height: 1.2;
      margin-bottom: 20px;
    }

    .hero-content p {
      font-size: 18px;
      color: var(--gray-600);
      line-height: 1.7;
      margin-bottom: 32px;
    }

    .hero-actions {
      display: flex;
      gap: 16px;
    }

    .hero-actions .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    /* Dashboard Preview */
    .dashboard-preview {
      background: white;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      border: 1px solid var(--gray-200);
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--gray-50);
      border-bottom: 1px solid var(--gray-200);
    }

    .preview-dots {
      display: flex;
      gap: 6px;
    }

    .preview-dots span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .preview-dots span:nth-child(1) { background: #ef4444; }
    .preview-dots span:nth-child(2) { background: #eab308; }
    .preview-dots span:nth-child(3) { background: #22c55e; }

    .preview-title {
      font-size: 12px;
      color: var(--gray-500);
    }

    .preview-content {
      display: flex;
      min-height: 300px;
    }

    .preview-sidebar {
      width: 60px;
      background: var(--gray-900);
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .preview-nav-item {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: rgba(255,255,255,0.1);
    }

    .preview-nav-item.active {
      background: var(--primary-500);
    }

    .preview-main {
      flex: 1;
      padding: 20px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .preview-card {
      background: var(--gray-100);
      border-radius: var(--radius-md);
    }

    /* Features Section */
    .features {
      padding: 100px 0;
    }

    .section-header {
      text-align: center;
      margin-bottom: 60px;
    }

    .section-header h2 {
      font-size: 36px;
      font-weight: 700;
      color: var(--gray-900);
      margin-bottom: 12px;
    }

    .section-header p {
      font-size: 18px;
      color: var(--gray-500);
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }

    .feature-card {
      background: white;
      padding: 32px;
      border-radius: var(--radius-xl);
      border: 1px solid var(--gray-200);
      transition: all 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }

    .feature-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-lg);
      background: var(--primary-50);
      color: var(--primary-600);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .feature-card h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 12px;
    }

    .feature-card p {
      font-size: 14px;
      color: var(--gray-500);
      line-height: 1.6;
    }

    /* Tech Stack */
    .tech-stack {
      padding: 100px 0;
      background: var(--gray-50);
    }

    .tech-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 24px;
    }

    .tech-item {
      text-align: center;
      padding: 24px;
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
    }

    .tech-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      color: white;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .tech-name {
      display: block;
      font-weight: 600;
      color: var(--gray-900);
      font-size: 14px;
    }

    .tech-desc {
      display: block;
      font-size: 12px;
      color: var(--gray-500);
      margin-top: 4px;
    }

    /* CTA Section */
    .cta {
      padding: 80px 0;
      background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
    }

    .cta-content {
      text-align: center;
      color: white;
    }

    .cta-content h2 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .cta-content p {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 32px;
    }

    .cta .btn-primary {
      background: white;
      color: var(--primary-700);
    }

    .cta .btn-primary:hover {
      background: var(--gray-100);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .hero .container {
        grid-template-columns: 1fr;
      }
      .hero-visual {
        display: none;
      }
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .tech-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 640px) {
      .hero-content h1 {
        font-size: 32px;
      }
      .features-grid {
        grid-template-columns: 1fr;
      }
      .tech-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .hero-actions {
        flex-direction: column;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  isAuthenticated = false;

  technologies = [
    { name: 'Keycloak', desc: 'IAM', color: '#4a5568' },
    { name: 'Kong', desc: 'Gateway', color: '#1a73e8' },
    { name: 'Kafka', desc: 'Messaging', color: '#000000' },
    { name: 'PostgreSQL', desc: 'Database', color: '#336791' },
    { name: 'Redis', desc: 'Cache', color: '#dc382d' },
    { name: 'Docker', desc: 'Container', color: '#2496ed' },
  ];

  constructor(private keycloakService: KeycloakService) {}

  async ngOnInit() {
    this.isAuthenticated = await this.keycloakService.isAuthenticated();
  }
}

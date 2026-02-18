import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './template.html',
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gray-50);
    }

    .login-container {
      display: flex;
      width: 100%;
      max-width: 1000px;
      min-height: 600px;
      background: white;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      margin: 20px;
    }

    .login-branding {
      flex: 1;
      background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
      padding: 60px;
      display: flex;
      align-items: center;
      color: white;
    }

    .branding-content h1 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .branding-content p {
      font-size: 16px;
      opacity: 0.9;
      line-height: 1.6;
      margin-bottom: 40px;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 15px;
    }

    .feature-item svg {
      opacity: 0.8;
    }

    .login-form-container {
      flex: 1;
      padding: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-form {
      width: 100%;
      max-width: 360px;
    }

    .form-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .form-header h2 {
      font-size: 24px;
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 8px;
    }

    .form-header p {
      color: var(--gray-500);
      font-size: 14px;
    }

    .input-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon-wrapper svg {
      position: absolute;
      left: 14px;
      color: var(--gray-400);
    }

    .input-icon-wrapper .form-control {
      padding-left: 44px;
      padding-right: 44px;
    }

    .password-toggle {
      position: absolute;
      right: 14px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--gray-400);
      padding: 0;
      display: flex;
    }

    .password-toggle:hover {
      color: var(--gray-600);
    }

    .btn-block {
      width: 100%;
    }

    .loading-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spinner-sm {
      width: 18px;
      height: 18px;
      animation: spin 0.8s linear infinite;
    }

    .form-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 14px;
      color: var(--gray-500);
    }

    .form-footer a {
      color: var(--primary-600);
      text-decoration: none;
      font-weight: 500;
    }

    .form-footer a:hover {
      text-decoration: underline;
    }

    .test-credentials {
      margin-top: 32px;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .credentials-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--gray-50);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--gray-600);
    }

    .credentials-header svg {
      transition: transform 0.2s;
    }

    .credentials-header svg.rotated {
      transform: rotate(180deg);
    }

    .credentials-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .credential-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 13px;
      color: var(--gray-700);
      transition: all 0.2s;
    }

    .credential-btn:hover {
      background: var(--gray-100);
      border-color: var(--gray-300);
    }

    .role-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-badge.user {
      background: var(--primary-100);
      color: var(--primary-700);
    }

    .role-badge.admin {
      background: #f3e8ff;
      color: #9333ea;
    }

    @media (max-width: 768px) {
      .login-container {
        flex-direction: column;
      }
      .login-branding {
        padding: 40px;
      }
      .login-form-container {
        padding: 40px;
      }
      .branding-content h1 {
        font-size: 28px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  isLoading = false;
  showPassword = false;
  showCredentials = false;
  returnUrl = '/dashboard';

  constructor(
    private keycloakService: KeycloakService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.error = '';
    this.isLoading = true;

    this.keycloakService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate([this.returnUrl]);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.error?.error_description) {
          this.error = err.error.error_description;
        } else if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Invalid email or password. Please try again.';
        }
      }
    });
  }

  fillTestUser() {
    this.email = 'user@example.com';
    this.password = 'Password123!';
  }

  fillTestAdmin() {
    this.email = 'admin@example.com';
    this.password = 'Admin123!';
  }
}

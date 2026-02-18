import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './template.html',
  styles: [`
    .register-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gray-50);
    }

    .register-container {
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

    .register-branding {
      flex: 1;
      background: linear-gradient(135deg, #059669, #047857);
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

    .register-form-container {
      flex: 1;
      padding: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
    }

    .register-form {
      width: 100%;
      max-width: 380px;
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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

    .password-strength {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .strength-bar {
      flex: 1;
      height: 4px;
      background: var(--gray-200);
      border-radius: 2px;
      overflow: hidden;
    }

    .strength-fill {
      height: 100%;
      transition: width 0.3s, background 0.3s;
    }

    .strength-fill.weak { background: var(--error-500); }
    .strength-fill.medium { background: var(--warning-500); }
    .strength-fill.strong { background: var(--success-500); }

    .strength-text {
      font-size: 12px;
      color: var(--gray-500);
      min-width: 50px;
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

    @media (max-width: 768px) {
      .register-container {
        flex-direction: column;
      }
      .register-branding {
        padding: 40px;
      }
      .register-form-container {
        padding: 40px;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private keycloakService: KeycloakService,
    private router: Router
  ) {}

  get passwordStrength(): number {
    let strength = 0;
    if (this.password.length >= 8) strength += 25;
    if (/[a-z]/.test(this.password)) strength += 25;
    if (/[A-Z]/.test(this.password)) strength += 25;
    if (/[0-9]/.test(this.password)) strength += 25;
    return strength;
  }

  get strengthClass(): string {
    if (this.passwordStrength <= 25) return 'weak';
    if (this.passwordStrength <= 75) return 'medium';
    return 'strong';
  }

  get strengthText(): string {
    if (this.passwordStrength <= 25) return 'Weak';
    if (this.passwordStrength <= 75) return 'Medium';
    return 'Strong';
  }

  async onSubmit() {
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters';
      return;
    }

    this.error = '';
    this.success = '';
    this.isLoading = true;

    try {
      await this.keycloakService.register(this.email, this.password, this.firstName, this.lastName);
      this.success = 'Account created successfully! You can now sign in.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (err: any) {
      this.error = err.message || 'Registration failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}

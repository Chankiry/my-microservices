import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService, UserInfo } from '../../services/keycloak.service';
import { KeycloakAdminService } from '../../services/keycloak-admin.service';

// Helper function to get token (will be added)
declare function getToken(): string | null;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template.html',
  styles: [`
    .profile-page {
      padding: 32px 0;
    }

    .page-header {
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

    .profile-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    .profile-info-card {
      grid-column: span 2;
    }

    .profile-avatar-section {
      display: flex;
      align-items: center;
      gap: 24px;
      padding-bottom: 24px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--gray-200);
    }

    .avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 600;
    }

    .avatar-info h4 {
      font-size: 20px;
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 4px;
    }

    .avatar-info p {
      color: var(--gray-500);
      margin-bottom: 8px;
    }

    .user-roles {
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

    .info-list {
      display: flex;
      flex-direction: column;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--gray-100);
    }

    .info-label {
      color: var(--gray-500);
      font-size: 14px;
    }

    .info-value {
      color: var(--gray-900);
      font-weight: 500;
      font-size: 14px;
    }

    .info-value.code {
      font-family: monospace;
      font-size: 12px;
    }

    .info-value.verified {
      color: var(--success-600);
    }

    .info-value.not-verified {
      color: var(--warning-600);
    }

    .action-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .action-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 16px;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .action-item:hover {
      background: var(--gray-100);
      border-color: var(--gray-300);
    }

    .action-item.danger {
      color: var(--error-600);
    }

    .action-item.danger:hover {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .action-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--gray-200);
    }

    .action-content {
      flex: 1;
    }

    .action-title {
      display: block;
      font-weight: 500;
      color: var(--gray-900);
      font-size: 14px;
    }

    .action-desc {
      font-size: 12px;
      color: var(--gray-500);
    }

    .chevron {
      color: var(--gray-400);
    }

    .session-card {
      grid-column: span 2;
    }

    .token-display {
      background: var(--gray-900);
      padding: 16px;
      border-radius: var(--radius-md);
      overflow-x: auto;
    }

    .token-display code {
      color: #22c55e;
      font-size: 12px;
      white-space: nowrap;
    }

    .session-note {
      margin-top: 12px;
      font-size: 12px;
      color: var(--gray-500);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal {
      background: white;
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      animation: modalIn 0.2s ease;
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--gray-200);
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--gray-900);
    }

    .modal-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--gray-400);
      padding: 0;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--gray-200);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-hint {
      font-size: 12px;
      color: var(--gray-500);
      margin-top: 4px;
    }

    .form-error {
      color: var(--error-500);
      font-size: 12px;
      margin-top: 4px;
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

    .password-requirements {
      background: var(--gray-50);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-top: 16px;
    }

    .requirements-title {
      font-size: 12px;
      font-weight: 500;
      color: var(--gray-700);
      margin-bottom: 8px;
    }

    .password-requirements ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .password-requirements li {
      font-size: 12px;
      color: var(--gray-500);
      padding: 2px 0;
      padding-left: 20px;
      position: relative;
    }

    .password-requirements li::before {
      content: '○';
      position: absolute;
      left: 0;
    }

    .password-requirements li.met {
      color: var(--success-600);
    }

    .password-requirements li.met::before {
      content: '●';
    }

    @media (max-width: 768px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
      .session-card, .profile-info-card {
        grid-column: span 1;
      }
      .profile-avatar-section {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  userInfo: UserInfo | null = null;
  tokenPreview = '';

  // Modal states
  showEditModal = false;
  showPasswordModal = false;
  isSaving = false;
  modalError = '';
  modalSuccess = '';

  // Edit form
  editForm = {
    firstName: '',
    lastName: '',
    email: '',
  };

  // Password form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  constructor(
    private keycloakService: KeycloakService,
    private adminService: KeycloakAdminService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.userInfo = await this.keycloakService.loadUserInfo();
    const token = this.keycloakService.getToken();
    if (token) {
      this.tokenPreview = token.substring(0, 80) + '...';
    }
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

  // Edit Profile
  openEditProfile() {
    this.editForm = {
      firstName: this.userInfo?.given_name || '',
      lastName: this.userInfo?.family_name || '',
      email: this.userInfo?.email || '',
    };
    this.modalError = '';
    this.modalSuccess = '';
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.modalError = '';
    this.modalSuccess = '';
  }

  async saveProfile() {
    this.modalError = '';
    this.isSaving = true;

    try {
      const token = this.keycloakService.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      // Get user ID from userInfo
      const userId = this.userInfo?.sub;
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Update user profile via admin API
      await this.adminService.updateUser(userId, {
        firstName: this.editForm.firstName,
        lastName: this.editForm.lastName,
      });

      // Reload user info
      this.userInfo = await this.keycloakService.loadUserInfo();
      this.modalSuccess = 'Profile updated successfully!';
      setTimeout(() => this.closeEditModal(), 1500);
    } catch (error: any) {
      this.modalError = error.message || 'Failed to update profile';
    }

    this.isSaving = false;
  }

  // Change Password
  openChangePassword() {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    this.modalError = '';
    this.modalSuccess = '';
    this.showPasswordModal = true;
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.modalError = '';
    this.modalSuccess = '';
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.passwordForm.newPassword);
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordForm.newPassword);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.passwordForm.newPassword);
  }

  get passwordStrength(): number {
    let strength = 0;
    if (this.passwordForm.newPassword.length >= 8) strength += 25;
    if (/[a-z]/.test(this.passwordForm.newPassword)) strength += 25;
    if (/[A-Z]/.test(this.passwordForm.newPassword)) strength += 25;
    if (/[0-9]/.test(this.passwordForm.newPassword)) strength += 25;
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

  async changePassword() {
    this.modalError = '';

    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.modalError = 'Please fill in all fields';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.modalError = 'New passwords do not match';
      return;
    }

    if (this.passwordForm.newPassword.length < 8) {
      this.modalError = 'Password must be at least 8 characters';
      return;
    }

    this.isSaving = true;

    try {
      const token = this.keycloakService.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      await this.adminService.changeOwnPassword(token, {
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword,
        confirmPassword: this.passwordForm.confirmPassword,
      });

      this.modalSuccess = 'Password changed successfully!';
      setTimeout(() => this.closePasswordModal(), 1500);
    } catch (error: any) {
      this.modalError = error.message || 'Failed to change password';
    }

    this.isSaving = false;
  }

  // Session management
  async refreshSession() {
    await this.keycloakService.refreshToken().toPromise();
    const token = this.keycloakService.getToken();
    if (token) {
      this.tokenPreview = token.substring(0, 80) + '...';
    }
  }

  logout() {
    this.keycloakService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakAdminService, UserWithRoles, KeycloakRole } from '../../services/keycloak-admin.service';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template.html',
  styles: [`
    .users-page {
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

    .search-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-input-wrapper {
      flex: 1;
      max-width: 400px;
      position: relative;
    }

    .search-input-wrapper svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--gray-400);
    }

    .search-input-wrapper .form-control {
      padding-left: 44px;
    }

    .results-count {
      color: var(--gray-500);
      font-size: 14px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: var(--gray-500);
    }

    .loading-state .spinner {
      margin-bottom: 16px;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 500;
      color: var(--gray-900);
    }

    .user-username {
      font-size: 12px;
      color: var(--gray-500);
    }

    .roles-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .role-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--primary-100);
      color: var(--primary-700);
    }

    .role-badge.admin {
      background: #f3e8ff;
      color: #9333ea;
    }

    .no-roles {
      color: var(--gray-400);
      font-size: 12px;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .action-buttons .btn {
      padding: 6px 8px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--gray-400);
    }

    .empty-state svg {
      margin-bottom: 12px;
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
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      animation: modalIn 0.2s ease;
    }

    .modal-sm {
      max-width: 400px;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
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

    .modal-close:hover {
      color: var(--gray-600);
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

    .roles-select {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .role-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .role-checkbox input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .role-label {
      font-size: 14px;
      color: var(--gray-700);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: var(--gray-700);
    }

    .checkbox-label input {
      width: 16px;
      height: 16px;
    }

    .modal-info {
      font-size: 14px;
      color: var(--gray-600);
      margin-bottom: 20px;
    }

    .delete-warning {
      text-align: center;
      padding: 20px 0;
    }

    .delete-warning svg {
      color: var(--warning-500);
      margin-bottom: 16px;
    }

    .delete-warning p {
      color: var(--gray-700);
      margin-bottom: 4px;
    }

    .warning-text {
      font-size: 13px;
      color: var(--gray-500);
    }
  `]
})
export class UsersComponent implements OnInit {
  users: UserWithRoles[] = [];
  filteredUsers: UserWithRoles[] = [];
  availableRoles: KeycloakRole[] = [];
  searchQuery = '';
  isLoading = true;

  // Modal states
  showUserModal = false;
  showPasswordModal = false;
  showDeleteModal = false;
  isEditMode = false;
  isSaving = false;
  modalError = '';
  modalSuccess = '';

  // Form data
  selectedUser: UserWithRoles | null = null;
  formData = {
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roles: [] as string[],
    enabled: true,
    emailVerified: true,
  };
  newPassword = '';
  confirmPassword = '';
  temporaryPassword = false;

  constructor(
    private adminService: KeycloakAdminService,
    private keycloakService: KeycloakService
  ) {}

  async ngOnInit() {
    await this.loadUsers();
    await this.loadRoles();
  }

  async loadUsers() {
    this.isLoading = true;
    try {
      this.users = await this.adminService.getUsers();
      this.filteredUsers = this.users;
    } catch (error) {
      console.error('Failed to load users:', error);
    }
    this.isLoading = false;
  }

  async loadRoles() {
    try {
      this.availableRoles = await this.adminService.getRoles();
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }

  onSearchChange(query: string) {
    const search = query.toLowerCase().trim();
    this.filteredUsers = this.users.filter(user => 
      user.username.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.firstName && user.firstName.toLowerCase().includes(search)) ||
      (user.lastName && user.lastName.toLowerCase().includes(search))
    );
  }

  getInitials(firstName?: string, lastName?: string, username?: string): string {
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (username) return username.substring(0, 2).toUpperCase();
    return 'U';
  }

  formatDate(timestamp?: number): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  }

  // Modal operations
  openCreateModal() {
    this.isEditMode = false;
    this.selectedUser = null;
    this.formData = {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      roles: ['user'],
      enabled: true,
      emailVerified: true,
    };
    this.modalError = '';
    this.showUserModal = true;
  }

  openEditModal(user: UserWithRoles) {
    this.isEditMode = true;
    this.selectedUser = user;
    this.formData = {
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: '',
      roles: [...user.roles],
      enabled: user.enabled,
      emailVerified: user.emailVerified || false,
    };
    this.modalError = '';
    this.showUserModal = true;
  }

  closeUserModal() {
    this.showUserModal = false;
    this.modalError = '';
  }

  toggleRole(roleName: string) {
    const index = this.formData.roles.indexOf(roleName);
    if (index === -1) {
      this.formData.roles.push(roleName);
    } else {
      this.formData.roles.splice(index, 1);
    }
  }

  async saveUser() {
    this.modalError = '';
    
    // Validation
    if (!this.formData.username || !this.formData.email) {
      this.modalError = 'Username and email are required';
      return;
    }
    
    if (!this.isEditMode && !this.formData.password) {
      this.modalError = 'Password is required';
      return;
    }

    this.isSaving = true;

    try {
      if (this.isEditMode && this.selectedUser) {
        // Update existing user
        await this.adminService.updateUser(this.selectedUser.id!, {
          firstName: this.formData.firstName,
          lastName: this.formData.lastName,
          email: this.formData.email,
          enabled: this.formData.enabled,
          emailVerified: this.formData.emailVerified,
        });

        // Update roles
        const currentRoles = this.selectedUser.roles;
        
        // Remove roles that are no longer selected
        for (const role of currentRoles) {
          if (!this.formData.roles.includes(role)) {
            await this.adminService.removeRole(this.selectedUser.id!, role);
          }
        }
        
        // Add new roles
        for (const role of this.formData.roles) {
          if (!currentRoles.includes(role)) {
            await this.adminService.assignRole(this.selectedUser.id!, role);
          }
        }
      } else {
        // Create new user
        await this.adminService.createUser({
          username: this.formData.username,
          email: this.formData.email,
          firstName: this.formData.firstName,
          lastName: this.formData.lastName,
          password: this.formData.password,
          enabled: this.formData.enabled,
          emailVerified: this.formData.emailVerified,
          roles: this.formData.roles,
        });
      }

      await this.loadUsers();
      this.closeUserModal();
    } catch (error: any) {
      this.modalError = error.message || 'Failed to save user';
    }

    this.isSaving = false;
  }

  // Password reset
  openPasswordModal(user: UserWithRoles) {
    this.selectedUser = user;
    this.newPassword = '';
    this.confirmPassword = '';
    this.temporaryPassword = false;
    this.modalError = '';
    this.modalSuccess = '';
    this.showPasswordModal = true;
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.modalError = '';
    this.modalSuccess = '';
  }

  async resetPassword() {
    this.modalError = '';
    this.modalSuccess = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.modalError = 'Please fill in all fields';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.modalError = 'Passwords do not match';
      return;
    }

    if (this.newPassword.length < 8) {
      this.modalError = 'Password must be at least 8 characters';
      return;
    }

    this.isSaving = true;

    try {
      await this.adminService.resetUserPassword(this.selectedUser!.id!, this.newPassword, this.temporaryPassword);
      this.modalSuccess = 'Password reset successfully!';
      setTimeout(() => this.closePasswordModal(), 1500);
    } catch (error: any) {
      this.modalError = error.message || 'Failed to reset password';
    }

    this.isSaving = false;
  }

  // Delete user
  confirmDelete(user: UserWithRoles) {
    this.selectedUser = user;
    this.modalError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
  }

  async deleteUser() {
    this.isSaving = true;

    try {
      await this.adminService.deleteUser(this.selectedUser!.id!);
      await this.loadUsers();
      this.closeDeleteModal();
    } catch (error: any) {
      this.modalError = error.message || 'Failed to delete user';
    }

    this.isSaving = false;
  }
}

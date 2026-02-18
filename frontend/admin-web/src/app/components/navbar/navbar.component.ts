import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './template.html',
  styles: [`
    .navbar {
      background: white;
      border-bottom: 1px solid var(--gray-200);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .navbar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--primary-600);
      font-weight: 600;
      font-size: 18px;
    }

    .navbar-menu {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .nav-link {
      padding: 8px 16px;
      text-decoration: none;
      color: var(--gray-600);
      font-size: 14px;
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all 0.2s;
    }

    .nav-link:hover {
      color: var(--gray-900);
      background: var(--gray-100);
    }

    .nav-link.active {
      color: var(--primary-600);
      background: var(--primary-50);
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-menu {
      position: relative;
    }

    .user-button {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all 0.2s;
    }

    .user-button:hover {
      background: var(--gray-100);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--gray-700);
    }

    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      min-width: 200px;
      overflow: hidden;
      animation: slideUp 0.2s ease;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 16px;
      text-decoration: none;
      color: var(--gray-700);
      font-size: 14px;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .dropdown-item:hover {
      background: var(--gray-50);
    }

    .dropdown-item.logout {
      color: var(--error-500);
    }

    .dropdown-item.logout:hover {
      background: #fef2f2;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--gray-200);
      margin: 4px 0;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  isAuthenticated = false;
  displayName = 'User';
  showUserMenu = false;

  constructor(
    private keycloakService: KeycloakService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.isAuthenticated = await this.keycloakService.isAuthenticated();
    if (this.isAuthenticated) {
      this.displayName = this.keycloakService.getUserDisplayName();
    }

    this.keycloakService.isAuthenticated$.subscribe(async (auth) => {
      this.isAuthenticated = auth;
      if (auth) {
        this.displayName = this.keycloakService.getUserDisplayName();
      }
    });
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  getUserInitials(): string {
    const name = this.displayName;
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  logout() {
    this.showUserMenu = false;
    this.keycloakService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}

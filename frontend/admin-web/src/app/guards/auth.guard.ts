import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { KeycloakService } from '../services/keycloak.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private keycloakService: KeycloakService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const token = this.keycloakService.getToken();
    
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check if token is valid by loading user info
    const userInfo = await this.keycloakService.loadUserInfo();
    
    if (!userInfo) {
      // Token might be expired, try refresh
      try {
        await this.keycloakService.refreshToken().toPromise();
        return true;
      } catch {
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    }

    // Check for role requirement
    const requiredRole = route.data['role'];
    if (requiredRole && !this.keycloakService.hasRole(requiredRole)) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}

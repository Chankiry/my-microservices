import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { UserPayload } from 'helper/interfaces/payload.interface';
import { jwtDecode } from 'jwt-decode';

export const AuthGuard: CanActivateFn | CanActivateChildFn = () => {

    const router: Router = inject(Router);
    const authService = inject(AuthService);
    const token = authService?.accessToken;
    if (token) {
        const tokenPayload: UserPayload = jwtDecode(token);
        if (tokenPayload) {
            return of(true);
        }
    }
    // Not Allow the access
    return of(router.parseUrl('/auth'));
};

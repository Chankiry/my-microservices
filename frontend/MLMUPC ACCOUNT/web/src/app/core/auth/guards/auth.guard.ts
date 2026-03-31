import { inject }      from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { of }          from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { jwtDecode }   from 'jwt-decode';

export const AuthGuard: CanActivateFn | CanActivateChildFn = () => {
    const router      = inject(Router);
    const authService = inject(AuthService);
    const token       = authService?.accessToken;

    if (token) {
        try {
            const payload: any = jwtDecode(token);
            // Check not expired
            if (payload?.exp && payload.exp > Date.now() / 1000) {
                return of(true);
            }
        } catch { /* fall through */ }
    }

    return of(router.parseUrl('/auth'));
};

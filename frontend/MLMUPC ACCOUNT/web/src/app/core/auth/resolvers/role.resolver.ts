import { inject }      from '@angular/core';
import { Router }      from '@angular/router';
import { of }          from 'rxjs';
import { AuthService } from '../auth.service';
import { jwtDecode }   from 'jwt-decode';

export const roleResolver = (allowedRoles: string[]) => {
    return () => {
        const router = inject(Router);
        const token  = inject(AuthService).accessToken;

        if (!token) {
            router.navigateByUrl('/auth');
            return of(false);
        }

        try {
            const payload: any = jwtDecode(token);
            let roleSlug: string | null = null;

            if (payload.iss?.includes('realms')) {
                // Keycloak JWT
                const roles: string[] = [
                    ...(payload.resource_access?.plt?.roles || []),
                    ...(Array.isArray(payload.plt_roles) ? payload.plt_roles : []),
                    ...(payload.realm_access?.roles        || []),
                ];
                if (roles.includes('admin'))     roleSlug = 'admin';
                else if (roles.includes('user')) roleSlug = 'user';
            } else {
                // PLT JWT
                const roles = payload.user?.roles || [];
                roleSlug = roles.find((r: any) => r.slug === 'admin' || r.name_en === 'Admin')
                    ? 'admin' : 'user';
            }

            if (!roleSlug || !allowedRoles.includes(roleSlug)) {
                // Redirect to the right place
                const target = roleSlug === 'admin' ? '/admin/dashboard' : '/profile/my-profile';
                router.navigateByUrl(target);
                return of(false);
            }

            return of(allowedRoles);
        } catch {
            router.navigateByUrl('/auth');
            return of(false);
        }
    };
};

import { inject }            from '@angular/core';
import { Router }            from '@angular/router';
import { HttpClient }        from '@angular/common/http';
import { firstValueFrom }    from 'rxjs';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { UserService }       from 'app/core/user/user.service';
import { AuthService }       from './core/auth/auth.service';
import { RoleEnum }          from 'helper/enums/role.enum';
import { jwtDecode }         from 'jwt-decode';

export const initialDataResolver = () => {

    // ─── All inject() calls MUST happen before any await ─────────────────────
    const router       = inject(Router);
    const authService  = inject(AuthService);
    const http         = inject(HttpClient);
    const userService  = inject(UserService);
    const navService   = inject(NavigationService);

    // Return a promise — injection context is no longer needed after this point
    return (async () => {
        const token = authService.accessToken;

        if (!token) {
            return router.navigateByUrl('/auth');
        }

        try {
            // ─── Step 1: decode token only to get role slug ───────────────
            const payload: any = jwtDecode(token);
            let roleSlug: 'admin' | 'user' | null = null;

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

            if (!roleSlug) {
                return router.navigateByUrl('/auth');
            }

            // ─── Step 2: fetch profile from backend ───────────────────────
            const profile = await firstValueFrom(
                http.get<any>('http://localhost:8000/api/v1/account/profile')
            );

            // ─── Step 3: set user ─────────────────────────────────────────
            userService.user = {
                id        : profile.id,
                phone     : profile.phone,
                email     : profile.email     ?? null,
                first_name: profile.first_name ?? null,
                last_name : profile.last_name  ?? null,
                avatar    : profile.avatar     ?? null,
                gender    : profile.gender     ?? null,
                is_active : profile.is_active  ?? true,
                created_at: profile.created_at,
            };

            // ─── Step 4: set navigation ───────────────────────────────────
            navService.navigations = {
                id        : 0,
                name_en   : roleSlug === 'admin' ? 'Admin' : 'User',
                name_kh   : roleSlug === 'admin' ? RoleEnum.ADMIN : 'អ្នកប្រើប្រាស់',
                slug      : roleSlug,
                icon      : '',
                is_default: true,
            };

        } catch (error) {
            console.error('initialDataResolver error:', error);
            return router.navigateByUrl('/auth');
        }
    })();
};

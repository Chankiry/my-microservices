import { inject }            from '@angular/core';
import { Router }            from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom }    from 'rxjs';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { UserService }       from 'app/core/user/user.service';
import { AuthService }       from './core/auth/auth.service';
import { env }               from 'envs/env';

export const initialDataResolver = () => {

    // ─── All inject() calls MUST be before any await ──────────────────────────
    const router      = inject(Router);
    const authService = inject(AuthService);
    const http        = inject(HttpClient);
    const userService = inject(UserService);
    const navService  = inject(NavigationService);

    return (async () => {
        const token = authService.accessToken;
        if (!token) return router.navigateByUrl('/auth');

        try {
            const data = await firstValueFrom(
                // FIX: was hardcoded http://localhost:8000 — now uses env
                http.get<any>(`${env.API_BASE_URL}/v1/account/profile/me`)
            );

            const me = data?.data;

            userService.user = {
                id        : me.id,
                phone     : me.phone,
                email     : me.email      ?? null,
                first_name: me.first_name ?? null,
                last_name : me.last_name  ?? null,
                name_kh   : me.name_kh    ?? null,
                name_en   : me.name_en    ?? null,
                avatar    : me.avatar     ?? null,
                gender    : me.gender     ?? null,
                is_active : me.is_active  ?? true,
                created_at: me.created_at,
                roles     : me.roles      ?? [],
            };

            const roles: string[] = (me.roles ?? []).map((r: any) => r.slug);
            let roleSlug: 'admin' | 'user' | null = null;
            if      (roles.includes('admin')) roleSlug = 'admin';
            else if (roles.includes('user'))  roleSlug = 'user';

            if (!roleSlug) {
                // Token valid but no platform role assigned — back to login
                return router.navigateByUrl('/auth');
            }

            const role = me.roles.find((r: any) => r.slug === roleSlug);
            navService.navigations = {
                id        : role?.id        ?? '',
                name_en   : role?.name_en   ?? roleSlug,
                name_kh   : role?.name_kh   ?? roleSlug,
                slug      : roleSlug,
                icon      : role?.icon      ?? '',
                color     : role?.color     ?? '',
                is_default: true,
            };

        } catch (err) {
            if (err instanceof HttpErrorResponse) {
                if (err.status === 401 || err.status === 403) {
                    authService.accessToken  = '';
                    authService.refreshToken = '';
                    return router.navigateByUrl('/auth');
                }
                // 0 = network down, 502/503/504 = gateway/service unavailable
                return router.navigateByUrl('/service-down');
            }
            return router.navigateByUrl('/service-down');
        }
    })();
};

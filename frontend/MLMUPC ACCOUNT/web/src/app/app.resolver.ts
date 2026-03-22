import { inject }               from "@angular/core";
import { Router }               from "@angular/router";
import { NavigationService }    from "app/core/navigation/navigation.service";
import { UserService }          from "app/core/user/user.service";
import { UserPayload }          from 'helper/interfaces/payload.interface';
import { forkJoin }             from "rxjs";
import { AuthService }          from "./core/auth/auth.service";
import { RoleEnum }             from "helper/enums/role.enum";
import { jwtDecode }            from 'jwt-decode';

export const initialDataResolver = () => {
    const router = inject(Router);
    const token  = inject(AuthService).accessToken;

    if (!token) {
        localStorage.clear();
        return router.navigateByUrl('');
    }

    const navigationService = inject(NavigationService);

    try {
        const tokenPayload: any = jwtDecode(token);

        let adminRole: any;
        let user: any;

        // ─── Keycloak JWT ─────────────────────────────────────────────────
        if (tokenPayload.iss?.includes('realms')) {
            const plt_roles: string[] =
                tokenPayload.resource_access?.plt?.roles ||
                tokenPayload.plt_roles ||
                [];

            const has_admin = Array.isArray(plt_roles)
                ? plt_roles.includes('admin')
                : plt_roles === 'admin';

            const has_user = Array.isArray(plt_roles)
                ? plt_roles.includes('user')
                : plt_roles === 'user';

            if (!has_admin && !has_user) {
                localStorage.clear();
                return router.navigateByUrl('');
            }

            // Build a role object in the same shape PLT components expect
            adminRole = has_admin
                ? {
                    id        : 0,
                    name_en   : 'Admin',
                    name_kh   : RoleEnum.ADMIN,
                    slug      : 'admin',
                    icon      : '',
                    is_default: true,
                }
                : {
                    id        : 0,
                    name_en   : 'User',
                    name_kh   : 'អ្នកប្រើប្រាស់',
                    slug      : 'user',
                    icon      : '',
                    is_default: true,
                };

            // Build a user object in the same shape PLT components expect
            user = {
                id          : 0,
                keycloak_id : tokenPayload.sub,
                username    : tokenPayload.preferred_username || '',
                name_en     : tokenPayload.name              || '',
                name_kh     : tokenPayload.name              || '',
                email       : tokenPayload.email             || '',
                phone_number: tokenPayload.preferred_username || '',
                avatar_uri  : '',
                role_id     : 0,
                roles       : [adminRole],
                realm_roles : tokenPayload.realm_access?.roles || [],
                auth_source : 'keycloak',
            };
        }

        // ─── PLT JWT ──────────────────────────────────────────────────────
        else {
            const typedPayload = tokenPayload as UserPayload;
            user      = typedPayload.user;
            adminRole = user.roles.find(
                (role: any) => role.name_en === 'Admin' || role.slug === 'admin'
            );

            if (!adminRole) {
                localStorage.clear();
                return router.navigateByUrl('');
            }
        }

        // Set user in UserService — same for both token types
        inject(UserService).user = user;

        // Set navigation based on role
        navigationService.navigations = adminRole;

    } catch (error) {
        console.error('initialDataResolver error:', error);
        localStorage.clear();
        return router.navigateByUrl('');
    }
};

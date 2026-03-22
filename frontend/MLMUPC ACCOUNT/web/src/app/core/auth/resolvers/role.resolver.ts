import { inject }      from "@angular/core";
import { Router }      from "@angular/router";
import { RoleEnum }    from "helper/enums/role.enum";
import { UserPayload } from 'helper/interfaces/payload.interface';
import { of }          from "rxjs";
import { AuthService } from "../auth.service";
import { jwtDecode } from "jwt-decode";

export const roleResolver = (allowedRoles: string[]) => {
    return () => {
        const router       = inject(Router);
        const token        = inject(AuthService).accessToken;
        const tokenPayload : any = jwtDecode(token);

        let adminRole: { name_en: string; name_kh: string; slug: string } | undefined;

        // ─── Keycloak JWT ─────────────────────────────────────────────────
        // Detect by presence of iss containing 'realms'
        if (tokenPayload.iss?.includes('realms')) {

            // Get PLT-specific roles from resource_access.plt.roles
            const plt_roles: string[] =
                tokenPayload.resource_access?.plt?.roles || [];

            // Fallback to plt_roles flat claim
            const flat_roles: string[] = Array.isArray(tokenPayload.plt_roles)
                ? tokenPayload.plt_roles
                : [];

            const all_plt_roles = [...new Set([...plt_roles, ...flat_roles])];

            if (all_plt_roles.includes('admin')) {
                adminRole = {
                    name_en: 'Admin',
                    name_kh: RoleEnum.ADMIN,
                    slug   : 'admin',
                };
            } else if (all_plt_roles.includes('user')) {
                adminRole = {
                    name_en: 'User',
                    name_kh: 'អ្នកប្រើប្រាស់',
                    slug   : 'user',
                };
            }
        }

        // ─── PLT JWT ──────────────────────────────────────────────────────
        else if (tokenPayload.user?.roles) {
            const typedPayload = tokenPayload as UserPayload;
            adminRole = typedPayload.user.roles.find(
                role => role.name_en === 'Admin' || role.slug === 'admin'
            );
        }

        // No role found — redirect to auth
        if (!adminRole) {
            router.navigateByUrl('/auth');
            return of(false);
        }

        const isValidRole = allowedRoles.includes(adminRole.name_kh);

        if (!isValidRole) {
            switch (adminRole.name_kh) {
                case RoleEnum.ADMIN: router.navigateByUrl('/admin/home'); break;
            }
            return of(false);
        }

        return of(allowedRoles);
    };
};

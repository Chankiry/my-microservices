import { inject }      from '@angular/core';
import { Router }      from '@angular/router';
import { of }          from 'rxjs';
import { UserService } from 'app/core/user/user.service';

// Reads roles from UserService (already populated by initialDataResolver).
// No HTTP call needed — resolver runs after initialDataResolver.

export const roleResolver = (allowedRoles: string[]) => {
    return () => {
        const router      = inject(Router);
        const userService = inject(UserService);

        const user = userService.user;
        if (!user) {
            router.navigateByUrl('/auth');
            return of(false);
        }

        const slugs = (user.roles ?? []).map((r: any) => r.slug);
        const matched = slugs.find((s: string) => allowedRoles.includes(s)) ?? null;

        if (!matched) {
            // Redirect to the correct place for this user's actual role
            const target = slugs.includes('admin') ? '/admin/home' : '/user/home';
            router.navigateByUrl(target);
            return of(false);
        }

        return of(allowedRoles);
    };
};

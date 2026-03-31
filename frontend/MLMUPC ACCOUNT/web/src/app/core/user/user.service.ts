import { Injectable }        from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User }              from './user.types';

@Injectable({ providedIn: 'root' })
export class UserService {

    private _user = new BehaviorSubject<User | null>(null);

    // ─── Getter / Setter ──────────────────────────────────────────────────────

    get user(): User | null {
        return this._user.getValue();
    }

    set user(value: User) {
        this._user.next(value);
    }

    get user$(): Observable<User> {
        return this._user.asObservable() as Observable<User>;
    }

    // ─── Convenience helpers ──────────────────────────────────────────────────

    get platformRoleSlugs(): string[] {
        return (this._user.getValue()?.platform_roles ?? []).map(r => r.slug);
    }

    get isAdmin(): boolean {
        return this.platformRoleSlugs.includes('admin');
    }

    get isUser(): boolean {
        return this.platformRoleSlugs.includes('user');
    }

    get displayName(): string {
        const u = this._user.getValue();
        if (!u) return '';
        return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.phone;
    }
}

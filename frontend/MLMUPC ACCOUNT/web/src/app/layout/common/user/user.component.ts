import { CommonModule }         from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule }      from '@angular/material/button';
import { MatDividerModule }     from '@angular/material/divider';
import { MatIconModule }        from '@angular/material/icon';
import { MatMenuModule }        from '@angular/material/menu';
import { Router }               from '@angular/router';
import { AuthService }          from 'app/core/auth/auth.service';
import { UserService }          from 'app/core/user/user.service';
import { User }                 from 'app/core/user/user.types';
import { env }                  from 'envs/env';
import { Subject, takeUntil }   from 'rxjs';
import { TranslocoModule }      from '@ngneat/transloco';

@Component({
    selector   : 'user',
    templateUrl: './user.component.html',
    standalone : true,
    imports    : [
        CommonModule,
        MatButtonModule,
        MatMenuModule,
        MatIconModule,
        MatDividerModule,
        TranslocoModule,
    ],
})
export class UserComponent implements OnInit, OnDestroy {
    public user    : User | null = null;
    public src     : string = '/images/placeholder/avatar.jpg';
    public FILE_URL = env.FILE_BASE_URL;
    private _unsubscribeAll = new Subject<any>();

    constructor(
        private _changeDetectorRef : ChangeDetectorRef,
        private _authService       : AuthService,
        private _userService       : UserService,
        private _router            : Router,
    ) {}

    ngOnInit(): void {
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;
                this.src  = user?.avatar
                    ? `${this.FILE_URL}/${user.avatar}`
                    : '/images/placeholder/avatar.jpg';
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    get displayName(): string {
        if (!this.user) return '';
        return [this.user.first_name, this.user.last_name]
            .filter(Boolean).join(' ') || this.user.phone;
    }

    goToProfile(): void {
        this._router.navigateByUrl('/profile/my-profile');
    }

    signOut(): void {
        this._authService.signOut();
        this._router.navigateByUrl('/auth');
    }
}

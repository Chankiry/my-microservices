import { CommonModule }         from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule }      from '@angular/material/button';
import { MatDividerModule }     from '@angular/material/divider';
import { MatIconModule }        from '@angular/material/icon';
import { MatMenuModule }        from '@angular/material/menu';
import { MatDialog }            from '@angular/material/dialog';
import { Router }               from '@angular/router';
import { AuthService }          from 'app/core/auth/auth.service';
import { UserService }          from 'app/core/user/user.service';
import { User }                 from 'app/core/user/user.types';
import { env }                  from 'envs/env';
import { Subject, takeUntil }   from 'rxjs';
import { SwitchRoleComponent }  from './switch-role/switch-role.component';
import { TranslocoModule }      from '@ngneat/transloco';

@Component({
    selector   : 'user',
    templateUrl: './user.component.html',
    standalone : true,
    imports    : [
        MatButtonModule,
        CommonModule,
        MatMenuModule,
        MatIconModule,
        MatDividerModule,
        SwitchRoleComponent,
        TranslocoModule,
    ],
})
export class UserComponent implements OnInit, OnDestroy {

    public user : User;
    public src  : string = '/images/placeholder/avatar.jpg';
    public FILE_URL = env.FILE_BASE_URL;

    classList: string = '';

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _changeDetectorRef : ChangeDetectorRef,
        private _authService       : AuthService,
        private _userService       : UserService,
        private _router            : Router,
        private _matDialog         : MatDialog,
    ) {}

    ngOnInit(): void {
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;
                if (this.user?.avatar_uri) {
                    this.src = this.FILE_URL + '/' + this.user.avatar_uri;
                }
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    handleSwitchRole(): void {
        this.classList = 'w-screen sm:max-w-120';
    }

    signOut(): void {
        this._authService.signOut();
        this._router.navigateByUrl('/auth');
    }
}

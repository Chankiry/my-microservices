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
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SwitchRoleComponent } from './switch-role/switch-role.component';

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
        private readonly _matDialog: MatDialog,
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

    handleSwitchRole(): void {
        const dialogRef = this._matDialog.open(SwitchRoleComponent, {
            autoFocus           : false,
            height              : '100%',
            width               : '400px',
            maxWidth            : '100vw',
            maxHeight           : '100vh',
            position            : { right: '0px', top: '0px' },
            enterAnimationDuration: '0s',
            panelClass          : 'side-dialog',
            data                : { roles: this.user?.roles ?? [] }, // ← pass roles
        });

        // Handle selected role
        dialogRef.afterClosed().subscribe((selectedRole) => {
            if (selectedRole) {
              if (selectedRole.slug === 'admin') this._router.navigateByUrl('/admin/home');
              else this._router.navigateByUrl('/user/home');
            }
        });
    }

    signOut(): void {
        this._authService.signOut();
        this._router.navigateByUrl('/auth');
    }
}

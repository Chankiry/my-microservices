import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { env } from 'envs/env';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { MatButtonModule } from '@angular/material/button';
import { ProfileService } from '../profile.service';
import { UpdateProfileDialogComponent } from '../my-profile/update/component';
import { ProfileSecurityComponent } from '../dialog/security/component';
import { QRDialogComponent } from '../qr/component';
import { UpdateSettingComponent } from '../dialog/setting/component';
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';
import { User } from 'app/core/user/user.types';
import { UserService } from 'app/core/user/user.service';
import { PortraitDialogComponent } from 'helper/components/portrait/portrait.component';
import { getDialogConfig, getSideDialogConfig } from 'app/shared/lib/dialog.conf';


@Component({
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatMenuModule,
        MatDividerModule,
        TranslocoModule,
        MatDialogModule,
        MatButtonModule,
    ],
    selector: 'profile-component-view',
    templateUrl: 'template.html',
    styleUrl: 'style.scss',
})

export class ProfileViewComponent implements OnInit {
    isLoading               : boolean = false;
    fileUrl                 : string = env.FILE_BASE_URL;
    _url                    : string = env.API_BASE_URL;
    user                    : any;
    // orgs                    : any
    history                 : any;
    private _unsubscribeAll : Subject<any> = new Subject<any>();
    current_lang            : string;

    user_data               : User;
    fileInput               : any;


    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _translocoService: TranslocoService,
        private _userService: UserService,
        private _matDialog: MatDialog,
        private _service  : ProfileService,
        private readonly snackbarService: SnackbarService,

    ) {


        this.current_lang = this._translocoService.getActiveLang();
        this._translocoService.langChanges$.subscribe(lang => {
            this.current_lang = lang
        })

        this.user = _userService.user;

    }

    ngOnInit() {

        this.isLoading = true;

    }

    getLeastRecentDate(data: Array<any>) {
        const leastRecent = data.reduce((prev, curr) => {
            return new Date(curr.created_at) < new Date(prev.created_at) ? curr : prev;
        });
        return leastRecent.created_at.split('T')[0];
    }

    ngOnDestroy() {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    onAvatarChange(newSrc: string): void {
        this.user.avatar = newSrc;
    }


    openCroppedDialog(event: Event, aspect: number = 4 / 3 , type?: 'avatar' | 'cover'): void {
        const dialogConfig: MatDialogConfig = {
            autoFocus: false,
            width: '600px',
            panelClass: 'side-dialog',
            enterAnimationDuration: '0s',
            data: {
                event,
                responseType: 'base64',
                aspect, // dynamic aspect ratio
            }
        };

        const dialogRef = this._matDialog.open(PortraitDialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe((result) => {

            if(result) {

                let user_update: any = {
                    name: this.user.name,
                    email: this.user.email,
                    phone: this.user.phone
                }

                if(type === 'avatar') {
                    user_update.avatar = result;
                }
                else if(type === 'cover') {
                    user_update.banner = result;
                }

                this._service.profile(user_update).subscribe({
                    next: (res) => {
                        this.user = res.user;
                        this._userService.user = res.user;
                        this.snackbarService.openSnackBar(res.message, 'success');
                    },
                    error: (err) => {

                        console.log('Failed to update avatar', err);

                    }
                });

            }

        });
    }


    updateProfile(): void {
        const dialogRef     =  this._matDialog.open(UpdateProfileDialogComponent, getSideDialogConfig(this.user));
        dialogRef.afterClosed().subscribe(result => {
            if (result) {

                this._userService.user = result;
            }
        });

    }

    openSettingDialog(): void {
        this._matDialog.open(UpdateSettingComponent, getSideDialogConfig());
    }

    securityDialog(): void {
        this._matDialog.open(ProfileSecurityComponent, getSideDialogConfig());
    }

    openQrDialog() {
        this._matDialog.open(QRDialogComponent, getDialogConfig({
            mobile_login: true
        }));
    }
}

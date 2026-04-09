import { CommonModule, NgStyle }      from '@angular/common';
import { Component, inject, signal }  from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule }              from '@angular/material/icon';
import { MatButtonModule }            from '@angular/material/button';
import { TranslocoModule }            from '@ngneat/transloco';
import { ChangePasswordComponent }     from '../../my-profile/change-password/component';
import { HelperConfirmationService } from 'helper/services/confirmation';
import { UserService } from 'app/core/user/user.service';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatDialogModule,
        NgStyle,
        MatButtonModule,
        TranslocoModule
    ],
    selector: 'profile-security',
    templateUrl: 'template.html'
})

export class ProfileSecurityComponent {
    public drawSecurityStatus = signal({ color: '', status: '', description: '', style: '', });

    private matDialog             = inject(MatDialog);
    private _confimationService   = inject(HelperConfirmationService);
    public user           : any = inject(UserService).user;

    constructor(    ) {
        const security = {
            telegram: Math.floor(Math.random() * 10) + 1 > 5 ? true : false,
            password: Math.floor(Math.random() * 10) + 1 > 5 ? true : false,
            email: Math.floor(Math.random() * 10) + 1 > 5 ? true : false,
            phone: Math.floor(Math.random() * 10) + 1 > 5 ? true : false,
            facepass: Math.floor(Math.random() * 10) + 1 > 5 ? true : false,
            pin: Math.floor(Math.random() * 10) + 1 > 5 ? true : false,
            device: Math.floor(Math.random() * 10) + 1 > 5 ? true : false,
        }

        const { color, style } = this.resolveStyle(security);

        //this to set and computed the security status figure to display how secure their account is
        this.drawSecurityStatus.set({
            color: color,
            status: 'គណនីយ៍របស់អ្នកមានសុវត្ថិភាពទាប',
            description: 'យើងបានពិនិត្យឃើញថាលោកអ្នកមិនទានបានបំពេញលក្ខណសុវត្ថិភាព',
            // style: 'conic-gradient( #e53e3e 0deg 60deg,lightgray 0deg 360deg)'
            style: style
        });
    }

    resolveStyle(security: any): { color: string; style: string } {
        // Get all values
        const values = Object.values(security);

        // Count how many are true
        const total = values.length;
        const active = values.filter(Boolean).length;

        let color = ''

        if(active == total){
            color = '#22c55e';
        } else if(active >= total / 2) {
            color = '#f59e0b';
        } else {
            color = '#e53e3e';
        }

        // Convert to degrees (0° to 360°)
        const degrees = (active / total) * 360;

        return { color: color, style: `conic-gradient(
            ${color} 0deg ${degrees}deg,
            lightgray 0deg 360deg
        )`};
    }

    // openQrDialog(){
    //     this.matDialog.open(QRDialogComponent, {
    //         autoFocus: false,
    //         width: '100dvw',
    //         maxWidth: '600px',
    //         enterAnimationDuration: '0s',
    //         data: {
    //             with_token: true,
    //         }
    //     });
    // }
    // openPasswordDialog(){
    //     this.matDialog.open(ConfirmPasswordProfileComponent, {
    //     // this.matDialog.open(GeneratePasswordComponent, {
    //         autoFocus: false,
    //         position: { right: '0px' },
    //         height: '100dvh',
    //         width: '100dvw',
    //         maxWidth: '600px',
    //         panelClass: 'custom-mat-dialog-as-mat-drawer',
    //         enterAnimationDuration: '0s',
    //     });
    // }


    openPasswordDialog(): void {
        this.matDialog.open(ChangePasswordComponent, {
            autoFocus: false,
            position: { right: '0px' },
            height: '100dvh',
            width: '100dvw',
            maxWidth: '600px',
            panelClass: 'side-dialog',
            enterAnimationDuration: '0s',
        });
    }
    // openDeviceDialog(){
    //     this.matDialog.open(DeviceProfileDialogComponent, {
    //         autoFocus: false,
    //         position: { right: '0px' },
    //         height: '100dvh',
    //         width: '100dvw',
    //         maxWidth: '520px',
    //         panelClass: 'custom-mat-dialog-as-mat-drawer',
    //         enterAnimationDuration: '0s',
    //     });
    // }
}

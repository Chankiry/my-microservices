import { Component, Inject }                  from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule }                     from '@angular/material/button';
import { MatIconModule }                       from '@angular/material/icon';
import { MatProgressSpinnerModule }            from '@angular/material/progress-spinner';
import { UserHomeService }                     from '../../service';
import { SnackbarService }                     from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService }                  from 'app/shared/error-handle.service';
import { SystemAccessItem }                    from '../../user-home.types';
import GlobalConstants                         from 'helper/shared/constants';
import { env }                                 from 'envs/env';

@Component({
    selector   : 'disconnect-confirm-dialog',
    templateUrl: './template.html',
    standalone : true,
    imports    : [
        CommonModule, MatDialogModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    ],
})
export class DisconnectConfirmDialogComponent {

    public isLoading = false;
    public file_url  = env.FILE_BASE_URL;

    constructor(
        private _dialogRef   : MatDialogRef<DisconnectConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public system: SystemAccessItem,
        private _service     : UserHomeService,
        private _snackBar    : SnackbarService,
        private _errorHandle : ErrorHandleService,
    ) {}

    getLogoUrl(): string {
        if (!this.system.logo) return '/images/placeholder/avatar.jpg';
        if (this.system.logo.startsWith('images/') || this.system.logo.startsWith('http')) {
            return this.system.logo;
        }
        return `${this.file_url}/${this.system.logo}`;
    }

    confirm(): void {
        this.isLoading = true;
        this._service.disconnectSystem(this.system.id).subscribe({
            next: res => {
                this._snackBar.openSnackBar(res.message, GlobalConstants.success);
                this._dialogRef.close(true);
            },
            error: err => {
                this.isLoading = false;
                this._errorHandle.handleHttpError(err);
            },
        });
    }

    close(): void {
        this._dialogRef.close(false);
    }
}

import { Component, Inject, OnInit }         from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule }                     from '@angular/material/button';
import { MatIconModule }                       from '@angular/material/icon';
import { MatFormFieldModule }                  from '@angular/material/form-field';
import { MatInputModule }                      from '@angular/material/input';
import { MatProgressSpinnerModule }            from '@angular/material/progress-spinner';
import { UserHomeService }                     from '../../service';
import { SnackbarService }                     from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService }                  from 'app/shared/error-handle.service';
import { AvailableSystem }                     from '../../user-home.types';
import GlobalConstants                         from 'helper/shared/constants';
import { env }                                 from 'envs/env';

@Component({
    selector   : 'connect-system-dialog',
    templateUrl: './template.html',
    standalone : true,
    imports    : [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatDialogModule, MatButtonModule, MatIconModule,
        MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    ],
})
export class ConnectSystemDialogComponent implements OnInit {

    public form       : UntypedFormGroup;
    public isLoading  : boolean = false;
    public hidePassword = true;
    public file_url     = env.FILE_BASE_URL;

    constructor(
        private _dialogRef    : MatDialogRef<ConnectSystemDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public system: AvailableSystem,
        private _service      : UserHomeService,
        private _snackBar     : SnackbarService,
        private _errorHandle  : ErrorHandleService,
        private _fb           : UntypedFormBuilder,
    ) {}

    ngOnInit(): void {
        this.form = this._fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });
    }

    getLogoUrl(): string {
        if (!this.system.logo) return '/images/placeholder/avatar.jpg';
        if (this.system.logo.startsWith('images/') || this.system.logo.startsWith('http')) {
            return this.system.logo;
        }
        return `${this.file_url}/${this.system.logo}`;
    }

    submit(): void {
        if (this.form.invalid || this.isLoading) return;
        this.isLoading = true;
        this.form.disable();

        this._service.connectSystem({
            system_id: this.system.id,
            username : this.form.value.username,
            password : this.form.value.password,
        }).subscribe({
            next: res => {
                this._snackBar.openSnackBar(res.message, GlobalConstants.success);
                this._dialogRef.close(true);
            },
            error: err => {
                this.isLoading = false;
                this.form.enable();
                this._errorHandle.handleHttpError(err);
            },
        });
    }

    close(): void {
        this._dialogRef.close(false);
    }
}

import { Component, Inject, OnInit }          from '@angular/core';
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
import { ProfileResponse }                     from '../../user-home.types';
import GlobalConstants                         from 'helper/shared/constants';

@Component({
    selector   : 'edit-profile-dialog',
    templateUrl: './template.html',
    standalone : true,
    imports    : [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatDialogModule, MatButtonModule, MatIconModule,
        MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    ],
})
export class EditProfileDialogComponent implements OnInit {

    public form      : UntypedFormGroup;
    public isLoading = false;

    constructor(
        private _dialogRef   : MatDialogRef<EditProfileDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ProfileResponse,
        private _service     : UserHomeService,
        private _snackBar    : SnackbarService,
        private _errorHandle : ErrorHandleService,
        private _fb          : UntypedFormBuilder,
    ) {}

    ngOnInit(): void {
        this.form = this._fb.group({
            first_name: [this.data?.first_name ?? '', Validators.required],
            last_name : [this.data?.last_name  ?? '', Validators.required],
            name_kh   : [this.data?.name_kh    ?? ''],
            name_en   : [this.data?.name_en    ?? ''],
        });
    }

    submit(): void {
        if (this.form.invalid || this.isLoading) return;
        this.isLoading = true;
        this.form.disable();

        // Only send fields that changed
        const payload: any = {};
        const controls = this.form.controls;
        if (controls['first_name'].value !== this.data?.first_name) payload.first_name = controls['first_name'].value;
        if (controls['last_name'].value  !== this.data?.last_name)  payload.last_name  = controls['last_name'].value;
        if (controls['name_kh'].value    !== this.data?.name_kh)    payload.name_kh    = controls['name_kh'].value;
        if (controls['name_en'].value    !== this.data?.name_en)    payload.name_en    = controls['name_en'].value;

        if (Object.keys(payload).length === 0) {
            this._dialogRef.close(false);
            return;
        }

        this._service.updateProfile(payload).subscribe({
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

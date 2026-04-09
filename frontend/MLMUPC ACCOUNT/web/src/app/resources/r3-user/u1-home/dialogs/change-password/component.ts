import { Component, OnInit }                  from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef }       from '@angular/material/dialog';
import { MatButtonModule }                     from '@angular/material/button';
import { MatIconModule }                       from '@angular/material/icon';
import { MatFormFieldModule }                  from '@angular/material/form-field';
import { MatInputModule }                      from '@angular/material/input';
import { MatProgressSpinnerModule }            from '@angular/material/progress-spinner';
import { UserHomeService }                     from '../../service';
import { SnackbarService }                     from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService }                  from 'app/shared/error-handle.service';
import GlobalConstants                         from 'helper/shared/constants';

// Custom validator: new_password === confirm_password
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pw  = group.get('new_password')?.value;
    const cpw = group.get('confirm_password')?.value;
    return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
    selector   : 'change-password-dialog',
    templateUrl: './template.html',
    standalone : true,
    imports    : [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatDialogModule, MatButtonModule, MatIconModule,
        MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    ],
})
export class ChangePasswordDialogComponent implements OnInit {

    public form      : UntypedFormGroup;
    public isLoading = false;
    public hideNew   = true;
    public hideConf  = true;

    constructor(
        private _dialogRef   : MatDialogRef<ChangePasswordDialogComponent>,
        private _service     : UserHomeService,
        private _snackBar    : SnackbarService,
        private _errorHandle : ErrorHandleService,
        private _fb          : UntypedFormBuilder,
    ) {}

    ngOnInit(): void {
        this.form = this._fb.group({
            new_password    : ['', [Validators.required, Validators.minLength(8)]],
            confirm_password: ['', Validators.required],
        }, { validators: passwordMatchValidator });
    }

    submit(): void {
        if (this.form.invalid || this.isLoading) return;
        this.isLoading = true;
        this.form.disable();

        this._service.changePassword(this.form.value.new_password).subscribe({
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

// ================================================================================>> Core Library
import { CommonModule }                                     from '@angular/common';
import { Component, OnInit }                                from '@angular/core';
import { ReactiveFormsModule, FormsModule }                 from '@angular/forms';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, RouterLink }                                           from '@angular/router';

// ================================================================================>> Third Party Library
// ===>> Material
import { MatButtonModule }                                  from '@angular/material/button';
import { MatFormFieldModule }                               from '@angular/material/form-field';
import { MatInputModule }                                   from '@angular/material/input';
import { MatIconModule }                                    from '@angular/material/icon';
import { MatProgressSpinnerModule }                         from '@angular/material/progress-spinner';

// ===>> Transloco
import { TranslocoModule }                                  from '@ngneat/transloco';

// ================================================================================>> Custom Library
// ===>> Env
import { env }                                              from 'envs/env';

// ===>> helper Library
import { SnackbarService }                                  from 'helper/services/snack-bar/snack-bar.service';

// ===>> Shared
import { ErrorHandleService }                               from 'app/shared/error-handle.service';

// ===>> Service
import { AuthService }                                      from 'app/core/auth/auth.service';


@Component({
    selector    : 'app-reset-password',
    templateUrl : './reset-password.component.html',
    styleUrls   : ['./reset-password.component.scss'],
    standalone  : true,
    imports     : [
        CommonModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TranslocoModule,
        ReactiveFormsModule,
        FormsModule,
        RouterLink
    ]
})
export class ResetPasswordComponent implements OnInit {

    public resetPasswordForm : UntypedFormGroup;
    public isLoading         = false;
    public appVersion        : string = env.APP_VERSION;

    constructor(
        private _formBuilder        : UntypedFormBuilder,
        private _authService        : AuthService,
        private _router             : Router,
        private _snackbarService    : SnackbarService,
        private _errorHandleService : ErrorHandleService
    ) {}


    ngOnInit(): void {
        // Create the form for resetting password
        this.resetPasswordForm = this._formBuilder.group({
            newPassword     : ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword : ['', [Validators.required, Validators.minLength(6)]]
        }, {
            validators: this.passwordMatchValidator
        });
    }

    // Custom validator to check if passwords match
    passwordMatchValidator(group: UntypedFormGroup): { [key: string]: boolean } | null {
        const password = group.get('newPassword')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { mismatch: true };
    }

    resetPassword(): void {

        if (this.resetPasswordForm.invalid) {
            return;
        }

        this.isLoading = true;

        const email = localStorage.getItem('email');
        const formData = {
            email       : email,
            otp         : localStorage.getItem('otp'),
            newPassword : this.resetPasswordForm.value.newPassword,
        };

        // this._authService.resetPassword(formData).subscribe({
        //     next: (res) => {
        //         this.isLoading = false;
        //         this._snackbarService.openSnackBar(res.message, 'success');

        //         // Clear any sensitive data stored locally
        //         localStorage.removeItem('email');
        //         localStorage.removeItem('otp');

        //         // Navigate to the sign-in page
        //         this._router.navigateByUrl('/auth/sign-in');
        //     },
        //     error: (err) => {
        //         this.isLoading = false;
        //         this._errorHandleService.handleHttpError(err);
        //     },
        // });
    }
}

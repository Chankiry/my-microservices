// ================================================================================>> Core Library
import { CommonModule } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

// ================================================================================>> Third Party Library
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

// ================================================================================>> Custom Library
// Env
import { env } from 'envs/env';

// Helper
import GlobalConstants from 'helper/shared/constants';

// Service
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';
import { ProfileService } from '../../profile.service';
import { ErrorHandleService } from 'app/shared/error-handle.service';

// Interface
import { ResponseProfile } from '../../profile.type';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { User } from 'app/core/user/user.types';
import { UserService } from 'app/core/user/user.service';


@Component({
    selector    : 'update-form',
    standalone  : true,
    templateUrl : './template.html',
    styleUrl    : './style.scss',
    imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIcon,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
],
})
export class UpdateProfileDialogComponent {

    public form      : UntypedFormGroup;
    public src       : string = '/public/images/avatars';
    public isLoading : boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: User,

        private _dialogRef          : MatDialogRef<UpdateProfileDialogComponent>,
        private _formBuilder        : UntypedFormBuilder,
        private _accountService     : ProfileService,
        private _snackBarService    : SnackbarService,
        private _errorHandleService : ErrorHandleService,
        private _userService        : UserService
    ) { }

    ngOnInit(): void {
        this.src = this.data?.avatar ? `${env.FILE_BASE_URL} / ${this.data?.avatar}` : `images/avatars/avatar.jpeg`;
        this.ngBuilderForm();
    }

    ngBuilderForm(): void {
        this.form = this._formBuilder.group({
            avatar : [null],
            name_en   : [this.data?.name_en,   Validators.required],
            email  : [this.data?.email, [Validators.required, Validators.pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$")]],
            phone  : [this.data?.phone, [Validators.required, Validators.pattern("^[0-9]*$")]],
        });
    }

    onFileChange(event: any): void {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.src = e.target.result; // Preview image
                this.form.get('avatar')?.setValue(e.target.result); // Base64 string
            };
            reader.readAsDataURL(file);
        } else {
            this._snackBarService.openSnackBar(
                { name_kh: 'សូមជ្រើសរើស file ប្រភេទជារូបភាព', name_en: 'Please select an image file.'}, GlobalConstants.error);
        }
    }

    srcChange(base64: string): void {
        this.form.get('avatar').setValue(base64);
    }

    submit(): void {

        if (!this.form.value.avatar) {
            this.form.removeControl('avatar');
        }

        this._accountService.profile(this.form.value).subscribe({
            next: (res: ResponseProfile) => {

                this._userService.user = res.user;
                this.isLoading = true;
                this._snackBarService.openSnackBar(res.message, GlobalConstants.success);

                this._dialogRef.close();
            },
            error: (err) => {

                this._errorHandleService.handleHttpError(err);

                this.form.enable();
            },
        });
    }
}

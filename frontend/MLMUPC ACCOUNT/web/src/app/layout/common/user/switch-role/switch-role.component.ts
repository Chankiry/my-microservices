import { CommonModule }     from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule }  from '@angular/material/button';
import { MatIconModule }    from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Role }             from 'app/core/user/user.types';

@Component({
    selector     : 'user-switch-role',
    templateUrl  : './switch-role.component.html',
    styleUrls    : ['./switch-role.component.scss'],
    standalone   : true,
    imports      : [CommonModule, MatIconModule, MatButtonModule],
})
export class SwitchRoleComponent {

    roles: Role[] = [];

    constructor(
        private _dialogRef         : MatDialogRef<SwitchRoleComponent>,
        @Inject(MAT_DIALOG_DATA) data: { roles: Role[] },
    ) {
        this.roles = data?.roles ?? [];
    }

    selectRole(role: Role): void {
        this._dialogRef.close(role); // pass selected role back to parent
    }

    close(): void {
        this._dialogRef.close();
    }
}

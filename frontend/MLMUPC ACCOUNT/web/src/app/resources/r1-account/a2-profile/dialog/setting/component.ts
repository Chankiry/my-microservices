import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
    standalone: true,
    imports: [
        MatIconModule,
        MatDialogModule,
        MatButtonModule,
    ],
    selector: 'update-setting',
    templateUrl: 'template.html'
})

export class UpdateSettingComponent implements OnInit {
    constructor() { }

    ngOnInit() { }
}
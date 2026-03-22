import { NgIf } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HelperConfigService, Scheme } from 'helper/services/config';

@Component({
    selector: 'scheme',
    templateUrl: './scheme.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        MatIconModule,
        MatButtonModule,
        NgIf
    ]
})
export class SchemeComponent {

    constructor(private _helperConfigService: HelperConfigService) { }

    isDark: boolean = true;
    setScheme(scheme: Scheme): void {
        this.isDark = false;
        if (scheme === 'light') {
            this.isDark = true;
        }
        this._helperConfigService.config = { scheme };
    }
}

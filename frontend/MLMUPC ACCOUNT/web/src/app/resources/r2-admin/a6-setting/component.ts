// ================================================================================>> Core Library
import { CommonModule, HashLocationStrategy, LocationStrategy, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit }                            from '@angular/core';
import { FormControl, ReactiveFormsModule }                                           from '@angular/forms';
import { Router, RouterModule }                                                       from '@angular/router';

// ================================================================================>> Third Party Library
// ===>> Material

// ===>> RxJS
import { Subject, takeUntil }                                                         from 'rxjs';

// ================================================================================>> Custom Library
// ===>> Env
import { env }                                                                        from 'envs/env';

// ===>> Core
import { UserService }                                                                from 'app/core/user/user.service';
import { User }                                                                       from 'app/core/user/user.types';

// ===>> Helper Library
import { SnackbarService }                                                            from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants                                                                from 'helper/shared/constants';

// ===>> Shared
import { ErrorHandleService }                                                         from 'app/shared/error-handle.service';
import { DialogConfigService }                                                        from 'app/shared/dialog-config.service';

// ===>> Local
import { AdminSettingService }                                                      from './service';

@Component({
    selector    : 'admin-setting',
    standalone  : true,
    templateUrl : './template.html',
    styleUrl    : './style.scss',
    providers   : [{ provide: LocationStrategy, useClass: HashLocationStrategy }],
    imports     : [ ],
})
export class AdminSettingComponent implements OnInit, OnDestroy {

    // ===>> Prevent Memory Leaks
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _changeDetectorRef   : ChangeDetectorRef,
        private _userService         : UserService,
        private _snackBarService     : SnackbarService,
        private _service             : AdminSettingService,
        private _errorHandleService  : ErrorHandleService,
        private _dialogConfigService : DialogConfigService
    ) { }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {
    }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule }          from '@angular/forms';
import { MatButtonModule }      from '@angular/material/button';
import { MatIconModule }        from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink }   from '@angular/router';
import { Subject }              from 'rxjs';

@Component({
    standalone  : true,
    imports     : [
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        RouterLink,
    ],
    selector    : 'overview-login',
    templateUrl : 'template.html',
})
export class OverviewLoginComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(private _router: Router) {}

    ngOnInit(): void {}

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    navigateToSignIn(): void {
        this._router.navigate(['/auth/sign-in']);
    }
}

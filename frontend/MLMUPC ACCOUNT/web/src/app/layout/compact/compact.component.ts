import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule }      from '@angular/material/button';
import { MatIconModule }        from '@angular/material/icon';
import { RouterOutlet }         from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { NavigationService }    from 'app/core/navigation/navigation.service';
import { UserService }          from 'app/core/user/user.service';
import { Role, User }           from 'app/core/user/user.types';
import { LanguagesComponent }   from 'app/layout/common/languages/languages.component';
import { SchemeComponent }      from 'app/layout/common/scheme/scheme.component';
import { UserComponent }        from 'app/layout/common/user/user.component';
import { env }                  from 'envs/env';
import { HelperFullscreenComponent }    from 'helper/components/fullscreen';
import { HelperLoadingBarComponent }    from 'helper/components/loading-bar';
import { HelperNavigationComponent, HelperNavigationItem, HelperNavigationService } from 'helper/components/navigation';
import { RoleEnum }             from 'helper/enums/role.enum';
import { HelperMediaWatcherService } from 'helper/services/media-watcher';
import { Subject, takeUntil }   from 'rxjs';

@Component({
    selector      : 'compact-layout',
    templateUrl   : './compact.component.html',
    encapsulation : ViewEncapsulation.None,
    standalone    : true,
    imports       : [
        HelperLoadingBarComponent,
        HelperNavigationComponent,
        UserComponent,
        MatIconModule,
        MatButtonModule,
        LanguagesComponent,
        HelperFullscreenComponent,
        RouterOutlet,
        TranslocoModule,
    ],
})
export class CompactLayoutComponent implements OnInit, OnDestroy {

    public appVersion    : string = env.APP_VERSION;
    public navigations   : HelperNavigationItem[];
    public user          : User;
    public role          : Role;
    public translatedRole: RoleEnum;
    public activeLang    : string = '';
    public screenWidth   = window.innerWidth;
    public isScreenSmall : boolean;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _navigationService       : NavigationService,
        private _userService             : UserService,
        private _helperMediaWatcherService : HelperMediaWatcherService,
        private _helperNavigationService : HelperNavigationService,
        private _changeDetectorRef       : ChangeDetectorRef,
        private _translocoService        : TranslocoService,
    ) {}

    ngOnInit(): void {
        window.addEventListener('resize', () => {
            this.screenWidth = window.innerWidth;
        });

        this._navigationService.navigations$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: HelperNavigationItem[]) => {
                this.navigations = navigation;
                this._changeDetectorRef.markForCheck();
            });

        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;
                this._changeDetectorRef.markForCheck();
            });

        this._helperMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    toggleNavigation(name: string): void {
        const navigation = this._helperNavigationService.getComponent<HelperNavigationComponent>(name);
        if (navigation) navigation.toggle();
    }
}

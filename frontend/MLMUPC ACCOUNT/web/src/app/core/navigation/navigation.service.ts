import { Injectable } from '@angular/core';
import { HelperNavigationItem } from 'helper/components/navigation';
import { RoleEnum } from 'helper/enums/role.enum';
import { Observable, ReplaySubject } from 'rxjs';
import { Role } from '../user/user.types';
import { navigationData } from './navigation.data';

@Injectable({ providedIn: 'root' })
export class NavigationService {

    private _navigation: ReplaySubject<HelperNavigationItem[]> = new ReplaySubject<HelperNavigationItem[]>(1);

    set navigations(role: Role) {
        switch (role.name_kh) {
            case RoleEnum.ADMIN:     this._navigation.next(navigationData.admin);     break;
            default: this._navigation.next([]); break;
        }
    }

    get navigations$(): Observable<HelperNavigationItem[]> {
        return this._navigation.asObservable();
    }
}


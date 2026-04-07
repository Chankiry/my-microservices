import { Injectable }           from '@angular/core';
import { HelperNavigationItem } from 'helper/components/navigation';
import { RoleEnum }             from 'helper/enums/role.enum';
import { Observable, ReplaySubject } from 'rxjs';
import { navigationData }       from './navigation.data';
import { Role } from '../user/user.types';

@Injectable({ providedIn: 'root' })
export class NavigationService {

    private _navigation = new ReplaySubject<HelperNavigationItem[]>(1);

    set navigations(role: Role) {
        switch (role.slug) {
            case 'admin': this._navigation.next(navigationData.admin); break;
            default     : this._navigation.next([]);                   break;
        }
    }

    get navigations$(): Observable<HelperNavigationItem[]> {
        return this._navigation.asObservable();
    }
}

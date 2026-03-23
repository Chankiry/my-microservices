import { BooleanInput }            from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, forwardRef, inject } from '@angular/core';
import { MatIconModule }           from '@angular/material/icon';
import { HelperNavigationService } from 'helper/components/navigation/navigation.service';
import { HelperNavigationItem }    from 'helper/components/navigation/navigation.types';
import { HelperNavigationBasicItemComponent }       from 'helper/components/navigation/basic/basic.component';
import { HelperNavigationCollapsableItemComponent } from 'helper/components/navigation/collapsable/collapsable.component';
import { HelperNavigationDividerItemComponent }     from 'helper/components/navigation/divider/divider.component';
import { HelperNavigationComponent }               from 'helper/components/navigation/navigation.component';
import { Subject, takeUntil }      from 'rxjs';

@Component({
    selector        : 'helper-navigation-group-item',
    templateUrl     : './group.component.html',
    changeDetection : ChangeDetectionStrategy.OnPush,
    standalone      : true,
    imports         : [
        MatIconModule,
        HelperNavigationBasicItemComponent,
        HelperNavigationCollapsableItemComponent,
        HelperNavigationDividerItemComponent,
        forwardRef(() => HelperNavigationGroupItemComponent),
    ],
})
export class HelperNavigationGroupItemComponent implements OnInit, OnDestroy {
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_autoCollapse: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    private _changeDetectorRef       = inject(ChangeDetectorRef);
    private _helperNavigationService = inject(HelperNavigationService);

    @Input() autoCollapse: boolean;
    @Input() item        : HelperNavigationItem;
    @Input() name        : string;

    private __helperNavigationComponent: HelperNavigationComponent;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    ngOnInit(): void {
        this.__helperNavigationComponent =
            this._helperNavigationService.getComponent(this.name);

        this.__helperNavigationComponent.onRefreshed
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    trackByFn(index: number, item: HelperNavigationItem): any {
        return item.id || index;
    }
}

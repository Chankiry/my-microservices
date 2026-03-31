import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewEncapsulation,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HelperLoadingService } from 'helper/services/loading';
import { Subject, takeUntil }   from 'rxjs';

@Component({
    selector          : 'helper-loading-bar',
    templateUrl       : './loading-bar.component.html',
    styleUrls         : ['./loading-bar.component.scss'],
    encapsulation     : ViewEncapsulation.None,
    // OnPush prevents the ExpressionChangedAfterItHasBeenCheckedError:
    // changes are only applied when we explicitly call markForCheck(),
    // which we do safely after each emission — not during the check phase.
    changeDetection   : ChangeDetectionStrategy.OnPush,
    exportAs          : 'helperLoadingBar',
    standalone        : true,
    imports           : [MatProgressBarModule],
})
export class HelperLoadingBarComponent implements OnChanges, OnInit, OnDestroy {

    private _helperLoadingService = inject(HelperLoadingService);
    private _changeDetectorRef    = inject(ChangeDetectorRef);

    @Input() autoMode : boolean = true;

    mode    : 'determinate' | 'indeterminate' = 'indeterminate';
    progress: number  = 0;
    show    : boolean = false;

    private _unsubscribeAll = new Subject<any>();

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    ngOnChanges(changes: SimpleChanges): void {
        if ('autoMode' in changes) {
            this._helperLoadingService.setAutoMode(
                coerceBooleanProperty(changes.autoMode.currentValue)
            );
        }
    }

    ngOnInit(): void {
        this._helperLoadingService.mode$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this.mode = value;
                this._changeDetectorRef.markForCheck();
            });

        this._helperLoadingService.progress$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                // Clamp to [0, 100] — service can emit null or negative
                // values transiently when requests complete out of order
                this.progress = Math.max(0, Math.min(100, value ?? 0));
                this._changeDetectorRef.markForCheck();
            });

        this._helperLoadingService.show$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this.show = value;
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}

import { Overlay, OverlayRef }              from '@angular/cdk/overlay';
import { TemplatePortal }                   from '@angular/cdk/portal';
import { CommonModule, NgTemplateOutlet }   from '@angular/common';
import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component,
    OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule }      from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule }        from '@angular/material/icon';
import { MatTooltipModule }     from '@angular/material/tooltip';
import { UserService }          from 'app/core/user/user.service';
import { User }                 from 'app/core/user/user.types';
import { Notification }         from 'app/layout/common/notifications/interface';
import { NotificationsService } from 'app/layout/common/notifications/service';
import { KhmerDatePipe }        from 'helper/pipes/khmer-date.pipe';
import { Subject, takeUntil }   from 'rxjs';

@Component({
    selector        : 'notifications',
    templateUrl     : './template.html',
    styleUrls       : ['./style.scss'],
    encapsulation   : ViewEncapsulation.None,
    changeDetection : ChangeDetectionStrategy.OnPush,
    exportAs        : 'notifications',
    standalone      : true,
    imports         : [
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        NgTemplateOutlet,
        KhmerDatePipe,
        CommonModule,
        MatDialogModule,
    ],
})
export class NotificationsComponent implements OnInit, OnDestroy {
    @ViewChild('notificationsOrigin') private _notificationsOrigin: any;
    @ViewChild('notificationsPanel') private _notificationsPanel: TemplateRef<any>;

    notifications : Notification[] = [];
    unreadCount   : number = 0;

    private _overlayRef   : OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _changeDetectorRef    : ChangeDetectorRef,
        private _notificationsService : NotificationsService,
        private _overlay              : Overlay,
        private _viewContainerRef     : ViewContainerRef,
        private _userService          : UserService,
        private _matDialog            : MatDialog,
    ) {}

    ngOnInit(): void {
        this._notificationsService.notifications$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((notifications: Notification[]) => {
                this.notifications = notifications;
                this.unreadCount   = notifications.filter(n => !n.read).length;
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        if (this._overlayRef) this._overlayRef.dispose();
    }

    openPanel(): void {
        if (!this._notificationsPanel || !this._notificationsOrigin) return;
        if (!this._overlayRef) this._createOverlay();
        this._overlayRef.attach(
            new TemplatePortal(this._notificationsPanel, this._viewContainerRef)
        );
    }

    closePanel(): void {
        this._overlayRef?.detach();
    }

    markAllAsRead(): void {
        this._notificationsService.markAllAsRead().subscribe();
    }

    trackByFn(index: number, item: Notification): any {
        return item.id || index;
    }

    private _createOverlay(): void {
        this._overlayRef = this._overlay.create({
            hasBackdrop     : true,
            backdropClass   : 'helper-backdrop-on-mobile',
            scrollStrategy  : this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay.position()
                .flexibleConnectedTo(this._notificationsOrigin._elementRef ?? this._notificationsOrigin)
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
                    { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'top' },
                ]),
        });
        this._overlayRef.backdropClick().subscribe(() => this.closePanel());
    }
}

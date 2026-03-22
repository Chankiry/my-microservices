import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule, DatePipe, HashLocationStrategy, LocationStrategy, NgClass, NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MatDialogConfig, MatDialog, MatDialogModule, MAT_DIALOG_DATA, MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { Notification } from 'app/layout/common/notifications/interface';
import { NotificationsService } from 'app/layout/common/notifications/service';
import { SharedTrackingComponent } from 'app/resources/r3-volunteer/v1-dashboard/tracking-dialog/component';
import { SharedViewUserComponent } from 'app/resources/r3-volunteer/v1-dashboard/viewUser/component';
import { env } from 'envs/env';
import { KhmerDatePipe } from 'helper/pipes/khmer-date.pipe';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'notifications',
    templateUrl: './template.html',
    styleUrls: ['./style.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'notifications',
    standalone: true,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        NgClass,
        NgTemplateOutlet,
        RouterLink,
        KhmerDatePipe,
        CommonModule,
        MatDialogModule,
        SharedTrackingComponent
    ],
    providers: [
        // Add these providers for MDC dialogs
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: true } },
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: DatePipe, useClass: KhmerDatePipe },
    ]

})
export class NotificationsComponent implements OnInit, OnDestroy {
    @ViewChild('notificationsOrigin') private _notificationsOrigin: MatButton;
    @ViewChild('notificationsPanel')
    private _notificationsPanel: TemplateRef<any>;
    fileUrl: string = env.FILE_BASE_URL;
    notifications: Notification[] = [];
    unreadCount: number = 0;
    private _overlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    cvId: number;
    tracking_id: number
    isChat: boolean = false
    user_name: string
    item: any
    user: any
    role: any
    typeReq: number

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _notificationsService: NotificationsService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
        private _matDialog           : MatDialog,
        private _userService         : UserService,
    ) { }

    cleanNotificationText(text: string): string {
        return text.replace(/^["']+|["']+$/g, '')
                .replace(/^“|”$/g, '')
                .trim();
    }
    ngOnInit(): void {
        this._userService.user$.pipe(takeUntil(this._unsubscribeAll)).subscribe((user: User) => {

            this.user = user;
            if(this.user.roles.length === 1){
                this.role = 3
            }else if(this.user.roles.length === 2){
                this.role = 2
            }else if(this.user.roles.length === 3){
                this.role = 1
            }
            if(this.role === 2){
                this.typeReq = 3
            }else if(this.role === 3){
                this.typeReq = 7
            }
            this._changeDetectorRef.markForCheck();
        });
        this._notificationsService.notifications$.pipe(takeUntil(this._unsubscribeAll)).subscribe((data: Notification[]) => {
            this.notifications = data;
            this._calculateUnreadCount(); // Recalculate unread count
            this._changeDetectorRef.markForCheck(); // Trigger view update
        });

        // // Connect to the WebSocket server
        this._notificationsService.connect();
    }
    groupedNotifications: any[] = [];

    groupNotifications() {
        const groups = new Map();

        this.notifications.forEach(notification => {
            const creatorId = notification.creator?.id || 'unknown';

            if (!groups.has(creatorId)) {
            groups.set(creatorId, {
                ...notification,
                count: 1,
                notifications: [notification]
            });
            } else {
            const group = groups.get(creatorId);
            group.count++;
            group.notifications.push(notification);
            // Keep the most recent notification as the main one
            if (new Date(notification.assigned_at) > new Date(group.assigned_at)) {
                Object.assign(group, notification);
            }
            }
        });

        this.groupedNotifications = Array.from(groups.values());
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();

        // Disconnect from the WebSocket server
        this._notificationsService.disconnect();

        if (this._overlayRef) {
            this._overlayRef.dispose();
        }
    }

    openPanel(): void {
        this.item = null
        if (!this._notificationsPanel || !this._notificationsOrigin) {
            return;
        }

        if (!this._overlayRef) {
            this._createOverlay();
        }

        // Check if overlay already has content
        if (this._overlayRef.hasAttached()) {
            this._overlayRef.detach(); // Detach existing content first
        }

        this._overlayRef.attach(new TemplatePortal(this._notificationsPanel, this._viewContainerRef));
    }
    closeDialog() {
        this.item = null
    }

    closePanel(): void {
        this._overlayRef.detach();
    }

    markAllAsRead(): void {
        this._notificationsService.markAllAsRead().subscribe();
    }

    toggleRead(notification: Notification): void {
        notification.read = !notification.read;
        this._notificationsService.update(notification.id, notification).subscribe();
    }

    delete(notification: Notification): void {
        this._notificationsService.delete(notification.id).subscribe();
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    private _createOverlay(): void {
        this._overlayRef = this._overlay.create({
            hasBackdrop: true,
            backdropClass: 'helper-backdrop-on-mobile',
            scrollStrategy: this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay
                .position()
                .flexibleConnectedTo(this._notificationsOrigin._elementRef.nativeElement)
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
                    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
                    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
                ]),
        });
        this._overlayRef.backdropClick().subscribe(() => this._overlayRef.detach());
    }

    private _calculateUnreadCount(): void {
        this.unreadCount = this.notifications.filter(notification => !notification.read).length;
    }
    dialogRef: MatDialogRef<SharedViewUserComponent>;
    openMessage(item: any, typeReq: number){
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = false;
        dialogConfig.disableClose = false;
        dialogConfig.position = { right: '0px' };
        dialogConfig.height = '100dvh';
        if(typeReq === 7){
            dialogConfig.width = '650px';
        }else{
            dialogConfig.width = '1000px';
        }
        dialogConfig.maxWidth = 'auto';
        dialogConfig.panelClass = 'custom-mat-dialog-as-mat-drawer';
        dialogConfig.enterAnimationDuration = '0s';
        dialogConfig.data = {
            item,
            type: 'notification',
            typeReq: this.typeReq,
            isNotification: false,
            role: this.role
        }
        this.toggleRead(item)

        let dialogRef: MatDialogRef<any>;
        dialogRef = this._matDialog.open(SharedViewUserComponent, dialogConfig);

        // Subscribe to a custom event from child to change width
        dialogRef.componentInstance.widthChange.subscribe((newWidth: string) => {
            dialogRef.updateSize(newWidth, dialogRef.componentInstance.currentHeight || '100dvh');
        });
        dialogRef.componentInstance.trackingUpdated?.subscribe((updated) => {
            if (updated) {
                this.refreshParentData();
            }
        });
        this.closeDialog()
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                // This will be triggered when the dialog closes with a result
                this._changeDetectorRef.markForCheck();
                // Add any additional refresh logic you need here
                this.refreshParentData(); // Implement this method to refresh your parent component's data
            }
        });
    }
    refreshParentData(){
        this._changeDetectorRef.markForCheck();
    }
    toggleChat(item){
        this.isChat = !this.isChat
        this.cvId = item?.cv_id
        this.tracking_id = item?.tracking_id
        this.user_name = item?.creator?.name
        this.item = item
        if(!item.read){
            this.toggleRead(item)
        }
    }

}

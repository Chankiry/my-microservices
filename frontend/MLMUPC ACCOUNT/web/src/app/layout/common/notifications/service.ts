import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { Notification } from 'app/layout/common/notifications/interface';
import { env } from 'envs/env';
import { catchError, map, Observable, of, ReplaySubject, switchMap, take, timeout } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
    private _notifications = new ReplaySubject<Notification[]>(1);
    private _socket?: Socket;
    private _user?: User;
    private _notificationsCache: Notification[] = [];

    constructor(
        private _httpClient: HttpClient,
        private _userService: UserService
    ) {
        this._userService.user$.pipe(take(1)).subscribe((user: User) => {
            this._user = user;
            if (user) {
                this.connect();
            }
        });
    }

    get notifications$(): Observable<Notification[]> {
        return this._notifications.asObservable();
    }

    set notifications(value: Notification[]) {
        this._notificationsCache = value;
        this._notifications.next(value);
    }

    connect(): void {
        if (this._socket) return; // Avoid duplicate connections

        this._socket = io(env.SOCKET_URL + '/notifications-getway', {
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 3000
        });

        this._socket.on('connect', () => {
            console.log('WebSocket connected');
            this.register();
        });

        this._socket.on('new-order-notification', () => {
            this.refresh();
        });

        this._socket.on('notification-update', () => {
            this.refresh();
        });

        this._socket.on('connect_error', (error) => {
            console.warn(`WebSocket connection failed: ${error.message}`);
        });

        this._socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
    }

    private _mapApiNotificationToNotification(n: any): Notification {
        return {
            id: n.id,
            cv_id: n.cv_id,
            tracking_id: n.tracking_id,
            title: n.title,
            text: n.text,
            read: n.read,
            assigned_at: new Date(n.assigned_at),
            creator: n.creator
                ? { id: n.creator.id, name: n.creator.name, avatar: n.creator.avatar }
                : null,
            receiver: n.receiver
                ? { id: n.receiver.id, name: n.receiver.name, avatar: n.receiver.avatar }
                : null,
        };
    }

    register(): void {
        if (this._user?.id) {
            this._socket?.emit('register', this._user.id);
        }
    }

    disconnect(): void {
        this._socket?.disconnect();
        this._socket = undefined;
    }

    /** Manually reload notifications (use after submit or manual refresh) */
    refresh(): void {
        this.getAll().subscribe();
    }

    /** Fetch notifications from API */
    getAll(): Observable<Notification[]> {
        const apiUrl = `${env.API_BASE_URL}/shared/web-notifications`;
        return this._httpClient.get<{ data: any[] }>(apiUrl).pipe(
            timeout(5000),
            map(res => {
                const notifications = res.data.map(n => this._mapApiNotificationToNotification(n));
                this.notifications = notifications;
                return notifications;
            }),
            catchError(err => {
                console.warn('Error fetching notifications:', err.message || err);
                return of([]);
            })
        );
    }

    markAllAsRead(): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            switchMap(notifications =>
                this._httpClient.get<boolean>(`${env.API_BASE_URL}/common/notifications/mark-all-as-read`).pipe(
                    timeout(5000),
                    map(isUpdated => {
                        if (isUpdated) {
                            const updated = notifications.map(n => ({ ...n, read: true }));
                            this._notificationsCache = updated;
                            this._notifications.next(updated);
                        }
                        return isUpdated;
                    }),
                    catchError(() => of(false))
                )
            )
        );
    }

    update(id: number, notification: Notification): Observable<Notification> {
        return this._httpClient.patch<Notification>(
            `${env.API_BASE_URL}/shared/web-notifications/${id}/read`,
            { read: notification.read }
        ).pipe(
            timeout(5000),
            map(updated => {
                this.refresh();
                return updated;
            }),
            catchError(() => {
                return of(notification);
            })
        );
    }

    delete(id: number): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            switchMap(() =>
                this._httpClient.delete<boolean>(
                    `${env.API_BASE_URL}/shared/web-notifications/${id}`,
                    { params: { id: id.toString() } }
                ).pipe(
                    timeout(5000),
                    map(isDeleted => {
                        if (isDeleted) {
                            this.refresh();
                        }
                        return isDeleted;
                    }),
                    catchError(() => of(false))
                )
            )
        );
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}

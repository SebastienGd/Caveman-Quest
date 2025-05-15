import { Injectable, signal, WritableSignal } from '@angular/core';
import { NotificationMessage } from '@app/interfaces/notification-message';
import { NOTIFICATION_TIMEOUT } from 'src/utils/constants/notification-constants';
import { SocketClientService } from './socket-client.service';
import { RoomEvent } from '@common/constants/room-events';
@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    notifications: WritableSignal<NotificationMessage[]> = signal([]);

    constructor(private socketService: SocketClientService) {
        this.configure();
    }

    addNotification(message: string, canClose: boolean = true) {
        const newNotification: NotificationMessage = { message, canClose, isFadingOut: false };
        this.notifications.update((notifs) => [...notifs, newNotification]);

        setTimeout(() => {
            this.notifications.update((notifs) => notifs.filter((n) => n !== newNotification));
        }, NOTIFICATION_TIMEOUT);
    }

    removeNotification(notification: NotificationMessage) {
        this.notifications.update((notifs) => notifs.filter((n) => n !== notification));
    }

    private configure() {
        this.socketService.on(RoomEvent.Notify, (notification: string, canClose: boolean = true) => {
            this.addNotification(notification, canClose);
        });
    }
}

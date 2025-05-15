import { Component, Signal } from '@angular/core';
import { NotificationMessage } from '@app/interfaces/notification-message';
import { NotificationService } from '@app/services/notification.service';

@Component({
    selector: 'app-notification-popup',
    imports: [],
    templateUrl: './notification-popup.component.html',
    styleUrl: './notification-popup.component.scss',
})
export class NotificationPopupComponent {
    notifications: Signal<NotificationMessage[]> = this.notificationPopupService.notifications.asReadonly();
    constructor(private notificationPopupService: NotificationService) {}

    remove(message: NotificationMessage) {
        this.notificationPopupService.removeNotification(message);
    }
}

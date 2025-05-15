import { ComponentFixture, TestBed } from '@angular/core/testing';

import { signal, WritableSignal } from '@angular/core';
import { NotificationMessage } from '@app/interfaces/notification-message';
import { NotificationService } from '@app/services/notification.service';
import { NotificationPopupComponent } from './notification-popup.component';

describe('NotificationPopupComponent', () => {
    let component: NotificationPopupComponent;
    let fixture: ComponentFixture<NotificationPopupComponent>;
    let notificationServiceMock: jasmine.SpyObj<NotificationService>;
    let notificationsSignal: WritableSignal<NotificationMessage[]>;

    beforeEach(async () => {
        notificationsSignal = signal<NotificationMessage[]>([]);

        notificationServiceMock = jasmine.createSpyObj<NotificationService>('NotificationService', ['removeNotification']);
        Object.defineProperty(notificationServiceMock, 'notifications', {
            get: () => notificationsSignal,
        });

        await TestBed.configureTestingModule({
            imports: [NotificationPopupComponent],
            providers: [{ provide: NotificationService, useValue: notificationServiceMock }],
        }).compileComponents();

        fixture = TestBed.createComponent(NotificationPopupComponent);

        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should call removeNotification when remove is triggered', () => {
        const testMessage: NotificationMessage = { isFadingOut: false, canClose: true, message: 'Test Notification' };
        component.remove(testMessage);
        expect(notificationServiceMock.removeNotification).toHaveBeenCalledWith(testMessage);
    });
});

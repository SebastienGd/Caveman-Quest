import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NOTIFICATION_TIMEOUT } from 'src/utils/constants/notification-constants';
import { NotificationService } from './notification.service';
import { SocketClientService } from './socket-client.service';
import { RoomEvent } from '@common/constants/room-events';

describe('NotificationService', () => {
    let service: NotificationService;
    let socketClientMock: jasmine.SpyObj<SocketClientService>;

    beforeEach(() => {
        socketClientMock = jasmine.createSpyObj('SocketClientService', ['on']);

        TestBed.configureTestingModule({
            providers: [NotificationService, { provide: SocketClientService, useValue: socketClientMock }],
        });

        service = TestBed.inject(NotificationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add a notification', () => {
        service.addNotification('Test Notification');

        expect(service.notifications().length).toBe(1);
        expect(service.notifications()[0].message).toBe('Test Notification');
    });

    it('should remove a notification', () => {
        service.addNotification('Test Notification');
        const notification = service.notifications()[0];

        service.removeNotification(notification);

        expect(service.notifications().length).toBe(0);
    });

    it('should remove a notification automatically after timeout', fakeAsync(() => {
        service.addNotification('Auto-remove Notification');
        expect(service.notifications().length).toBe(1);

        tick(NOTIFICATION_TIMEOUT);
        expect(service.notifications().length).toBe(0);
    }));

    it('should register a socket listener on initialization', () => {
        expect(socketClientMock.on).toHaveBeenCalledWith(RoomEvent.Notify, jasmine.any(Function));
    });

    it('should handle notifications from the socket service', () => {
        const callback = socketClientMock.on.calls.argsFor(0)[1];
        callback('Socket Notification');

        expect(service.notifications().length).toBe(1);
        expect(service.notifications()[0].message).toBe('Socket Notification');
    });
});

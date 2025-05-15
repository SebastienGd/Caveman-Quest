import { TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router, RouterOutlet } from '@angular/router';
import { NotificationPopupComponent } from '@app/components/notification-popup/notification-popup.component';
import { AppComponent } from '@app/pages/app/app.component';
import { SocketClientService } from '@app/services/socket-client.service';

describe('AppComponent', () => {
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let routerMock: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        socketServiceMock = jasmine.createSpyObj('SocketClientService', ['on']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [AppComponent, BrowserAnimationsModule, RouterOutlet, NotificationPopupComponent],
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: Router, useValue: routerMock },
            ],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should subscribe to socket event on initialization', () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        expect(socketServiceMock.on).toHaveBeenCalledWith('redirectTo', jasmine.any(Function));
    });

    it('should navigate to the specified route when socket event is emitted', () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const route = '/some-route';
        const callback = socketServiceMock.on.calls.argsFor(0)[1];
        callback(route);
        expect(routerMock.navigate).toHaveBeenCalledWith([route]);
    });
});

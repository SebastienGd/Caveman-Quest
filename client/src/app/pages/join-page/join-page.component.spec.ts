import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SocketClientService } from '@app/services/socket-client.service';
import { CharacterEvent } from '@common/constants/character-events';
import { JoinPageComponent } from './join-page.component';

describe('JoinPageComponent', () => {
    let component: JoinPageComponent;
    let fixture: ComponentFixture<JoinPageComponent>;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        const socketServiceSpyObj = jasmine.createSpyObj('SocketClientService', [], { socket: jasmine.createSpyObj('socket', ['emit']) });
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [JoinPageComponent],
            providers: [
                { provide: Router, useValue: routerSpyObj },
                { provide: SocketClientService, useValue: socketServiceSpyObj },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinPageComponent);
        component = fixture.componentInstance;
        socketServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should navigate to home when handleBackClick is called', () => {
        component.handleBackClick();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['home']);
    });

    it('should call joinGame on JoinService when tryJoinGame is called', () => {
        component.code = '1234';
        component.tryJoinGame();
        expect(socketServiceSpy.socket.emit).toHaveBeenCalledWith(CharacterEvent.JoinGameWithCode, '1234');
    });
});

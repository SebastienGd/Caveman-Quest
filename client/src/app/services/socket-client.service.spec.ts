import { TestBed } from '@angular/core/testing';
import { Socket } from 'socket.io-client';
import { SocketClientService } from './socket-client.service';

type CallbackSignature = (params: unknown) => void;

class SocketTestHelper {
    private callbacks = new Map<string, CallbackSignature[]>();
    on(event: string, callback: CallbackSignature): void {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event)?.push(callback);
    }

    // eslint-disable-next-line no-unused-vars
    emit(event: string, ...params: unknown[]): void {
        return;
    }
}
describe('SocketClientService', () => {
    let service: SocketClientService;
    let socketTestHelper: SocketTestHelper;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SocketClientService);
        socketTestHelper = new SocketTestHelper();
        service.socket = socketTestHelper as unknown as Socket;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call socket.on with an event and action', () => {
        const event = 'testEvent';
        const action = jasmine.createSpy('action');
        const onSpy = spyOn(socketTestHelper, 'on');

        service.on(event, action);

        expect(onSpy).toHaveBeenCalledWith(event, action);
    });

    it('should call socket.emit with data when using send', () => {
        const event = 'testEvent';
        const data = { key: 'value' };
        const emitSpy = spyOn(socketTestHelper, 'emit');

        service.send(event, data);

        expect(emitSpy).toHaveBeenCalledWith(event, data);
    });

    it('should call socket.emit without data when using send if data is undefined', () => {
        const event = 'testEvent';
        const data = undefined;
        const emitSpy = spyOn(socketTestHelper, 'emit');

        service.send(event, data);

        expect(emitSpy).toHaveBeenCalledWith(event);
    });

    it('should call socket.emit with data and callback when using send', () => {
        const event = 'testEvent';
        const data = { key: 'value' };
        const callback = jasmine.createSpy('callback');
        const emitSpy = spyOn(socketTestHelper, 'emit');

        service.send(event, data, callback);

        expect(emitSpy).toHaveBeenCalledWith(event, data, callback);
    });
});

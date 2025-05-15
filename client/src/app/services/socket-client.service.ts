import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;

    constructor() {
        this.connect();
    }

    on<T>(event: string, action: (data: T) => void): void {
        this.socket.on(event, action);
    }

    send<T>(event: string, data?: T, callback?: unknown): void {
        this.socket.emit(event, ...[data, callback].filter((x) => x));
    }

    private connect() {
        this.socket = io(environment.serverUrl, { transports: ['websocket'], upgrade: false });
    }
}

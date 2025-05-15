/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-shadow */
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { ChatMessage } from '@common/interfaces/chat-message';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { ChatSocketService } from './chat-socket.service';
import { RouteManager } from './routes-manager';

describe('ChatSocketService', () => {
    let io: Server;
    let clientSocket: ClientSocket;
    let socketServer: Socket;
    let sandbox: sinon.SinonSandbox;
    let service: ChatSocketService;
    let routeManagerMock: sinon.SinonStubbedInstance<RouteManager>;
    let getStub: sinon.SinonStub;
    let hasStub: sinon.SinonStub;

    const PORT = 3030;
    const ROOM_CODE = 'room123';

    before((done) => {
        sandbox = sinon.createSandbox();
        routeManagerMock = sandbox.createStubInstance(RouteManager);
        io = new Server(PORT, { cors: { origin: '*' } });

        routeManagerMock.io = io;
        routeManagerMock.onWrapper.callsFake((event: string, socket: Socket, handler: (...args: unknown[]) => void) => {
            socket.on(event, (...args: unknown[]) => handler(...args));
        });

        service = new ChatSocketService(routeManagerMock as unknown as RouteManager);

        io.on('connection', (socket) => {
            socket.data = ROOM_CODE;
            socketServer = socket;
            service.setupEventHandlers(socket);
        });

        clientSocket = ioClient(`http://localhost:${PORT}`, { forceNew: true });
        clientSocket.on('connect', done);
    });

    beforeEach(() => {
        service.createChatRoom(ROOM_CODE);
        sandbox.resetHistory();

        routeManagerMock.broadcastToGameRoom = sandbox.stub();
        routeManagerMock.broadcastToWaitingRoom = sandbox.stub();
        routeManagerMock.broadcastToStatsRoom = sandbox.stub();

        service['chatMessages'].set(ROOM_CODE, []);
    });

    afterEach(() => {
        sandbox.restore();
        getStub?.restore?.();
        hasStub?.restore?.();
    });

    after((done) => {
        clientSocket.disconnect();
        io.close(done);
    });

    it('should store and broadcast message to game room if socket is in game room', (done) => {
        hasStub = sandbox.stub(socketServer.rooms, 'has');
        hasStub.withArgs(Room.Game + ROOM_CODE).returns(true);
        hasStub.withArgs(Room.Waiting + ROOM_CODE).returns(false);

        const content = 'Hello game!';
        const author = 'Player1';

        routeManagerMock.broadcastToGameRoom.callsFake((code: string, event: string, messages: ChatMessage[]) => {
            expect(code).to.equal(ROOM_CODE);
            expect(event).to.equal(RoomEvent.ChatMessage);
            expect(messages[0].content).to.equal(content);
            expect(messages[0].author).to.equal(author);
            done();
        });

        clientSocket.emit(RoomEvent.ChatMessage, { author, content });
    });

    it('should store and broadcast message to waiting room if socket is in waiting room', (done) => {
        hasStub = sandbox.stub(socketServer.rooms, 'has');
        hasStub.withArgs(Room.Waiting + ROOM_CODE).returns(true);
        hasStub.withArgs(Room.Game + ROOM_CODE).returns(false);

        const content = 'Hello waiting!';
        const author = 'Player2';

        routeManagerMock.broadcastToWaitingRoom.callsFake((code: string, event: string, messages: ChatMessage[]) => {
            expect(code).to.equal(ROOM_CODE);
            expect(event).to.equal(RoomEvent.ChatMessage);
            expect(messages[0].content).to.equal(content);
            expect(messages[0].author).to.equal(author);
            done();
        });

        clientSocket.emit(RoomEvent.ChatMessage, { author, content });
    });

    it('should store and broadcast message to stats room if socket is in stats room', (done) => {
        hasStub = sandbox.stub(socketServer.rooms, 'has');
        hasStub.withArgs(Room.Stats + ROOM_CODE).returns(true);
        hasStub.withArgs(Room.Waiting + ROOM_CODE).returns(false);
        hasStub.withArgs(Room.Game + ROOM_CODE).returns(false);

        const content = 'Hello stats!';
        const author = 'PlayerStats';

        routeManagerMock.broadcastToStatsRoom.callsFake((code: string, event: string, messages: ChatMessage[]) => {
            expect(code).to.equal(ROOM_CODE);
            expect(event).to.equal(RoomEvent.ChatMessage);
            expect(messages[0].content).to.equal(content);
            expect(messages[0].author).to.equal(author);
            done();
        });

        clientSocket.emit(RoomEvent.ChatMessage, { author, content });
    });

    it('should emit fallback error if socket is in no valid room', (done) => {
        hasStub = sandbox.stub(socketServer.rooms, 'has').returns(false);
        const spy = sinon.spy(socketServer, 'emit');

        const content = 'Test fallback';
        const author = 'Player3';

        clientSocket.emit(RoomEvent.ChatMessage, { author, content });

        setTimeout(() => {
            expect(routeManagerMock.broadcastToGameRoom.called).to.be.false;
            expect(routeManagerMock.broadcastToWaitingRoom.called).to.be.false;

            const notifyCall = spy.getCalls().find((c) => c.args[0] === RoomEvent.Notify);
            expect(notifyCall).to.exist;
            expect(notifyCall.args[1]).to.include('Erreur');
            done();
        }, 50);
    });

    it('should ignore empty messages', (done) => {
        hasStub = sandbox.stub(socketServer.rooms, 'has').returns(true);

        clientSocket.emit(RoomEvent.ChatMessage, { author: 'Tester', content: '   ' });

        setTimeout(() => {
            expect(routeManagerMock.broadcastToGameRoom.called).to.be.false;
            expect(routeManagerMock.broadcastToWaitingRoom.called).to.be.false;
            done();
        }, 50);
    });

    it('should ignore overly long messages', (done) => {
        hasStub = sandbox.stub(socketServer.rooms, 'has').returns(true);

        const longMessage = 'a'.repeat(201);
        clientSocket.emit(RoomEvent.ChatMessage, { author: 'Tester', content: longMessage });

        setTimeout(() => {
            expect(routeManagerMock.broadcastToGameRoom.called).to.be.false;
            expect(routeManagerMock.broadcastToWaitingRoom.called).to.be.false;
            done();
        }, 50);
    });

    it('should remove chat room if no more sockets remain', () => {
        const waitingRoom = new Set<string>();
        const gameRoom = new Set<string>();

        getStub = sandbox.stub(io.sockets.adapter.rooms, 'get');
        getStub.withArgs(Room.Waiting + ROOM_CODE).returns(waitingRoom);
        getStub.withArgs(Room.Game + ROOM_CODE).returns(gameRoom);

        service['chatMessages'].set(ROOM_CODE, []);
        service['handleDisconnecting'](socketServer);
        expect(service['chatMessages'].has(ROOM_CODE)).to.be.false;
    });

    it('should not remove chat room if sockets still present in waiting or game room', () => {
        const waitingRoom = new Set<string>(['socket1']);
        const gameRoom = new Set<string>();

        getStub = sandbox.stub(io.sockets.adapter.rooms, 'get');
        getStub.withArgs(Room.Waiting + ROOM_CODE).returns(waitingRoom);
        getStub.withArgs(Room.Game + ROOM_CODE).returns(gameRoom);

        service['chatMessages'].set(ROOM_CODE, []);
        service['handleDisconnecting'](socketServer);
        expect(service['chatMessages'].has(ROOM_CODE)).to.be.true;
    });

    it('should not overwrite existing chat room when createChatRoom is called again', () => {
        const originalArray: ChatMessage[] = [{ author: 'test', content: 'msg', timestamp: '00:00:00' }];
        service['chatMessages'].set(ROOM_CODE, originalArray);

        service.createChatRoom(ROOM_CODE);

        const sameRef = service['chatMessages'].get(ROOM_CODE);
        expect(sameRef).to.equal(originalArray);
    });

    it('should return early if chat room does not exist for given code', (done) => {
        hasStub = sandbox.stub(socketServer.rooms, 'has').returns(true);

        service['chatMessages'].delete(ROOM_CODE);

        const spyGame = routeManagerMock.broadcastToGameRoom;
        const spyWait = routeManagerMock.broadcastToWaitingRoom;

        clientSocket.emit(RoomEvent.ChatMessage, { author: 'Ghost', content: 'This should not show up' });

        setTimeout(() => {
            expect(spyGame.called).to.be.false;
            expect(spyWait.called).to.be.false;
            done();
        }, 20);
    });

    it('should return early in handleDisconnecting if socket.data is undefined', () => {
        const socketStub = { data: undefined } as unknown as Socket;

        const proto = Object.getPrototypeOf(service);
        const spy = sinon.spy(proto, 'removeChatRoom');

        service.handleDisconnecting(socketStub);

        expect(spy.called).to.be.false;

        spy.restore();
    });

    it('should remove chat room if no sockets remain in waiting or game rooms', () => {
        const code = ROOM_CODE;

        const socketStub = { data: code } as unknown as Socket;

        const getStub = sandbox.stub(io.sockets.adapter.rooms, 'get');
        getStub.withArgs(Room.Waiting + code).returns(new Set());
        getStub.withArgs(Room.Game + code).returns(new Set());

        const proto = Object.getPrototypeOf(service);
        const spy = sandbox.spy(proto, 'removeChatRoom');

        service.handleDisconnecting(socketStub);
        expect(spy.calledOnceWithExactly(code)).to.be.true;
    });

    it('should broadcast chat messages to waiting room for a given code', () => {
        const fakeMessages: ChatMessage[] = [
            { author: 'Tester', content: 'salut', timestamp: '12:00:00' },
            { author: 'Bot', content: 'yo', timestamp: '12:01:00' },
        ];
        service['chatMessages'].set(ROOM_CODE, fakeMessages);

        service.broadcastWaitingRoomChat(ROOM_CODE);

        expect(routeManagerMock.broadcastToWaitingRoom.calledOnce).to.be.true;
        const [code, event, payload] = routeManagerMock.broadcastToWaitingRoom.firstCall.args;

        expect(code).to.equal(ROOM_CODE);
        expect(event).to.equal(RoomEvent.ChatMessage);
        expect(payload).to.deep.equal(fakeMessages);
    });

    it('should return early if no chat messages exist for given code', () => {
        const spy = routeManagerMock.broadcastToWaitingRoom;
        service['chatMessages'].delete(ROOM_CODE);

        service.broadcastWaitingRoomChat(ROOM_CODE);

        expect(spy.called).to.be.false;
    });
});

/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoomEvent } from '@common/constants/room-events';
import { WebRoute } from '@common/constants/web-routes';
import { expect } from 'chai';
import * as http from 'http';
import * as sinon from 'sinon';
import { io as ioClient, Socket } from 'socket.io-client';
import { CharacterSocketService } from './character.service';
import { ChatSocketService } from './chat-socket.service';
import { CombatSocketService } from './combat-socket.service';
import { EndGameStatsSocketService } from './end-game-stats-socket.service';
import { GameJournalService } from './game-journal.service';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';
import { SocketManager } from './socket-manager.service';
import { WaitingRoomSocketService } from './waiting-room-socket.service';

const RESPONSE_DELAY = 100;
const SOCKET_ROOM = 'TEST';
const PORT = 3002;
const TIMEOUT_MS = 10;

describe('SocketManager service tests', () => {
    let server: http.Server;
    let socketManager: SocketManager;
    let clientSocket: Socket;
    let socketCharacterMock: sinon.SinonStubbedInstance<CharacterSocketService>;
    let socketWaitingRoomMock: sinon.SinonStubbedInstance<WaitingRoomSocketService>;
    let gameServiceMock: sinon.SinonStubbedInstance<GameSocketService>;
    let combatServiceMock: sinon.SinonStubbedInstance<CombatSocketService>;
    let chatServiceMock: sinon.SinonStubbedInstance<ChatSocketService>;
    let endGameStatsMock: sinon.SinonStubbedInstance<EndGameStatsSocketService>;
    let routeManager: sinon.SinonStubbedInstance<RouteManager>;
    let gameJournalMock: sinon.SinonStubbedInstance<GameJournalService>;
    let sandbox: sinon.SinonSandbox;

    beforeEach((done) => {
        sandbox = sinon.createSandbox();
        server = http.createServer();
        socketCharacterMock = sandbox.createStubInstance(CharacterSocketService);
        socketWaitingRoomMock = sandbox.createStubInstance(WaitingRoomSocketService);
        gameServiceMock = sandbox.createStubInstance(GameSocketService);
        combatServiceMock = sandbox.createStubInstance(CombatSocketService);
        chatServiceMock = sandbox.createStubInstance(ChatSocketService);
        endGameStatsMock = sandbox.createStubInstance(EndGameStatsSocketService);
        gameJournalMock = sandbox.createStubInstance(GameJournalService);
        routeManager = sandbox.createStubInstance(RouteManager);

        socketManager = new SocketManager(
            socketCharacterMock,
            socketWaitingRoomMock,
            gameServiceMock,
            combatServiceMock,
            chatServiceMock,
            routeManager,
            endGameStatsMock,
            gameJournalMock,
        );

        socketManager.setServer(server);

        routeManager.onWrapper.callsFake((event: string, socket: unknown, handler: (...args: unknown[]) => void) => {
            (socket as Socket).on(event, (...args: unknown[]) => handler(...args));
        });

        server.listen(PORT, () => {
            (socketManager as any).handleSockets();
            socketManager['sio'].on('connection', (socket) => {
                socket.data = 'someData';
                socket.join(SOCKET_ROOM + socket.data);
            });
            clientSocket = ioClient(`http://localhost:${PORT}`);
            clientSocket.once('connect', () => {
                done();
            });
        });
    });

    afterEach((done) => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
        setTimeout(() => {
            socketManager['sio'].close();
            server.close(() => {
                done();
            });
        }, RESPONSE_DELAY);
    });

    it('should call handleDisconnecting on disconnecting event', async () => {
        clientSocket.disconnect();

        await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));

        expect(socketCharacterMock.handleDisconnecting.called).to.be.true;
        expect(socketWaitingRoomMock.handleDisconnecting.called).to.be.true;
        expect(gameServiceMock.handleDisconnecting.called).to.be.true;
        expect(combatServiceMock.handleDisconnecting.called).to.be.true;
        expect(endGameStatsMock.handleDisconnecting.called).to.be.true;
        expect(chatServiceMock.handleDisconnecting.called).to.be.true;
    });

    it('should call handleQuit when RoomEvent.Quit is emitted', async () => {
        clientSocket.emit(RoomEvent.Quit);

        await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));

        expect(socketCharacterMock.handleDisconnecting.called).to.be.true;
        expect(socketWaitingRoomMock.handleDisconnecting.called).to.be.true;
        expect(gameServiceMock.handleDisconnecting.called).to.be.true;
        expect(combatServiceMock.handleDisconnecting.called).to.be.true;
        expect(endGameStatsMock.handleDisconnecting.called).to.be.true;
        expect(chatServiceMock.handleDisconnecting.called).to.be.true;
    });

    it('should emit RedirectTo if client is not in the correct room', (done) => {
        const onRedirect = (route: WebRoute) => {
            expect(route).to.equal(WebRoute.Home);
            clientSocket.off(RoomEvent.RedirectTo, onRedirect);
            done();
        };

        clientSocket.on(RoomEvent.RedirectTo, onRedirect);
        clientSocket.emit(RoomEvent.VerifyRoom, 'WRONG_ROOM');
    });

    it('should not emit RedirectTo if client is in the correct room', async () => {
        let redirectEmitted = false;

        clientSocket.on(RoomEvent.RedirectTo, () => {
            redirectEmitted = true;
        });

        clientSocket.emit(RoomEvent.VerifyRoom, SOCKET_ROOM);

        await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));
        expect(redirectEmitted).to.be.false;
    });
});

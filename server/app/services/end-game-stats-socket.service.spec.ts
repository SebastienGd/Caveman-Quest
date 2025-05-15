/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
import { GameRoomEvent } from '@common/constants/game-room-events';
import { Room } from '@common/constants/rooms';
import { GameBase } from '@common/interfaces/game';
import { Map, GameMode } from '@common/interfaces/map';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { EndGameStatsSocketService } from './end-game-stats-socket.service';
import { RouteManager } from './routes-manager';

describe('EndGameStatsSocketService', () => {
    let service: EndGameStatsSocketService;
    let routeManagerMock: sinon.SinonStubbedInstance<RouteManager>;
    let io: Server;
    let clientSocket: ClientSocket;
    let socketServer: Socket;
    let sandbox: sinon.SinonSandbox;

    const PORT = 3040;
    const ACCESS_CODE = 'stats123';

    const fakeMap: Map = {
        _id: '',
        name: '',
        description: '',
        mode: GameMode.Classical,
        size: 10,
        tiles: [],
        createdAt: '',
        updatedAt: '',
        visibility: true,
    };

    const fakeGame: GameBase = {
        code: ACCESS_CODE,
        map: fakeMap,
        players: [],
        data: { debugging: false, turnIsEnding: false, transitioning: false, gameIsOver: false },
        stats: { duration: 0, nbTurns: 0, doorInteractedPercentage: 0, tilesVisitedPercentage: 0, nbPlayersHeldFlag: 0 },
    };

    before((done) => {
        sandbox = sinon.createSandbox();
        routeManagerMock = sandbox.createStubInstance(RouteManager);
        io = new Server(PORT, { cors: { origin: '*' } });

        routeManagerMock.io = io;
        service = new EndGameStatsSocketService(routeManagerMock as unknown as RouteManager);

        io.on('connection', (socket) => {
            socket.data = ACCESS_CODE;
            socketServer = socket;
        });

        clientSocket = ioClient(`http://localhost:${PORT}`, { forceNew: true });
        clientSocket.on('connect', done);
    });

    afterEach(() => {
        sandbox.restore();
    });

    after((done) => {
        clientSocket.disconnect();
        io.close(done);
    });

    it('should add a stats room and broadcast stats', () => {
        routeManagerMock.broadcastToStatsRoom = sandbox.stub();

        service.addStatsRoom(fakeGame);

        expect(service['statsRooms'].has(ACCESS_CODE)).to.be.true;
        expect(routeManagerMock.broadcastToStatsRoom.calledWith(ACCESS_CODE, GameRoomEvent.UpdateGame, fakeGame)).to.be.true;
    });

    it('should handle disconnect and remove stats room if no sockets left', () => {
        sandbox.stub(io.sockets.adapter.rooms, 'get').returns(undefined);

        service['statsRooms'].set(ACCESS_CODE, fakeGame);

        service.handleDisconnecting(socketServer);

        expect(service['statsRooms'].has(ACCESS_CODE)).to.be.false;
        expect(socketServer.rooms.has(Room.Stats + ACCESS_CODE)).to.be.false;
    });

    it('should handle disconnect and not remove stats room if sockets remain', () => {
        const roomWithSockets = new Set<string>(['socket1']);
        sandbox
            .stub(io.sockets.adapter.rooms, 'get')
            .withArgs(Room.Stats + ACCESS_CODE)
            .returns(roomWithSockets);

        service['statsRooms'].set(ACCESS_CODE, fakeGame);

        service.handleDisconnecting(socketServer);

        expect(service['statsRooms'].has(ACCESS_CODE)).to.be.true;
    });

    it('should return early in handleDisconnecting if no stats room exists', () => {
        const leaveSpy = sinon.spy(socketServer, 'leave');
        service['statsRooms'].delete(ACCESS_CODE);

        service.handleDisconnecting(socketServer);

        expect(leaveSpy.calledWith(Room.Stats + ACCESS_CODE)).to.be.false;
    });
});

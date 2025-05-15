/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
import { Game } from '@app/classes/game';
import { GameMap } from '@app/classes/game-map';
import { Timer } from '@app/classes/timer';
import { PositionedPlayer } from '@app/interfaces/positionned-player';
import { GameEvent } from '@app/utils/constants/game-events';
import { NotificationMessage } from '@app/utils/constants/notification-messages';
import { TimerEvent } from '@app/utils/constants/timer-events';
import * as gameChecks from '@app/utils/game-checks';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { GameData } from '@common/interfaces/game';
import { ObjectName } from '@common/interfaces/object';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { EventEmitter } from 'stream';
import { EndGameStatsSocketService } from './end-game-stats-socket.service';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));
const player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8')) as Player;
const player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8')) as Player;
const player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8')) as Player;
const player4 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player4.json'), 'utf8')) as Player;
const players = [player1, player2, player3, player4];

describe('GameSocketService', () => {
    let service: GameSocketService;
    let routeManagerMock: sinon.SinonStubbedInstance<RouteManager>;
    let endGameStatsMock: sinon.SinonStubbedInstance<EndGameStatsSocketService>;
    let gameMock: sinon.SinonStubbedInstance<Game>;
    let mapMock: sinon.SinonStubbedInstance<GameMap>;

    let clientSockets: ClientSocket[];
    let sandbox: sinon.SinonSandbox;
    let io: Server;
    const PORT = 3003;
    const ACCESS_CODE = '1234';
    const MAX_AMOUNT_PLAYERS = 4;

    function testEventHandler(
        eventEmitter: sinon.SinonStubbedInstance<EventEmitter>,
        eventName: string,
        eventData: unknown,
        verification?: () => void,
    ) {
        eventEmitter.on.callsFake((event, callback) => {
            if (event === eventName) {
                callback(eventData);
                verification?.();
            }
            return gameMock;
        });
        service['setupGameEventHandlers'](gameMock);
    }

    before((done) => {
        io = new Server(PORT, { cors: { origin: '*' } });
        done();
    });
    beforeEach((done) => {
        sandbox = sinon.createSandbox();
        gameMock = sandbox.createStubInstance(Game);
        gameMock.timer = new Timer();
        mapMock = sandbox.createStubInstance(GameMap);
        gameMock.map = mapMock;
        gameMock.players = [player1];
        gameMock.data = { gameIsOver: false } as GameData;

        routeManagerMock = sandbox.createStubInstance(RouteManager);
        endGameStatsMock = sandbox.createStubInstance(EndGameStatsSocketService);
        service = new GameSocketService(routeManagerMock, endGameStatsMock);
        routeManagerMock.io = io;

        routeManagerMock.onWrapper.callsFake((event: string, socket: Socket, handler: (...args: unknown[]) => void) => {
            socket.on(event, (...args: unknown[]) => handler(...args));
        });

        io.on('connection', (socket) => {
            socket.data = ACCESS_CODE;
            service.setupEventHandlers(socket);
            socket.join(Room.Game + ACCESS_CODE);
        });

        gameMock.code = ACCESS_CODE;
        service.addGame(gameMock);

        clientSockets = Array(MAX_AMOUNT_PLAYERS)
            .fill(null)
            .map(() =>
                ioClient(`http://localhost:${PORT}`, {
                    autoConnect: false,
                    forceNew: true,
                }),
            );

        let connectedCount = 0;
        clientSockets.forEach((socket, index) => {
            socket.on('connect', () => {
                players[index].id = socket.id;
                connectedCount++;
                if (connectedCount === clientSockets.length) {
                    done();
                }
            });
            socket.connect();
        });
        sandbox.stub(gameChecks, 'isActivePlayer').returns(true);
    });

    afterEach((done) => {
        sandbox.restore();
        io.removeAllListeners('connection');
        const connectedSockets = clientSockets.filter((socket) => socket.connected);
        if (connectedSockets.length === 0) {
            done();
            return;
        }

        let disconnectedCount = 0;
        connectedSockets.forEach((socket) => {
            socket.removeAllListeners();
            socket.on('disconnect', () => {
                disconnectedCount++;
                if (disconnectedCount === connectedSockets.length) {
                    done();
                }
            });
            socket.disconnect();
        });
    });

    after((done) => {
        io.close(() => {
            done();
        });
    });

    it('should get a game', () => {
        const result = service.getGame(ACCESS_CODE);
        expect(result).to.equal(gameMock);
    });

    it('should remove a game', () => {
        service.removeGame(ACCESS_CODE);
        const result = service.getGame(ACCESS_CODE);
        return expect(result).to.be.undefined;
    });

    it('should call createGame function', () => {
        const gameBase = {
            map,
            players: [player1],
            code: ACCESS_CODE,
            data: { debugging: false, transitioning: false, turnIsEnding: false, gameIsOver: true },
            stats: {
                duration: 0,
                nbTurns: 0,
                doorInteractedPercentage: 0,
                tilesVisitedPercentage: 0,
                nbPlayersHeldFlag: 0,
            },
        };
        expect(service.createGame(gameBase)).to.not.equal(undefined);
    });

    it('should call createGame function', () => {
        const gameBase = {
            map,
            players: [player1],
            code: ACCESS_CODE,
            data: { debugging: false, transitioning: false, turnIsEnding: false, gameIsOver: false },
            stats: {
                duration: 0,
                nbTurns: 0,
                doorInteractedPercentage: 0,
                tilesVisitedPercentage: 0,
                nbPlayersHeldFlag: 0,
            },
        };
        expect(service.createGame(gameBase)).to.not.equal(undefined);
    });

    it('should broadcast timer updates when Timer emits NewTime event', () => {
        const TEST_TIME = 4;
        sinon.stub(gameMock.timer, 'time').get(() => TEST_TIME);
        gameMock.timer.emit(TimerEvent.NewTime, gameMock.timer.time);

        return expect(routeManagerMock.broadcastToGameRoom.calledWith(gameMock.code, GameRoomEvent.TimerValue, TEST_TIME)).to.be.true;
    });

    describe('SocketEvents', () => {
        it('should return undefined if game is paused or player is not active', () => {
            const socket = { data: ACCESS_CODE, id: 'inactive-socket-id' } as unknown as Socket;
            sandbox.stub(service, 'getGame').returns(undefined);
            const result = service.getGameIfActivePlayer(socket);
            expect(result).to.be.undefined;
        });

        it('should broadcast on UpdateGame event', async () => {
            const broadcastPromise = new Promise((resolve) => routeManagerMock.broadcastGameWithAccessibleTiles.callsFake(resolve));
            clientSockets[0].emit(GameRoomEvent.UpdateGame);
            await broadcastPromise;

            return expect(routeManagerMock.broadcastGameWithAccessibleTiles.calledWith(gameMock)).to.be.true;
        });

        it('should handle MovePlayer event', (done) => {
            const pos = { x: 2, y: 3 } as Position;
            gameMock.movePlayer.callsFake(() => {
                try {
                    return expect(gameMock.movePlayer.calledWith(pos)).to.be.true && done();
                } catch (err) {
                    done(err);
                }
            });

            clientSockets[0].emit(GameRoomEvent.MovePlayer, pos);
        });
        it('should handle MovePlayer event if not game', async () => {
            sinon.stub(service, 'getGame').returns(null);
            clientSockets[0].emit(GameRoomEvent.MovePlayer, {} as Position);
            await new Promise((r) => setImmediate(r));
            return expect(gameMock.movePlayer.called).to.be.false;
        });

        it('should handle InteractWithDoor event', (done) => {
            const posA = { x: 1, y: 3 } as Position;
            const pos = { x: 2, y: 3 } as Position;
            gameMock.activePlayer = { position: posA } as PositionedPlayer;
            gameMock.activePlayer.position = posA;

            gameMock.interactWithDoor.callsFake(() => {
                try {
                    return expect(gameMock.interactWithDoor.calledWith(posA, pos)).to.be.true && done();
                } catch (err) {
                    done(err);
                }
            });

            clientSockets[0].emit(GameRoomEvent.InteractWithDoor, pos);
        });

        it('should handle EndTurn event', (done) => {
            gameMock.endTurn.callsFake(() => {
                try {
                    return expect(gameMock.endTurn.called).to.be.true && done();
                } catch (err) {
                    done(err);
                }
            });
            clientSockets[0].emit(GameRoomEvent.EndTurn);
        });

        it('should not handle EndTurn event if game is paused', async () => {
            gameMock.timer.pause();
            clientSockets[0].emit(GameRoomEvent.EndTurn);
            await new Promise((r) => setImmediate(r));
            return expect(gameMock.endTurn.called).to.be.false;
        });

        it('should handle FindEntitiesAtProximity event', async () => {
            gameMock.activePlayer = { player: { actionsLeft: 1 }, position: { x: 1, y: 3 } } as PositionedPlayer;
            mapMock.findPlayersAtProximity.returns(1);
            mapMock.findDoorsAtProximity.returns(1);

            const updatePromise = new Promise((resolve) => clientSockets[0].once(GameRoomEvent.UpdateGame, resolve));
            clientSockets[0].emit(GameRoomEvent.FindEntitiesAtProximity);
            await updatePromise;

            return expect(mapMock.resetTilesData.calledOnce).to.be.true;
        });

        it('should handle FindEntitiesAtProximity if no moves left', async () => {
            gameMock.activePlayer = { player: { actionsLeft: 0 }, position: { x: 1, y: 3 } } as PositionedPlayer;
            clientSockets[0].emit(GameRoomEvent.FindEntitiesAtProximity);
            return expect(mapMock.resetTilesData.calledOnce).to.be.false;
        });

        it('should toggle debug mode when admin sends ToggleDebugMode event', async () => {
            gameMock.data = { debugging: false, gameIsOver: false } as GameData;
            sandbox.stub(gameChecks, 'isAdmin').returns(true);

            const debugModeCalled = new Promise<void>((r) => gameMock.setDebugMode.callsFake(() => r()));
            clientSockets[0].emit(GameRoomEvent.ToggleDebugMode);
            await debugModeCalled;

            return expect(gameMock.setDebugMode.calledWith(true)).to.be.true;
        });

        it('should not toggle debug mode when non-admin sends event', async () => {
            gameMock.data = { debugging: false, gameIsOver: false } as GameData;
            sandbox.stub(gameChecks, 'isAdmin').returns(false);

            clientSockets[0].emit(GameRoomEvent.ToggleDebugMode);
            await new Promise((r) => setImmediate(r));

            return expect(gameMock.setDebugMode.called).to.be.false;
        });

        it('should handle select object', (done) => {
            gameMock.swapPlayerObject.callsFake(() => {
                try {
                    return expect(gameMock.swapPlayerObject.calledWith(ObjectName.Bird)).to.be.true && done();
                } catch (err) {
                    done(err);
                }
            });
            clientSockets[0].emit(GameRoomEvent.SelectObject, ObjectName.Bird);
        });
    });
    describe('GameEvents', () => {
        it('should broadcast MovePlayer events from game', () => {
            const pos = { x: 2, y: 3 };
            testEventHandler(gameMock, GameEvent.MovePlayer, pos, () => {
                expect(gameMock.movePlayer.calledWith(pos));
            });
        });

        it('should broadcast debug notify when DebugModeChange event and debug is on', () => {
            gameMock.data = { debugging: false, gameIsOver: false } as GameData;
            testEventHandler(gameMock, GameEvent.DebugModeChange, undefined, () => {
                return expect(routeManagerMock.broadcastToGameRoom.calledWith(gameMock.code, RoomEvent.Notify, NotificationMessage.DebugIsOff)).to.be
                    .true;
            });
        });

        it('should broadcast debug notify when DebugModeChange event and debug is off', () => {
            gameMock.data = { debugging: true, gameIsOver: false } as GameData;
            testEventHandler(gameMock, GameEvent.DebugModeChange, undefined, () => {
                return expect(routeManagerMock.broadcastToGameRoom.calledWith(gameMock.code, RoomEvent.Notify, NotificationMessage.DebugIsOn)).to.be
                    .true;
            });
        });

        it('should broadcast UpdateGame when NewTurn event', () => {
            gameMock.activePlayer = { player: { name: 'test' } as Player } as PositionedPlayer;
            testEventHandler(gameMock, GameEvent.NewTurn, gameMock.activePlayer.player, () => {
                return expect(
                    routeManagerMock.broadcastToGameRoom.calledWith(
                        gameMock.code,
                        RoomEvent.Notify,
                        NotificationMessage.NewTurnIs + gameMock.activePlayer.player.name,
                    ),
                ).to.be.true;
            });
        });

        it('should broadcast UpdateGame when UpdateAccessibleGame event', () => {
            testEventHandler(gameMock, GameEvent.UpdateAccessibleGame, undefined, () => {
                return expect(routeManagerMock.broadcastGameWithAccessibleTiles.called).to.be.true;
            });
        });

        it('should handle winner when ending game correctly', (done) => {
            routeManagerMock.broadcastTo.callsFake((gameCode: string, event: string, condition: (socket: Socket) => boolean) => {
                return (
                    expect(gameCode === gameMock.code).to.be.true &&
                    expect(event === RoomEvent.Notify).to.be.true &&
                    expect(condition(io.sockets.sockets.get(clientSockets[0].id))).to.be.true &&
                    done()
                );
            });
            player1.id = clientSockets[0].id;
            testEventHandler(gameMock, GameEvent.EndGame, player1);
        });

        it('should handle no winner when ending game correctly', () => {
            testEventHandler(gameMock, GameEvent.EndGame, null, () => {
                return expect(routeManagerMock.broadcastToGameRoom.calledWith(gameMock.code, RoomEvent.Notify, NotificationMessage.NoWinner)).to.be
                    .true;
            });
        });

        it('should call disconnectPlayer when game exists', () => {
            const socket = {
                data: ACCESS_CODE,
                players: [player1],
                id: 'test-socket-id',
                leave: sinon.stub(),
                emit: sinon.stub(),
            } as unknown as Socket;
            sinon.stub(service, 'getGame').returns(gameMock);
            service.handleDisconnecting(socket);

            return expect(gameMock.disconnectPlayer.calledWith(socket.id)).to.be.true;
        });

        it('should not call disconnectPlayer when game doesnt exists', () => {
            const socket = {
                data: ACCESS_CODE,
                players: [player1],
                id: 'test-socket-id',
                leave: sinon.stub(),
                emit: sinon.stub(),
            } as unknown as Socket;
            sinon.stub(service, 'getGame').returns(null);
            service.handleDisconnecting(socket);

            return expect(gameMock.disconnectPlayer.called).to.be.false;
        });
        it('should delete game when last humain disconnects', () => {
            const socket = {
                data: ACCESS_CODE,
                players: [player1],
                id: 'test-socket-id',
                leave: sinon.stub(),
                emit: sinon.stub(),
            } as unknown as Socket;

            const temp = sinon.stub(gameChecks, 'isVirtualPlayer').returns(true);

            sinon.stub(service, 'getGame').returns(gameMock);
            const deleteSpy = sinon.spy(service, 'removeGame');

            service.handleDisconnecting(socket);
            temp.restore();
            return expect(gameMock.disconnectPlayer.calledWith(socket.id)).to.be.true && expect(deleteSpy.called).to.be.true;
        });

        it('should broadcast ManagePlayerInventory when this event is emitted', () => {
            testEventHandler(gameMock, GameRoomEvent.ManagePlayerInventory, undefined, () => {
                return expect(routeManagerMock.broadcastTo.calledWith(gameMock.code, GameRoomEvent.ManagePlayerInventory, sinon.match.func)).to.be
                    .true;
            });
        });

        it('should handle EndGameCTF and notify winners and losers correctly', () => {
            player1.id = clientSockets[0].id;
            player2.id = clientSockets[1].id;

            const winner = player1;
            const loser = player2;

            let winnerCondition: (s: Socket) => boolean;
            let loserCondition: (s: Socket) => boolean;

            routeManagerMock.broadcastTo.onFirstCall().callsFake((code, event, condition, message) => {
                winnerCondition = condition;
                expect(message).to.equal(NotificationMessage.YourTeamWon);
            });

            routeManagerMock.broadcastTo.onSecondCall().callsFake((code, event, condition, message) => {
                loserCondition = condition;
                expect(message).to.equal(NotificationMessage.YourTeamLost);
            });

            testEventHandler(gameMock, GameEvent.EndGameCTF, [winner], () => {
                const winnerSocket = { id: winner.id } as Socket;
                const loserSocket = { id: loser.id } as Socket;

                return (
                    expect(winnerCondition(winnerSocket)).to.be.true &&
                    expect(winnerCondition(loserSocket)).to.be.false &&
                    expect(loserCondition(winnerSocket)).to.be.false &&
                    expect(loserCondition(loserSocket)).to.be.true &&
                    expect(routeManagerMock.broadcastToGameRoom.calledWith(gameMock.code, GameRoomEvent.UpdateGame)).to.be.true
                );
            });
        });
    });

    it('should not add stats room on end game when no winner', (done) => {
        sandbox.stub(global, 'setTimeout').callsFake((fn: (...args: unknown[]) => void) => {
            fn();
            return 0 as unknown as NodeJS.Timeout;
        });

        testEventHandler(gameMock, GameEvent.EndGame, {} as Player, () => {
            expect(endGameStatsMock.addStatsRoom.calledWith(gameMock.toGameBase())).to.be.true;
            done();
        });
    });

    it('should destroy game room on end game', (done) => {
        const destroyRoomSpy = sandbox.spy(service as unknown as { destroyGameRoom: (code: string) => void }, 'destroyGameRoom');

        sandbox.stub(global, 'setTimeout').callsFake((fn: (...args: unknown[]) => void) => {
            fn();
            return 0 as unknown as NodeJS.Timeout;
        });

        testEventHandler(gameMock, GameEvent.EndGame, null, () => {
            expect(destroyRoomSpy.calledWith(gameMock.code)).to.be.true;
            done();
        });
    });
});

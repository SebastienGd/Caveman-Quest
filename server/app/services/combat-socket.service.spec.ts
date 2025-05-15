import { Combat } from '@app/classes/combat';
import { Game } from '@app/classes/game';
import { Timer } from '@app/classes/timer';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { GameEvent } from '@app/utils/constants/game-events';
import * as gameChecks from '@app/utils/game-checks';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { GameBase } from '@common/interfaces/game';
import { Player } from '@common/interfaces/player';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';
import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { CombatSocketService } from './combat-socket.service';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';

describe('CombatSocketService', () => {
    let service: CombatSocketService;
    let gameSocketServiceMock: sinon.SinonStubbedInstance<GameSocketService>;
    let routeManagerMock: sinon.SinonStubbedInstance<RouteManager>;
    let gameMock: sinon.SinonStubbedInstance<Game>;
    let combatMock: sinon.SinonStubbedInstance<Combat>;

    let clientSockets: ClientSocket[];
    let sandbox: sinon.SinonSandbox;
    let io: Server;
    const PORT = 3004;
    const ACCESS_CODE = '1234';
    const PLAYER1_ID = 'player1';
    const TIMEOUT_MS = 40;
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
            return combatMock;
        });
        service['setupCombatEventHandlers'](gameMock);
    }

    before((done) => {
        io = new Server(PORT, { cors: { origin: '*' } });
        done();
    });

    beforeEach((done) => {
        sandbox = sinon.createSandbox();

        gameSocketServiceMock = sandbox.createStubInstance(GameSocketService);
        routeManagerMock = sandbox.createStubInstance(RouteManager);
        gameMock = sandbox.createStubInstance(Game);
        combatMock = sandbox.createStubInstance(Combat);
        combatMock.timer = new Timer();
        gameMock.code = ACCESS_CODE;
        gameMock.combat = combatMock;
        gameMock.toGameBase.returns({} as GameBase);
        gameSocketServiceMock.on.callsFake((event: string | symbol, callback: (...args: unknown[]) => void) => {
            if (event === GameEvent.NewGame) {
                callback(gameMock);
            }
            return gameSocketServiceMock;
        });

        service = new CombatSocketService(gameSocketServiceMock as unknown as GameSocketService, routeManagerMock as unknown as RouteManager);

        routeManagerMock.io = io;
        routeManagerMock.onWrapper.callsFake((event: string, socket: Socket, handler: (...args: unknown[]) => void) => {
            socket.on(event, (...args: unknown[]) => handler(...args));
        });

        io.on('connection', (socket) => {
            socket.data = ACCESS_CODE;
            service.setupEventHandlers(socket);
        });

        clientSockets = [
            ioClient(`http://localhost:${PORT}`, { autoConnect: false, forceNew: true }),
            ioClient(`http://localhost:${PORT}`, { autoConnect: false, forceNew: true }),
        ];
        let connectedCount = 0;
        clientSockets.forEach((socket) => {
            socket.on('connect', () => {
                connectedCount++;
                if (connectedCount === clientSockets.length) {
                    combatMock.activePlayer = { id: clientSockets[0].id } as Player;
                    combatMock.inactivePlayer = { id: clientSockets[1].id } as Player;
                    done();
                }
            });
            socket.connect();
        });
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

    describe('setupCombatEventHandlers', () => {
        it('should notify when combat end with winner', (done) => {
            routeManagerMock.broadcastTo.callsFake((gameCode: string, event: string, condition: (socket: Socket) => boolean, ...args: unknown[]) => {
                return (
                    expect(gameCode === gameMock.code).to.be.true &&
                    expect(event === RoomEvent.Notify).to.be.true &&
                    expect(condition(io.sockets.sockets.get(clientSockets[0].id)) || condition(io.sockets.sockets.get(clientSockets[1].id))).to.be
                        .true &&
                    args.includes('gagné')
                );
            });
            const won = true;
            testEventHandler(combatMock, CombatEvent.CombatEnd, won, () => {
                setTimeout(() => {
                    done();
                }, TIMEOUT_MS);
            });
        });
        it('should notify when combat end with winner', (done) => {
            routeManagerMock.broadcastTo.callsFake((gameCode: string, event: string, condition: (socket: Socket) => boolean, ...args: unknown[]) => {
                return (
                    expect(gameCode === gameMock.code).to.be.true &&
                    expect(event === RoomEvent.Notify).to.be.true &&
                    expect(condition(io.sockets.sockets.get(clientSockets[0].id)) || condition(io.sockets.sockets.get(clientSockets[1].id))).to.be
                        .true &&
                    args.includes('fuit')
                );
            });
            const won = false;
            testEventHandler(combatMock, CombatEvent.CombatEnd, won, () => {
                setTimeout(() => {
                    done();
                }, TIMEOUT_MS);
            });
        });

        it('should updateGame when combat change', (done) => {
            routeManagerMock.broadcastTo.callsFake((gameCode: string, event: string, condition: (socket: Socket) => boolean) => {
                return (
                    expect(gameCode === gameMock.code).to.be.true &&
                    expect(event === GameRoomEvent.UpdateGame).to.be.true &&
                    expect(condition(io.sockets.sockets.get(clientSockets[0].id))).to.be.true &&
                    done()
                );
            });
            testEventHandler(combatMock, CombatEvent.ChangeTurn, null);
        });

        it('should change timer value when combat start', (done) => {
            routeManagerMock.broadcastTo.callsFake((gameCode: string, event: string) => {
                return expect(gameCode === gameMock.code).to.be.true && expect(event === GameRoomEvent.TimerValue).to.be.true && done();
            });
            testEventHandler(combatMock, CombatEvent.CombatStart, null);
        });
    });

    describe('Socket Event Handlers', () => {
        beforeEach(() => {
            sandbox.stub(gameChecks, 'isPlayerInCombat').returns(true);
            sandbox.stub(gameChecks, 'isActiveCombatPlayer').returns(true);
            gameSocketServiceMock.getGame.returns(gameMock);
        });

        it('should handle InitiateCombat event', (done) => {
            const defenderId = 'defenderID here';
            gameSocketServiceMock.handlerWrapper.callsFake((socket: Socket, event: string, callback: (...args: unknown[]) => void) => {
                callback(gameMock, defenderId);
            });

            combatMock.startCombat.callsFake(() => {
                return expect(combatMock.startCombat.calledWith(gameMock, clientSockets[0].id, defenderId)).to.be.true && done();
            });
            service['handleSocketCombatStart'](io.sockets.sockets.get(clientSockets[0].id));
        });

        it('should handle AttackAction event', (done) => {
            combatMock.attack.callsFake(() => {
                try {
                    return expect(combatMock.attack.called).to.be.true && done();
                } catch (err) {
                    done(err);
                }
            });

            clientSockets[0].emit(GameRoomEvent.AttackAction);
        });

        it('should handle EvadeAction event', (done) => {
            combatMock.evade.callsFake(() => {
                try {
                    return expect(combatMock.evade.called).to.be.true && done();
                } catch (err) {
                    done(err);
                }
            });

            clientSockets[0].emit(GameRoomEvent.EvadeAction);
        });
    });

    describe('handleDisconnecting', () => {
        it('should call disconnectPlayer when in combat', () => {
            const socket = {
                data: ACCESS_CODE,
                id: PLAYER1_ID,
            } as unknown as Socket;

            gameSocketServiceMock.getGame.returns(gameMock);
            sandbox.stub(gameChecks, 'isPlayerInCombat').returns(true);

            service.handleDisconnecting(socket);

            return expect(combatMock.disconnectPlayer.calledWith(PLAYER1_ID)).to.be.true;
        });

        it('should not call disconnectPlayer when not in combat', () => {
            const socket = {
                data: ACCESS_CODE,
                id: PLAYER1_ID,
            } as unknown as Socket;

            gameSocketServiceMock.getGame.returns(gameMock);
            sandbox.stub(gameChecks, 'isPlayerInCombat').returns(false);

            service.handleDisconnecting(socket);

            return expect(combatMock.disconnectPlayer.called).to.be.false;
        });
    });
    describe('handlerWrapper', () => {
        it('should not handle events if player not in combat', (done) => {
            sandbox.stub(gameChecks, 'isPlayerInCombat').returns(false);

            clientSockets[0].emit(GameRoomEvent.AttackAction);
            setTimeout(() => {
                try {
                    return expect(combatMock.attack.called).to.be.false && done();
                } catch (err) {
                    done(err);
                }
            }, TIMEOUT_MS);
        });
    });
});

/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
import { Application } from '@app/app';
import { Game } from '@app/classes/game';
import { PositionedPlayer } from '@app/interfaces/positionned-player';
import { RouteManager } from '@app/services/routes-manager';
import * as algorithms from '@app/utils/algorithms';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { WebRoute } from '@common/constants/web-routes';
import { Player } from '@common/interfaces/player';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import * as express from 'express';
import { Router } from 'express';
import { readFileSync } from 'fs';
import { beforeEach, describe, it } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import { Socket } from 'socket.io';
import container from 'typedi';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));

describe('RouteManager', () => {
    let routeManager: RouteManager;
    let router: Router;
    let app: express.Application;
    let mockGame: Game;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockIo: any;
    let highlightStub: sinon.SinonStub;
    beforeEach(() => {
        app = express();
        container.get(Application);
        const player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8'));
        const player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8'));
        const player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8'));
        const players = [player1, player2, player3];
        mockGame = new Game(JSON.parse(JSON.stringify(map)), '1234', players);
        mockIo = {
            to: sinon.stub().returnsThis(),
            emit: sinon.stub(),
        };
        routeManager = new RouteManager();
        router = Router();
        routeManager.io = mockIo;
        highlightStub = sinon.stub(algorithms, 'highlightAccessibleTiles').returns();
        app.use(router);
    });
    afterEach(() => {
        highlightStub.restore();
    });
    describe('onWrapper', () => {
        let socket: sinon.SinonStubbedInstance<Socket>;
        let handler: sinon.SinonStub;

        beforeEach(() => {
            (socket as unknown) = sinon.createStubInstance(Socket);
            handler = sinon.stub();
        });

        it('should call the handler when the event is triggered', () => {
            const args = ['arg1', 'arg2'];
            routeManager.onWrapper('testEvent', socket as unknown as Socket, handler);

            socket.on.callArgWith(1, ...args);

            sinon.assert.calledOnce(handler);
            sinon.assert.calledWithExactly(handler, ...args);
        });

        it('should emit a server error and redirect if the handler throws an error', () => {
            const args = ['arg1', 'arg2'];
            handler.throws(new Error('Test error'));
            routeManager.onWrapper('testEvent', socket as unknown as Socket, handler);

            socket.on.callArgWith(1, ...args);

            sinon.assert.called(socket.emit);
            sinon.assert.calledWithExactly(socket.emit, RoomEvent.Notify, 'problème de serveur', false);
            sinon.assert.calledWithExactly(socket.emit, RoomEvent.RedirectTo, WebRoute.Home);
        });

        it('should not emit any error events if the handler does not throw an error', () => {
            const args = ['arg1', 'arg2'];
            routeManager.onWrapper('testEvent', socket as unknown as Socket, handler);

            socket.on.callArgWith(1, ...args);
            sinon.assert.notCalled(socket.emit);
        });
    });
    describe('broadcast', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let mockSocket: any;

        beforeEach(() => {
            mockSocket = {
                id: 'player1',
                to: sinon.stub().returnsThis(),
                emit: sinon.stub(),
            };
            mockIo.sockets = {
                sockets: new Map([['player1', mockSocket]]),
                adapter: { rooms: new Map() },
            };
            mockGame.activePlayer = { player: { id: 'player1' } as Player } as PositionedPlayer;
        });

        describe('broadcastToGameRoom', () => {
            it('should emit to game room with correct parameters', () => {
                const testData = { test: 'data' };
                routeManager.broadcastToGameRoom(mockGame.code, 'testEvent', testData);

                return (
                    expect(mockIo.to.calledWith(Room.Game + mockGame.code)).to.be.true &&
                    expect(mockIo.to().emit.calledWith('testEvent', testData)).to.be.true
                );
            });
        });

        describe('broadcastToWaitingRoom', () => {
            it('should emit to waiting room with correct parameters', () => {
                const testData = { test: 'data' };
                routeManager.broadcastToWaitingRoom(mockGame.code, 'testEvent', testData);

                expect(mockIo.to.calledWith(Room.Waiting + mockGame.code)).to.be.true;
                expect(mockIo.to().emit.calledWith('testEvent', testData)).to.be.true;
            });
        });

        describe('broadcastToStatsRoom', () => {
            it('should emit to stats room with correct parameters', () => {
                const testData = { test: 'data' };
                routeManager.broadcastToStatsRoom(mockGame.code, 'testEvent', testData);

                expect(mockIo.to.calledWith(Room.Stats + mockGame.code)).to.be.true;
                expect(mockIo.to().emit.calledWith('testEvent', testData)).to.be.true;
            });
        });

        describe('broadcastGameWithAccessibleTiles', () => {
            it('should broadcast to all during transition', () => {
                mockGame.data.turnIsEnding = true;
                const broadcastSpy = sinon.spy(routeManager, 'broadcastToGameRoom');

                routeManager.broadcastGameWithAccessibleTiles(mockGame);

                return expect(broadcastSpy.calledWith(mockGame.code, GameRoomEvent.UpdateGame, mockGame.toGameBase())).to.be.true;
            });

            it('should handle active player broadcast', () => {
                const room = new Set(['player1']);
                mockIo.sockets.adapter.rooms.set(Room.Game + mockGame.code, room);
                routeManager.broadcastGameWithAccessibleTiles(mockGame);

                return expect(mockSocket.emit.calledWith(GameRoomEvent.UpdateGame, mockGame.toGameBase())).to.be.true;
            });
        });

        describe('broadcastTo', () => {
            it('should conditionally emit to matching sockets', () => {
                const room = new Set(['player1']);
                mockIo.sockets.adapter.rooms.set(Room.Game + mockGame.code, room);

                routeManager.broadcastTo(mockGame.code, 'testEvent', (socket) => socket.id === 'player1', 'data');

                return expect(mockSocket.emit.calledWith('testEvent', 'data')).to.be.true;
            });

            it('should not emit to non-matching sockets', () => {
                const room = new Set(['player1']);
                mockIo.sockets.adapter.rooms.set(Room.Game + mockGame.code, room);

                routeManager.broadcastTo(mockGame.code, 'testEvent', (socket) => socket.id === 'otherPlayer', 'data');

                return expect(mockSocket.emit.called).to.be.false;
            });

            it('should not broadcast if invalid room', () => {
                const room = new Set(['player1']);
                mockIo.sockets.adapter.rooms.set(Room.Game + mockGame.code, room);

                routeManager.broadcastTo(mockGame.code + ' INVALID ROOM', 'testEvent', (socket) => socket.id === 'player1', 'data');

                return expect(mockSocket.emit.called).to.be.false;
            });
        });
    });
});

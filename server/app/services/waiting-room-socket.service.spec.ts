/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DefensiveVirtualPlayer } from '@app/classes/defensive-virtual-player';
import { OffensiveVirtualPlayer } from '@app/classes/offensive-virtual-player';
import { WaitingRoomSocketService } from '@app/services/waiting-room-socket.service';
import { VIRTUAL_PLAYER_NAMES } from '@app/utils/constants/virtual-player-names';
import { AVATARS } from '@common/constants/avatars';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { WaitingRoomEvent } from '@common/constants/waiting-room-events';
import { GameMode, Map } from '@common/interfaces/map';
import { Dice, Player, PlayerAttributes, PlayerData, PlayerStats } from '@common/interfaces/player';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';

const createMockPlayer = (id: string, name: string, isAdmin = false): Player => ({
    id,
    name,
    avatar: '',
    diceResult: 4,
    movesLeft: 3,
    actionsLeft: 0,
    attributes: {} as unknown as PlayerAttributes,
    inventory: [],
    stats: {} as unknown as PlayerStats,
    data: isAdmin ? [PlayerData.Admin] : [],
});

const mockMap: Map = {
    _id: '1',
    name: 'Test Map',
    description: 'A test map',
    mode: GameMode.Ctf,
    size: 20,
    tiles: [[]],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    visibility: true,
};

describe('SocketWaitingRoom Tests', function () {
    let io: Server;
    let clientSockets: ClientSocket[];
    let socketWaitingRoom: WaitingRoomSocketService;
    let players: Player[];
    let sandbox: sinon.SinonSandbox;
    let routeManagerMock: sinon.SinonStubbedInstance<RouteManager>;
    let gameServiceMock: sinon.SinonStubbedInstance<GameSocketService>;

    const PORT = 3003;
    const ACCESS_CODE = '1234';
    before((done) => {
        io = new Server(PORT, { cors: { origin: '*' } });
        done();
    });

    beforeEach((done) => {
        sandbox = sinon.createSandbox();

        routeManagerMock = sandbox.createStubInstance(RouteManager);
        gameServiceMock = sandbox.createStubInstance(GameSocketService);
        socketWaitingRoom = new WaitingRoomSocketService(gameServiceMock, routeManagerMock);
        routeManagerMock.io = io;

        routeManagerMock.onWrapper.callsFake((event: string, socket: Socket, handler: (...args: unknown[]) => void) => {
            socket.on(event, (...args: unknown[]) => handler(...args));
        });

        io.on('connection', (socket) => {
            socket.data = ACCESS_CODE;
            socketWaitingRoom.configRoute(socket);
            socket.join(Room.Waiting + ACCESS_CODE);
        });

        const MAX_AMOUNT_PLAYERS = 6;
        const TIMEOUT_MS = 100;

        const waitingRoom: WaitingRoom = {
            code: ACCESS_CODE,
            map: mockMap,
            players: [],
            adminLockedRoom: false,
            fullRoomAutoLocked: false,
            selectedAvatars: {},
        };

        socketWaitingRoom.waitingRooms.set(ACCESS_CODE, waitingRoom);

        clientSockets = Array(MAX_AMOUNT_PLAYERS)
            .fill(null)
            .map(() =>
                ioClient(`http://localhost:${PORT}`, {
                    autoConnect: false,
                    forceNew: true,
                }),
            );

        let connectedCount = 0;
        clientSockets.forEach((socket) => {
            socket.on('connect', () => {
                connectedCount++;
                if (connectedCount === clientSockets.length) {
                    players = [
                        createMockPlayer(clientSockets[0].id, 'AdminPlayer', true),
                        createMockPlayer(clientSockets[1].id, 'Player1', false),
                        createMockPlayer(clientSockets[2].id, 'Player2', false),
                        createMockPlayer(clientSockets[3].id, 'Player3', false),
                        createMockPlayer(clientSockets[4].id, 'Player4', false),
                        createMockPlayer(clientSockets[5].id, 'Player5', false),
                    ];

                    waitingRoom.players = [...players];

                    setTimeout(done, TIMEOUT_MS);
                }
            });
            socket.connect();
        });
    });

    afterEach((done) => {
        sandbox.restore();
        socketWaitingRoom.waitingRooms.clear();

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

    it('should correctly check if socket is in waiting room', () => {
        const socket = io.sockets.sockets.get(clientSockets[0].id);
        const isInRoomSpy = sandbox.spy(socketWaitingRoom as any, 'isInWaitingRoom');

        const result = socketWaitingRoom['isInWaitingRoom'](socket);

        expect(result).to.equal(true);
        expect(isInRoomSpy.returned(true)).to.equal(true);
    });

    it('should update waiting room when character is released', (done) => {
        clientSockets[2].on(WaitingRoomEvent.UpdateWaitingRoom, (waitingRoom) => {
            expect(waitingRoom.code).to.equal(ACCESS_CODE);
            done();
        });

        clientSockets[2].emit(WaitingRoomEvent.CharacterReleased);
    });

    describe('Player Quitting', function () {
        it('should remove player from waiting room when they quit', (done) => {
            const broadcastSpy = sandbox.spy(socketWaitingRoom, 'broadcastWaitingRoomUpdate');
            const removePlayerSpy = sandbox.spy(socketWaitingRoom as any, 'removeWaitingRoomPlayer');

            clientSockets[1].on(RoomEvent.RedirectTo, () => {
                const waitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
                expect(waitingRoom.players.some((p) => p.id === clientSockets[1].id)).to.equal(false);

                expect(broadcastSpy.calledWith(ACCESS_CODE)).to.equal(true);
                expect(removePlayerSpy.calledOnce).to.equal(true);
                expect(removePlayerSpy.firstCall.args[1]).to.equal(false);

                done();
            });
            const socket = io.sockets.sockets.get(clientSockets[1].id);
            socketWaitingRoom.handleDisconnecting(socket);
        });

        it('should notify other players when someone quits', async () => {
            return new Promise<void>((done) => {
                clientSockets[2].once(RoomEvent.Notify, (message) => {
                    expect(message).to.include('quitté');
                    done();
                });

                const socket = io.sockets.sockets.get(clientSockets[1].id);
                socketWaitingRoom.handleDisconnecting(socket);
            });
        });
    });

    describe('Kicking Players', function () {
        it('should remove kicked player from waiting room', (done) => {
            const handleKickSpy = sandbox.spy(socketWaitingRoom as any, 'handlePlayerKick');
            const removePlayerSpy = sandbox.spy(socketWaitingRoom as any, 'removeWaitingRoomPlayer');

            const kickedPlayerSocket = io.sockets.sockets.get(clientSockets[2].id);
            kickedPlayerSocket.data = ACCESS_CODE;

            clientSockets[2].on(RoomEvent.RedirectTo, () => {
                const waitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
                expect(waitingRoom.players.some((p) => p.id === clientSockets[2].id)).to.equal(false);

                expect(handleKickSpy.calledOnce).to.equal(true);
                expect(removePlayerSpy.calledOnce).to.equal(true);
                expect(removePlayerSpy.firstCall.args[1]).to.equal(true);

                done();
            });

            clientSockets[0].emit(WaitingRoomEvent.PlayerKickedOut, clientSockets[2].id);
        });

        it('should notify kicked player about being kicked', async () => {
            return new Promise<void>((done) => {
                clientSockets[2].once(RoomEvent.Notify, (message) => {
                    expect(message).to.include('expulsé');
                    done();
                });

                clientSockets[0].emit(WaitingRoomEvent.PlayerKickedOut, clientSockets[2].id);
            });
        });
    });

    describe('Starting Game', function () {
        it('should emit StartGame event and destroy waiting room', (done) => {
            const destroySpy = sandbox.spy(socketWaitingRoom as any, 'destroyWaitingRoom');

            clientSockets[1].on(RoomEvent.RedirectTo, () => {
                expect(destroySpy.calledWith(ACCESS_CODE)).to.equal(true);
                expect(socketWaitingRoom.waitingRooms.has(ACCESS_CODE)).to.equal(false);
                done();
            });

            clientSockets[0].emit(WaitingRoomEvent.StartGame);
        });

        it('should notify character selection room when game starts', async () => {
            const emitSpy = sandbox.spy(io, 'to');

            return new Promise<void>((done) => {
                clientSockets[1].once(RoomEvent.RedirectTo, () => {
                    expect(emitSpy.calledWith(Room.Character + ACCESS_CODE)).to.equal(true);
                    done();
                });

                clientSockets[0].emit(WaitingRoomEvent.StartGame);
            });
        });

        it('should not start if CTF and uneven player count', (done) => {
            socketWaitingRoom['waitingRooms'].get('1234').players.pop();
            const destroySpy = sandbox.spy(socketWaitingRoom as any, 'destroyWaitingRoom');

            clientSockets[0].on(RoomEvent.Notify, () => {
                expect(destroySpy.calledWith(ACCESS_CODE)).to.equal(false);
                expect(socketWaitingRoom.waitingRooms.has(ACCESS_CODE)).to.equal(true);
                done();
            });

            clientSockets[0].emit(WaitingRoomEvent.StartGame);
        });
    });

    describe('Lock', function () {
        it('should change lock status when admin toggles the lock', (done) => {
            const initialLockState = socketWaitingRoom.waitingRooms.get(ACCESS_CODE).adminLockedRoom;
            const broadcastSpy = sandbox.spy(socketWaitingRoom, 'broadcastWaitingRoomUpdate');

            clientSockets[1].on(WaitingRoomEvent.UpdateWaitingRoom, (updatedRoom) => {
                expect(updatedRoom.adminLockedRoom).to.equal(!initialLockState);
                expect(broadcastSpy.calledOnce).to.equal(true);
                done();
            });

            clientSockets[0].emit(WaitingRoomEvent.ToggleLock);
        });

        it('should not allow admin to toggle room lock status if autoLock is on', (done) => {
            socketWaitingRoom.waitingRooms.get(ACCESS_CODE).fullRoomAutoLocked = true;
            const initialLockState = socketWaitingRoom.waitingRooms.get(ACCESS_CODE).adminLockedRoom;
            const broadcastSpy = sandbox.spy(socketWaitingRoom, 'broadcastWaitingRoomUpdate');
            clientSockets[0].emit(WaitingRoomEvent.ToggleLock);
            return (
                expect(socketWaitingRoom.waitingRooms.get(ACCESS_CODE).adminLockedRoom).to.equal(initialLockState) &&
                expect(broadcastSpy.called).to.be.false &&
                done()
            );
        });

        it('should auto-lock room when max players is reached', (done) => {
            const checkAutoLockSpy = sandbox.spy(socketWaitingRoom as any, 'checkToAutoLock');

            socketWaitingRoom.broadcastWaitingRoomUpdate(ACCESS_CODE);

            expect(checkAutoLockSpy.calledOnce).to.equal(true);
            expect(socketWaitingRoom.waitingRooms.get(ACCESS_CODE).fullRoomAutoLocked).to.equal(true);
            done();
        });

        it('should not auto-lock room when below max players', (done) => {
            const waitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
            waitingRoom.players = waitingRoom.players.slice(0, 2);

            socketWaitingRoom.broadcastWaitingRoomUpdate(ACCESS_CODE);

            expect(socketWaitingRoom.waitingRooms.get(ACCESS_CODE).fullRoomAutoLocked).to.equal(false);
            done();
        });
    });

    describe('Player Disconnecting', function () {
        it('should handle admin disconnecting', (done) => {
            const adminQuitSpy = sandbox.spy(socketWaitingRoom as any, 'handleAdminQuit');
            const adminSocket = io.sockets.sockets.get(clientSockets[0].id);
            clientSockets.slice(1).forEach((socket) => {
                socket.on(RoomEvent.RedirectTo, () => {
                    return;
                });
            });

            socketWaitingRoom.handleDisconnecting(adminSocket);

            expect(adminQuitSpy.calledWith(adminSocket)).to.equal(true);
            expect(socketWaitingRoom.waitingRooms.has(ACCESS_CODE)).to.equal(false);
            done();
        });

        it('should handle player disconnecting', (done) => {
            const playerQuitSpy = sandbox.spy(socketWaitingRoom as any, 'handlePlayerQuit');
            const playerSocket = io.sockets.sockets.get(clientSockets[1].id);

            socketWaitingRoom.handleDisconnecting(playerSocket);
            const PLAYER_LENGTH = 5;
            expect(playerQuitSpy.calledWith(playerSocket)).to.equal(true);
            expect(socketWaitingRoom.waitingRooms.get(ACCESS_CODE).players.length).to.equal(PLAYER_LENGTH);
            done();
        });
    });

    describe('Virtual Player Management', function () {
        it('should create, add and delete virtual players to/from waiting room', async () => {
            const AWAIT_TIME = 50;
            const virtualName = 'VirtualName';
            const virtualAvatar = 'VirtualAvatar';
            const initialPlayerCount = socketWaitingRoom.waitingRooms.get(ACCESS_CODE).players.length;

            sandbox.stub(socketWaitingRoom as any, 'getVirtualName').returns(virtualName);
            sandbox.stub(socketWaitingRoom as any, 'getVirtualAvatar').returns(virtualAvatar);

            clientSockets[0].emit(WaitingRoomEvent.AddVirtualPlayer, 'offensive');
            await new Promise((resolve) => setTimeout(resolve, AWAIT_TIME));

            let waitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
            expect(waitingRoom.players.length).to.equal(initialPlayerCount + 1);

            const offensivePlayer = waitingRoom.players[waitingRoom.players.length - 1];
            expect(offensivePlayer).to.be.instanceOf(OffensiveVirtualPlayer);
            expect(offensivePlayer.data).to.include(PlayerData.OffensiveVP);

            const defensivePlayer = socketWaitingRoom['createVirtualPlayer']('defensive', ACCESS_CODE, 'DefensiveTest', 'avatarDef');
            expect(defensivePlayer).to.be.instanceOf(DefensiveVirtualPlayer);
            expect(defensivePlayer.data).to.include(PlayerData.DefensiveVP);

            const virtualId = offensivePlayer.id;
            waitingRoom.selectedAvatars[virtualId] = virtualAvatar;

            clientSockets[0].emit(WaitingRoomEvent.PlayerKickedOut, virtualId);
            const TIMEOUT_MS = 50;
            await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));

            waitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
            expect(waitingRoom.players.find((p) => p.id === virtualId)).to.equal(undefined);
            expect(waitingRoom.selectedAvatars[virtualId]).to.equal(undefined);
        });

        it('should manage virtual player resources (avatar and name)', () => {
            const waitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);

            waitingRoom.selectedAvatars = {
                player1: AVATARS[0],
                player2: AVATARS[1],
                player3: AVATARS[2],
            };

            const avatar = socketWaitingRoom['getVirtualAvatar'](ACCESS_CODE);
            expect(Object.values(waitingRoom.selectedAvatars)).to.not.include(avatar);

            const COUNT_EXISTING_NAMES = 3;
            const existingNames = VIRTUAL_PLAYER_NAMES.male.slice(0, COUNT_EXISTING_NAMES);
            waitingRoom.players = existingNames.map(
                (nameVP: string) => ({ nameVP, id: nameVP + 'id', ...createMockPlayer('dummy', nameVP) }) as unknown as Player,
            );

            const name = socketWaitingRoom['getVirtualName'](ACCESS_CODE, 'homme');
            expect(waitingRoom.players.map((p) => p.name)).to.not.include(name);
            expect(VIRTUAL_PLAYER_NAMES.male).to.include(name);
        });

        it('should generate balanced attributes for virtual players', () => {
            const attributesSets = [];
            const NBR_ATTRIBUTES = 10;

            for (let i = 0; i < NBR_ATTRIBUTES; i++) {
                attributesSets.push(socketWaitingRoom['generateVirtualPlayerAttributes']());
            }
            const MAX_ATTRIBUTE_VALUE = 6;
            const MIN_ATTRIBUTE_VALUE = 4;

            const hasHealthPriority = attributesSets.some((attr) => attr.health === MAX_ATTRIBUTE_VALUE && attr.speed === MIN_ATTRIBUTE_VALUE);
            const hasSpeedPriority = attributesSets.some((attr) => attr.health === MIN_ATTRIBUTE_VALUE && attr.speed === MAX_ATTRIBUTE_VALUE);
            const hasAttackD6 = attributesSets.some((attr) => attr.attack.dice === Dice.Dice6);
            const hasAttackD4 = attributesSets.some((attr) => attr.attack.dice === Dice.Dice4);

            expect(hasHealthPriority).to.equal(true);
            expect(hasSpeedPriority).to.equal(true);
            expect(hasAttackD6).to.equal(true);
            expect(hasAttackD4).to.equal(true);

            const attributes = attributesSets[0];

            const SUM_ATTRIBUTES = 10;
            expect(attributes.health + attributes.speed).to.equal(SUM_ATTRIBUTES);

            attributesSets.forEach((attr) => {
                if (attr.attack.dice === Dice.Dice6) {
                    expect(attr.defense.dice).to.equal(Dice.Dice4);
                } else {
                    expect(attr.defense.dice).to.equal(Dice.Dice6);
                }
            });
        });
    });
});

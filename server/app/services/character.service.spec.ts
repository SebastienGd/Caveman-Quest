import { CharacterSocketService } from '@app/services/character.service';
import { WaitingRoomSocketService } from '@app/services/waiting-room-socket.service';
import { NotificationMessage } from '@app/utils/constants/notification-messages';
import { CharacterEvent } from '@common/constants/character-events';
import { RoomEvent } from '@common/constants/room-events';
import { WebRoute } from '@common/constants/web-routes';
import { GameMode, Map } from '@common/interfaces/map';
import { BasicPlayer, Player, PlayerAttributes, PlayerData } from '@common/interfaces/player';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { MapService } from './map.service';
import { RouteManager } from './routes-manager';
import { ChatSocketService } from '@app/services/chat-socket.service';
import { WaitingRoomEvent } from '@common/constants/waiting-room-events';

const TIMEOUT_MS = 100;
const CHARACTER_ROOM_PREFIX = 'characterRoom';
const ACCESS_CODE = '1234';
const TIMEOUT_PROMISE_MS = 10;

const createBasicPlayer = (name: string): BasicPlayer => ({
    name,
    avatar: 'avatar1',
    attributes: {} as PlayerAttributes,
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

const createWaitingRoom = (
    players: Player[] = [],
    selectedAvatars: Record<string, string> = {},
    adminLockedRoom = false,
    fullRoomAutoLocked = false,
): WaitingRoom => ({
    code: ACCESS_CODE,
    map: mockMap,
    players,
    adminLockedRoom,
    fullRoomAutoLocked,
    selectedAvatars,
});

describe('SocketCharacter Tests', function () {
    let io: Server;
    let clientSockets: ClientSocket[];
    let socketWaitingRoom: sinon.SinonStubbedInstance<WaitingRoomSocketService>;
    let socketCharacter: CharacterSocketService;
    let routerManagerMock: sinon.SinonStubbedInstance<RouteManager>;
    let mockMapService: sinon.SinonStubbedInstance<MapService>;
    let mockChatService: sinon.SinonStubbedInstance<ChatSocketService>;

    let sandbox: sinon.SinonSandbox;
    const PORT = 3005;

    before((done) => {
        io = new Server(PORT, { cors: { origin: '*' } });
        done();
    });

    beforeEach((done) => {
        sandbox = sinon.createSandbox();

        mockMapService = sandbox.createStubInstance(MapService);
        socketWaitingRoom = sandbox.createStubInstance(WaitingRoomSocketService);
        routerManagerMock = sandbox.createStubInstance(RouteManager);
        mockChatService = sandbox.createStubInstance(ChatSocketService);
        socketCharacter = new CharacterSocketService(socketWaitingRoom, mockMapService, mockChatService, routerManagerMock);
        routerManagerMock.io = io;

        routerManagerMock.onWrapper.callsFake((event: string, socket: Socket, handler: (...args: unknown[]) => void) => {
            socket.on(event, (...args: unknown[]) => handler(...args));
        });

        io.on('connection', (socket) => {
            socket.data = socket.handshake.auth.code || ACCESS_CODE;
            socketCharacter.configRoute(socket);
        });

        const SOCKET_COUNT = 3;
        mockMapService.getMapById = sandbox.stub<[string], Promise<Map>>().resolves(mockMap);
        socketWaitingRoom.waitingRooms = new Map();
        socketWaitingRoom.waitingRooms.set(ACCESS_CODE, {} as WaitingRoom);

        clientSockets = Array(SOCKET_COUNT)
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

    it('should handle disconnecting from character selection room', (done) => {
        socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom([], { [clientSockets[0].id]: 'avatar1' }));
        const socketInstance = io.sockets.sockets.get(clientSockets[0].id);
        socketInstance.join(CHARACTER_ROOM_PREFIX + ACCESS_CODE);
        socketInstance.data = ACCESS_CODE;
        const handleQuitSpy = sandbox.spy(socketCharacter, 'handleDisconnecting');
        socketCharacter.handleDisconnecting(socketInstance);
        expect(handleQuitSpy.calledOnce).to.equal(true);
        const updatedWaitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
        return expect(updatedWaitingRoom.selectedAvatars[clientSockets[0].id]).to.be.undefined && done();
    });

    describe('Character Room', function () {
        it('should handle joining a game with a valid code', (done) => {
            socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom());

            clientSockets[0].on(RoomEvent.RedirectTo, (path) => {
                expect(path).to.equal(WebRoute.CharacterSelection);
                done();
            });

            clientSockets[0].emit(CharacterEvent.JoinGameWithCode, ACCESS_CODE);
        });

        it('should verify if a player is in a character selection room', () => {
            const playerSocket = io.sockets.sockets.get(clientSockets[0].id);
            const isInRoom = socketCharacter['isInCharacterSelectionRoom'](playerSocket as unknown as Socket);
            expect(isInRoom).to.equal(false);
        });

        it('should handle selecting an avatar', (done) => {
            socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom());

            const socketInstance = io.sockets.sockets.get(clientSockets[0].id);
            socketInstance.data = ACCESS_CODE;

            let changeAllowed = false;
            const allowChange = () => {
                changeAllowed = true;

                const updatedWaitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
                expect(updatedWaitingRoom.selectedAvatars[clientSockets[0].id]).to.equal('avatar2');
                expect(changeAllowed).to.equal(true);
                expect(socketWaitingRoom.broadcastWaitingRoomUpdate.calledWith(ACCESS_CODE)).to.equal(true);

                done();
            };

            clientSockets[0].emit(CharacterEvent.SelectAvatar, 'avatar2', allowChange);
        });

        it('should handle quitting character selection with quit button if not in the characterSelectionRoom', (done) => {
            socketWaitingRoom.waitingRooms.clear();
            const socketInstance = io.sockets.sockets.get(clientSockets[0].id);
            socketCharacter.handleDisconnecting(socketInstance);

            return expect(socketWaitingRoom.broadcastWaitingRoomUpdate.calledOnce).to.equal(false) && done();
        });

        it('should handle quitting character selection with quit button', async () => {
            socketWaitingRoom.waitingRooms.clear();
            socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom([], { [clientSockets[0].id]: 'avatar1' }));

            const socketInstance = io.sockets.sockets.get(clientSockets[0].id);
            socketInstance.join(CHARACTER_ROOM_PREFIX + ACCESS_CODE);
            socketInstance.data = ACCESS_CODE;

            socketCharacter.handleDisconnecting(socketInstance);
            await new Promise((resolve) => setTimeout(resolve, TIMEOUT_PROMISE_MS));

            const updatedWaitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
            expect(updatedWaitingRoom.selectedAvatars[clientSockets[0].id]).to.equal(undefined);
            expect(socketInstance.rooms.has(CHARACTER_ROOM_PREFIX + ACCESS_CODE)).to.equal(false);
            expect(socketWaitingRoom.broadcastWaitingRoomUpdate.calledWith(ACCESS_CODE)).to.equal(true);
        });
    });

    describe('Joining Waiting Room', function () {
        it('should ensure unique player names', () => {
            const players = [{ name: 'Player1' }, { name: 'Player1-2' }] as Player[];

            const uniqueName = socketCharacter['ensureUniqueName'](players, 'Player1');
            expect(uniqueName).to.equal('Player1-3');
        });

        it('should not create a new waiting room if the map is not valid', (done) => {
            const admin = createBasicPlayer('TestAdmin');
            const mapId = 'abc';
            socketWaitingRoom.waitingRooms.clear();

            mockMapService.getMapById = sandbox.stub<[string], Promise<Map>>().resolves(null);

            clientSockets[0].once(RoomEvent.Notify, (message) => {
                expect(message).to.equal(NotificationMessage.UnavailableMap);
            });
            clientSockets[0].emit(CharacterEvent.JoinWaitingRoom, admin, mapId);
            done();
        });

        it('should allow a player to join an existing waiting room when emits JoinWaitingRoom ', (done) => {
            const admin = createBasicPlayer('Admin');
            socketWaitingRoom.waitingRooms.clear();

            const playerJoining = createBasicPlayer('PlayerJoining');
            const mapId = '1';
            clientSockets[0].emit(CharacterEvent.JoinWaitingRoom, admin, mapId);
            clientSockets[0].once(RoomEvent.RedirectTo, (route: WebRoute) => {
                expect(route).to.equal(WebRoute.WaitingRoom);
                const adminSocket = io.sockets.sockets.get(clientSockets[0].id);
                const accessCode = adminSocket.data;
                const playerSocket = io.sockets.sockets.get(clientSockets[1].id);
                playerSocket.data = accessCode;

                clientSockets[1].once(RoomEvent.RedirectTo, (route2: WebRoute) => {
                    expect(route2).to.equal(WebRoute.WaitingRoom);
                    const waitingRoom = socketWaitingRoom.waitingRooms.get(accessCode);
                    expect(waitingRoom.players).to.have.lengthOf(2);
                    expect(waitingRoom.players[1].name).to.equal(playerJoining.name);
                    expect(waitingRoom.players[1].data).to.not.include(PlayerData.Admin);
                    done();
                });
                clientSockets[1].emit(CharacterEvent.JoinWaitingRoom, playerJoining, null);
            });
        });

        it('should construct a new player correctly', () => {
            const mockBasicPlayer = { name: 'playerName', avatar: '', attributes: {} as PlayerAttributes };
            const player = socketCharacter['constructPlayer']('socket1', mockBasicPlayer, true);
            return (
                expect(player.id).to.equal('socket1') &&
                expect(player.name).to.equal(mockBasicPlayer.name) &&
                expect(player.data.includes(PlayerData.Admin)).to.be.true &&
                expect(player.attributes).to.equal(mockBasicPlayer.attributes)
            );
        });
    });

    describe('Deny Access', function () {
        it('should deny joining when the room is full', (done) => {
            socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom([], {}, false, true));

            const socketInstance = io.sockets.sockets.get(clientSockets[0].id);
            socketInstance.data = ACCESS_CODE;

            clientSockets[0].on(WaitingRoomEvent.AccessDenied, (data) => {
                expect(data.reason).to.equal('full');
                done();
            });

            const basicPlayer = createBasicPlayer('NewPlayer');
            clientSockets[0].emit(CharacterEvent.JoinWaitingRoom, basicPlayer, null);
        });

        it('should deny joining when the room is locked by the admin', (done) => {
            socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom([], {}, true));

            const socketInstance = io.sockets.sockets.get(clientSockets[0].id);
            socketInstance.data = ACCESS_CODE;

            clientSockets[0].on(WaitingRoomEvent.AccessDenied, (data) => {
                expect(data.reason).to.equal('locked');
                done();
            });

            const basicPlayer = createBasicPlayer('NewPlayer');
            clientSockets[0].emit(CharacterEvent.JoinWaitingRoom, basicPlayer, null);
        });

        it('should reject joining a game with an invalid code', (done) => {
            const invalidCode = '9999';

            clientSockets[0].on(RoomEvent.Notify, (message) => {
                expect(message).to.equal(NotificationMessage.InvalidCode);
                done();
            });

            clientSockets[0].emit(CharacterEvent.JoinGameWithCode, invalidCode);
        });

        it('should reject joining a locked room', (done) => {
            socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom([], {}, true));

            clientSockets[0].on(RoomEvent.Notify, (message) => {
                expect(message).to.equal(NotificationMessage.InvalidLockedRoom);
                done();
            });

            clientSockets[0].emit(CharacterEvent.JoinGameWithCode, ACCESS_CODE);
        });

        it('should call allowChange if the waiting room does not exist yet', async () => {
            const temp = socketWaitingRoom.waitingRooms;
            socketWaitingRoom.waitingRooms.clear();

            const allowChangeSpy = sandbox.spy();

            clientSockets[0].emit(CharacterEvent.SelectAvatar, 'avatar1', allowChangeSpy);

            await new Promise((resolve) => setTimeout(resolve, TIMEOUT_PROMISE_MS));
            expect(allowChangeSpy.calledOnce).to.equal(true);
            socketWaitingRoom.waitingRooms = temp;
        });

        it('should call allowChange if avatar is not in selectedAvatars', async () => {
            const allowChangeSpy = sandbox.spy();
            socketWaitingRoom.waitingRooms.set(ACCESS_CODE, createWaitingRoom());

            const waitingRoom = socketWaitingRoom.waitingRooms.get(ACCESS_CODE);
            waitingRoom.selectedAvatars = { ['3232']: 'test' };

            clientSockets[0].emit(CharacterEvent.SelectAvatar, 'avatar1', allowChangeSpy);

            await new Promise((resolve) => setTimeout(resolve, TIMEOUT_PROMISE_MS));
            expect(allowChangeSpy.calledOnce).to.equal(true);
        });
    });
});

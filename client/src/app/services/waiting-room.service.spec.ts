/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { SocketClientService } from '@app/services/socket-client.service';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { GameMode, Map } from '@common/interfaces/map';
import { Player, PlayerAttributes, PlayerStats } from '@common/interfaces/player';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { Socket } from 'socket.io-client';
import { NotificationService } from './notification.service';
import { WaitingRoomService } from './waiting-room.service';

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
const RESPONSE_DELAY = 50;

describe('WaitingRoomService', () => {
    let service: WaitingRoomService;
    let mockSocketService: jasmine.SpyObj<SocketClientService>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
    let socketSpy: jasmine.SpyObj<Socket>;

    const mockPlayer: Player = {
        id: 'player1',
        name: 'TestPlayer',
        avatar: 'avatar1',
        stats: {} as unknown as PlayerStats,
        diceResult: 4,
        movesLeft: 0,
        actionsLeft: 0,
        attributes: {} as unknown as PlayerAttributes,
        inventory: [],
        data: [],
    };

    const mockWaitingRoom: WaitingRoom = {
        map: mockMap,
        code: '2345',
        selectedAvatars: { player1: 'avatar1' },
        players: [mockPlayer],
        fullRoomAutoLocked: false,
        adminLockedRoom: false,
    };

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj<Socket>('Socket', ['emit']);
        mockSocketService = jasmine.createSpyObj<SocketClientService>('SocketClientService', ['send', 'on'], { socket: socketSpy });
        notificationServiceSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['addNotification']);

        TestBed.configureTestingModule({
            providers: [
                WaitingRoomService,
                { provide: SocketClientService, useValue: mockSocketService },
                { provide: NotificationService, useValue: notificationServiceSpy },
            ],
        });

        service = TestBed.inject(WaitingRoomService);
    });

    it('should listen for waitingRoom Update event and update waitingRoom', () => {
        (service as any).configure();
        const mockUpdatedRoom = { ...mockWaitingRoom, players: [mockPlayer, mockPlayer] };
        mockSocketService.on.calls.argsFor(0)[1](mockUpdatedRoom);

        expect(service.waitingRoom).toEqual(mockUpdatedRoom);
    });

    it('should handle waiting room AccessDenied event and lock room with correct message', () => {
        (service as any).configure();
        mockSocketService.on.calls.argsFor(1)[1]({ reason: 'full' });

        expect(service.roomStatus()).toEqual({
            isLocked: true,
            message: "La salle d'attente est pleine. Veuillez réessayer plus tard.",
        });
    });

    it('should handle waiting room AccessDenied event and set room as locked with correct message', () => {
        (service as any).configure();

        mockSocketService.on.calls.argsFor(1)[1]({ reason: 'locked' });

        expect(service.roomStatus()).toEqual({
            isLocked: true,
            message: "La salle d'attente est verrouillée. Veuillez réessayer plus tard.",
        });
    });

    it('should set playerId and verify room access in resetRoom()', (done) => {
        mockSocketService.socket.id = 'socket123';

        service.resetRoom();

        setTimeout(() => {
            expect(service.playerId).toEqual('socket123');
            expect(mockSocketService.send).toHaveBeenCalledWith(RoomEvent.VerifyRoom, Room.Waiting);
            done();
        }, RESPONSE_DELAY);
    });

    it('should set playerId and verify room access in resetRoom()', (done) => {
        service.resetRoom();

        setTimeout(() => {
            expect(service.playerId).toEqual('');
            expect(mockSocketService.send).toHaveBeenCalledWith(RoomEvent.VerifyRoom, Room.Waiting);
            done();
        }, RESPONSE_DELAY);
    });

    it('should reset room status correctly', () => {
        service.resetRoomStatus();
        expect(service.roomStatus()).toEqual({ isLocked: false, message: '' });
    });

    it('should correctly determine if the game can be locked', () => {
        service.waitingRoom = { ...mockWaitingRoom, players: [mockPlayer, mockPlayer] };
        expect(service['canLockGame']()).toBeTrue();

        service.waitingRoom = { ...mockWaitingRoom, players: [mockPlayer] };
        expect(service['canLockGame']()).toBeFalse();
    });

    it('should send "toggleLock" event if the game can be locked', () => {
        service.waitingRoom = { ...mockWaitingRoom, players: [mockPlayer, mockPlayer] };
        service.toggleLock();
        expect(mockSocketService.send).toHaveBeenCalledWith('toggleLock');
    });

    it('should notify if the game cannot be locked', () => {
        service.waitingRoom = { ...mockWaitingRoom, players: [mockPlayer] };
        service.toggleLock();
        expect(notificationServiceSpy.addNotification).toHaveBeenCalledWith(
            "La salle d'attente doit avoir un minimum de 2 joueurs pour la verrouiller/déverrouiller.",
        );
    });

    it('should kick a player by sending the correct event', () => {
        service.kickPlayer(mockPlayer.id);
        expect(mockSocketService.send).toHaveBeenCalledWith('playerKickedOut', mockPlayer.id);
    });

    it('should notify the server when a player quits', () => {
        service.playerQuit();
        expect(mockSocketService.send).toHaveBeenCalledWith('quit');
    });

    it('should determine if the game is locked correctly', () => {
        service.waitingRoom = { ...mockWaitingRoom, adminLockedRoom: true };
        expect(service.isGameLocked()).toBeTrue();

        service.waitingRoom = { ...mockWaitingRoom, adminLockedRoom: false, fullRoomAutoLocked: true };
        expect(service.isGameLocked()).toBeTrue();

        service.waitingRoom = { ...mockWaitingRoom, adminLockedRoom: false, fullRoomAutoLocked: false };
        expect(service.isGameLocked()).toBeFalse();
    });

    it('should send "startGame" event correctly', () => {
        service.waitingRoom = mockWaitingRoom;
        service.startGame();
        expect(socketSpy.emit).toHaveBeenCalledWith('startGame', mockWaitingRoom.players, mockWaitingRoom.map);
    });

    it('should call addVirtualPlayer with the correct profile', () => {
        const profile = 'defensive';
        service.addVirtualPlayer(profile);
        expect(mockSocketService.send).toHaveBeenCalledWith('addVirtualPlayer', profile);
    });
});

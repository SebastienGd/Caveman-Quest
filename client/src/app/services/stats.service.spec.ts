/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { RoomEvent } from '@common/constants/room-events';
import { GameBase } from '@common/interfaces/game';
import { Dice, Player, PlayerData } from '@common/interfaces/player';
import { SocketClientService } from './socket-client.service';
import { StatsService } from './stats.service';

const mockMap = {
    _id: 'test-map-id',
    name: 'Test Map',
    description: 'Test map description',
    size: 100,
    mode: 'classic',
    visibility: 'public',
    tiles: [],
    startPositions: [],
    doors: [],
    flags: [],
    objects: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    creationDate: new Date(),
    lastModified: new Date(),
    isOfficial: false,
    creator: 'test-creator',
} as any;

describe('StatsService', () => {
    let service: StatsService;
    let socketClientServiceMock: jasmine.SpyObj<SocketClientService>;

    const createMockPlayer = (id: string): Player => ({
        id,
        name: 'Test Player',
        avatar: 'avatar.png',
        data: [PlayerData.Regular],
        movesLeft: 3,
        diceResult: 0,
        actionsLeft: 1,
        attributes: {
            currentHealth: 100,
            health: 100,
            speed: 5,
            attack: { value: 10, dice: Dice.Dice6 },
            defense: { value: 5, dice: Dice.Dice4 },
        },
        stats: {
            victories: 0,
            defeats: 0,
            evasions: 0,
            combat: 0,
            lostHP: 0,
            damageDone: 0,
            nbrOfPickedUpObjects: 0,
            tilesVisitedPercentage: 0,
        },
        inventory: [],
    });

    const createMockGameBase = (players: Player[]): GameBase => ({
        code: 'TEST',
        map: mockMap,
        players,
        data: {
            debugging: false,
            transitioning: false,
            turnIsEnding: false,
            gameIsOver: false,
        },
        stats: {
            duration: 0,
            nbTurns: 0,
            doorInteractedPercentage: 0,
            tilesVisitedPercentage: 0,
            nbPlayersHeldFlag: 0,
        },
    });

    beforeEach(() => {
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['send', 'on', 'socket'], { socket: { id: 'test-socket-id' } });

        TestBed.configureTestingModule({
            providers: [StatsService, { provide: SocketClientService, useValue: socketSpy }],
        });

        service = TestBed.inject(StatsService);
        socketClientServiceMock = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
    });

    it('should create service', () => {
        expect(service).toBeTruthy();
    });

    it('should handle game updates correctly', () => {
        const mockPlayer = createMockPlayer('test-socket-id');
        const mockGame = createMockGameBase([mockPlayer]);

        const callback = socketClientServiceMock.on.calls.argsFor(0)[1];
        callback(mockGame);

        expect(service.localGame()).toEqual(mockGame);
        expect(service.currentPlayer).toEqual(mockPlayer);
    });

    it('should disconnect when player is missing', () => {
        const mockGame = createMockGameBase([createMockPlayer('other-player')]);
        spyOn(service, 'disconnect');

        const callback = socketClientServiceMock.on.calls.argsFor(0)[1];
        callback(mockGame);

        expect(service.disconnect).toHaveBeenCalled();
    });

    it('should send quit event on disconnect', () => {
        service.disconnect();
        expect(socketClientServiceMock.send).toHaveBeenCalledWith(RoomEvent.Quit);
    });
});

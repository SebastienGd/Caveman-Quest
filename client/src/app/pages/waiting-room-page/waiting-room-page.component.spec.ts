/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaitingRoomService } from '@app/services/waiting-room.service';
import { Dice, Player, PlayerData } from '@common/interfaces/player';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { WaitingRoomPageComponent } from './waiting-room-page.component';

describe('WaitingRoomPageComponent', () => {
    let component: WaitingRoomPageComponent;
    let fixture: ComponentFixture<WaitingRoomPageComponent>;
    let waitingRoomServiceMock: jasmine.SpyObj<WaitingRoomService>;

    const mockPlayer: Player = {
        id: '123',
        name: 'Test',
        avatar: 'avatar.png',
        data: [PlayerData.Admin],
        movesLeft: 3,
        diceResult: 4,
        actionsLeft: 1,
        attributes: {
            currentHealth: 100,
            health: 100,
            speed: 5,
            attack: { value: 10, dice: Dice.Dice6 },
            defense: { value: 5, dice: Dice.Dice4 },
        },
        stats: {
            victories: 2,
            defeats: 1,
            evasions: 3,
            combat: 5,
            lostHP: 50,
            damageDone: 200,
            nbrOfPickedUpObjects: 4,
            tilesVisitedPercentage: 75,
        },
        inventory: [],
    };

    beforeEach(async () => {
        waitingRoomServiceMock = jasmine.createSpyObj(
            'WaitingRoomService',
            ['resetRoom', 'toggleLock', 'playerQuit', 'kickPlayer', 'startGame', 'isGameLocked', 'addVirtualPlayer'],
            {
                waitingRoom: {
                    players: [mockPlayer],
                    isLocked: false,
                    code: '1234',
                },
                playerId: '123',
                isGameLocked: jasmine.createSpy().and.returnValue(false),
            },
        );

        await TestBed.configureTestingModule({
            imports: [WaitingRoomPageComponent],
            providers: [{ provide: WaitingRoomService, useValue: waitingRoomServiceMock }],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitingRoomPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should detect admin status', () => {
        expect(component.isAdmin).toBeTrue();
    });

    it('should get current player', () => {
        expect(component.getCurrentPlayer()).toEqual(mockPlayer);
    });

    it('should toggle lock', () => {
        component.toggleLock();
        expect(waitingRoomServiceMock.toggleLock).toHaveBeenCalled();
    });

    it('should handle kick player', () => {
        component.handleClickOnExclude('456');
        expect(waitingRoomServiceMock.kickPlayer).toHaveBeenCalledWith('456');
    });

    it('should start game', () => {
        component.startGame();
        expect(waitingRoomServiceMock.startGame).toHaveBeenCalled();
    });

    it('should manage quit popup', () => {
        component.quitCancel();
        expect(component.isQuitPopupVisible).toBeFalse();

        component.quitConfirm();
        expect(waitingRoomServiceMock.playerQuit).toHaveBeenCalled();
    });

    it('should handle edge cases', () => {
        waitingRoomServiceMock.waitingRoom = null as any;
        expect(component.getCurrentPlayer()).toBeDefined();
    });

    it('should call startGame when startGame is called', () => {
        component.startGame();
        expect(waitingRoomServiceMock.startGame).toHaveBeenCalled();
    });

    it('should call addVirtualPlayer with "agressive" profile when addAgressiveVP is called', () => {
        component.addAgressiveVP();
        expect(waitingRoomServiceMock.addVirtualPlayer).toHaveBeenCalledWith('agressive');
    });

    it('should call addVirtualPlayer with "defensive" profile when addDefensiveVP is called', () => {
        component.addDefensiveVP();
        expect(waitingRoomServiceMock.addVirtualPlayer).toHaveBeenCalledWith('defensive');
    });

    it('should return true when there are avatars left', () => {
        waitingRoomServiceMock.waitingRoom = {
            selectedAvatars: {
                player1: 'avatar1',
                player2: 'avatar2',
            },
        } as unknown as WaitingRoom;

        expect(component.hasAvatarsLeft).toBeTrue();
    });

    it('should return true when all avatars are taken', () => {
        const mockSelectedAvatars: Record<string, string> = {};
        const MAX_AVATARS = 12;
        for (let i = 0; i < MAX_AVATARS; i++) {
            mockSelectedAvatars[`player${i}`] = `avatar${i}`;
        }

        waitingRoomServiceMock.waitingRoom = {
            selectedAvatars: mockSelectedAvatars,
        } as unknown as WaitingRoom;

        expect(component.hasAvatarsLeft).toBeTrue();
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Player, PlayerAttributes, PlayerData, PlayerStats } from '@common/interfaces/player';
import { WaitingRoomListComponent } from './waiting-room-list.component';

describe('WaitingRoomListComponent', () => {
    let component: WaitingRoomListComponent;
    let fixture: ComponentFixture<WaitingRoomListComponent>;

    const mockPlayerAttributes: PlayerAttributes = {
        currentHealth: 100,
        health: 100,
        speed: 10,
        attack: { value: 10, dice: null },
        defense: { value: 5, dice: null },
    };

    const mockPlayerStats: PlayerStats = {
        victories: 0,
        defeats: 0,
        evasions: 0,
        combat: 0,
        lostHP: 0,
        damageDone: 0,
        nbrOfPickedUpObjects: 0,
        tilesVisitedPercentage: 0,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WaitingRoomListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitingRoomListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.players).toEqual([]);
    });

    it('should set the admin correctly on init', () => {
        const mockPlayers: Player[] = [
            {
                id: '1',
                name: 'Admin',
                avatar: '',
                stats: mockPlayerStats,
                diceResult: 0,
                data: [PlayerData.Admin],
                movesLeft: 0,
                actionsLeft: 0,
                attributes: mockPlayerAttributes,
                inventory: [],
            },
            {
                id: '2',
                name: 'Player2',
                avatar: '',
                stats: mockPlayerStats,
                diceResult: 0,
                data: [],
                movesLeft: 0,
                actionsLeft: 0,
                attributes: mockPlayerAttributes,
                inventory: [],
            },
        ];
        component.players = mockPlayers;
        component.ngOnInit();
        expect(component.admin).toBe(mockPlayers[0]);
    });

    it('should return true if player is admin', () => {
        component.admin = {
            id: '1',
            name: 'Admin',
            avatar: '',
            stats: mockPlayerStats,
            diceResult: 0,
            data: [PlayerData.Admin],
            movesLeft: 0,
            actionsLeft: 0,
            attributes: mockPlayerAttributes,
            inventory: [],
        } as Player;
        expect(component.isAdmin('1')).toBeTrue();
    });

    it('should return false if player is not admin', () => {
        component.admin = {
            id: '1',
            name: 'Admin',
            avatar: '',
            stats: mockPlayerStats,
            diceResult: 0,
            data: [PlayerData.Admin],
            movesLeft: 0,
            actionsLeft: 0,
            attributes: mockPlayerAttributes,
            inventory: [],
        } as Player;
        expect(component.isAdmin('2')).toBeFalse();
    });

    it('should emit remove event with player ID', () => {
        spyOn(component.remove, 'emit');
        component.remove.emit('1');
        expect(component.remove.emit).toHaveBeenCalledWith('1');
    });

    it('should set admin to empty object if no admin found', () => {
        component.players = [
            {
                id: '2',
                name: 'Player2',
                avatar: '',
                stats: mockPlayerStats,
                diceResult: 0,
                data: [],
                movesLeft: 0,
                actionsLeft: 0,
                attributes: mockPlayerAttributes,
                inventory: [],
            },
        ];
        component.ngOnInit();
        expect(component.admin).toEqual({} as Player);
    });
});

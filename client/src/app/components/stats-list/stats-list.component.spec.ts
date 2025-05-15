import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Player } from '@common/interfaces/player';
import { StatsListComponent } from './stats-list.component';

describe('StatsListComponent', () => {
    let component: StatsListComponent;
    let fixture: ComponentFixture<StatsListComponent>;

    const mockPlayers: Player[] = [
        {
            id: '1',
            name: 'Player1',
            avatar: '',
            data: [],
            movesLeft: 0,
            diceResult: 0,
            actionsLeft: 0,
            attributes: {
                currentHealth: 0,
                health: 0,
                speed: 0,
                attack: { value: 0, dice: null },
                defense: { value: 0, dice: null },
            },
            stats: {
                victories: 5,
                defeats: 3,
                evasions: 2,
                combat: 10,
                lostHP: 40,
                damageDone: 100,
                nbrOfPickedUpObjects: 4,
                tilesVisitedPercentage: 50,
            },
            inventory: [],
        },
        {
            id: '2',
            name: 'Player2',
            avatar: '',
            data: [],
            movesLeft: 0,
            diceResult: 0,
            actionsLeft: 0,
            attributes: {
                currentHealth: 0,
                health: 0,
                speed: 0,
                attack: { value: 0, dice: null },
                defense: { value: 0, dice: null },
            },
            stats: {
                victories: 8,
                defeats: 1,
                evasions: 4,
                combat: 5,
                lostHP: 20,
                damageDone: 50,
                nbrOfPickedUpObjects: 2,
                tilesVisitedPercentage: 80,
            },
            inventory: [],
        },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StatsListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(StatsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should sort players on ngOnChanges', () => {
        component.players = mockPlayers;
        component.sortColumn = 'combat';
        component.sortDirection = 'asc';

        component.ngOnChanges({
            players: {
                currentValue: mockPlayers,
                previousValue: [],
                firstChange: true,
                isFirstChange: () => true,
            },
        });

        expect(component.sortedPlayers[0].name).toBe('Player2');
        expect(component.sortedPlayers[1].name).toBe('Player1');
    });

    it('should toggle sort direction if same column is sorted again', () => {
        component.players = mockPlayers;
        component.sortColumn = 'victories';
        component.sortDirection = 'asc';

        component.onSort('victories');
        expect(component.sortDirection).toBe('desc');
        expect(component.sortColumn).toBe('victories');
    });

    it('should change sort column if different column is selected', () => {
        component.players = mockPlayers;
        component.sortColumn = 'defeats';
        component.sortDirection = 'desc';

        component.onSort('tilesVisitedPercentage');
        expect(component.sortColumn).toBe('tilesVisitedPercentage');
        expect(component.sortDirection).toBe('asc');
    });

    it('should sort descending correctly', () => {
        component.players = mockPlayers;
        component.sortColumn = 'victories';
        component.sortDirection = 'desc';

        component['sortPlayers']();

        expect(component.sortedPlayers[0].name).toBe('Player2');
        expect(component.sortedPlayers[1].name).toBe('Player1');
    });

    it('should sort ascending correctly', () => {
        component.players = mockPlayers;
        component.sortColumn = 'victories';
        component.sortDirection = 'asc';

        component['sortPlayers']();

        expect(component.sortedPlayers[0].name).toBe('Player1');
        expect(component.sortedPlayers[1].name).toBe('Player2');
    });
});

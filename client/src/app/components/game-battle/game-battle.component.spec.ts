/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dice, Player, PlayerAttributes, PlayerData, PlayerStats } from '@common/interfaces/player';
import { GameBattleComponent } from './game-battle.component';

const createMockStats = (): PlayerStats => ({
    victories: 0,
    defeats: 0,
    evasions: 0,
    combat: 0,
    lostHP: 0,
    damageDone: 0,
    nbrOfPickedUpObjects: 0,
    tilesVisitedPercentage: 0,
});

const createMockAttributes = (): PlayerAttributes => ({
    currentHealth: 100,
    health: 100,
    attack: { value: 10, dice: Dice.Dice4 },
    defense: { value: 5, dice: Dice.Dice6 },
    speed: 8,
});

const createMockPlayer = (): Player => ({
    id: '1',
    name: 'Joueur',
    avatar: 'avatar.jpg',
    stats: createMockStats(),
    diceResult: 0,
    data: [],
    movesLeft: 0,
    actionsLeft: 0,
    attributes: createMockAttributes(),
    inventory: [],
});

describe('GameBattleComponent', () => {
    let component: GameBattleComponent;
    let fixture: ComponentFixture<GameBattleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameBattleComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameBattleComponent);
        component = fixture.componentInstance;

        component.ourPlayer = {
            ...createMockPlayer(),
            attributes: { ...createMockAttributes(), currentHealth: 75 },
            diceResult: 4,
            data: [PlayerData.ActiveInCombat],
        };
        component.otherPlayer = {
            ...createMockPlayer(),
            attributes: { ...createMockAttributes(), currentHealth: 30, health: 150 },
            diceResult: 2,
        };

        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should calculate health percentages correctly', () => {
        expect(component.attackerHealthPercent).toBe(75);
        expect(component.defenderHealthPercent).toBe(20);
    });

    it('should handle zero max life', () => {
        component.ourPlayer.attributes.health = 0;
        component.otherPlayer.attributes.health = 0;
        fixture.detectChanges();

        expect(component.attackerHealthPercent).toBe(0);
        expect(component.defenderHealthPercent).toBe(0);
    });

    it('should handle currentLife > maxLife', () => {
        component.ourPlayer.attributes.currentHealth = 200;
        component.ourPlayer.attributes.health = 100;
        fixture.detectChanges();

        expect(component.attackerHealthPercent).toBe(200);
    });

    it('should return correct isActiveInCombat value (case 1: not active)', () => {
        component.ourPlayer.data = [];
        expect(component.isActiveInCombat).toBeFalse();
    });

    it('should return correct isActiveInCombat value (case 4: active & alive)', () => {
        component.ourPlayer.data = [PlayerData.ActiveInCombat];
        expect(component.isActiveInCombat).toBeTrue();
    });

    it('should emit rollDice on click', () => {
        spyOn(component.rollDice, 'emit');
        component.onRollDice();
        expect(component.rollDice.emit).toHaveBeenCalled();
    });

    it('should emit evade on click', () => {
        spyOn(component.evade, 'emit');
        component.onEvade();
        expect(component.evade.emit).toHaveBeenCalled();
    });
});

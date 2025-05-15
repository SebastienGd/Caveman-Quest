import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dice, Player } from '@common/interfaces/player';
import { PlayerInformationComponent } from './player-information.component';

describe('PlayerInformationComponent', () => {
    let fixture: ComponentFixture<PlayerInformationComponent>;
    const player: Player = {} as Player;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerInformationComponent],
        }).compileComponents();

        player.avatar = 'assets/images/avatar.png';
        player.name = 'Test Player';
        player.attributes = {
            health: 100,
            currentHealth: 50,
            speed: 10,
            attack: { value: 4, dice: Dice.Dice4 },
            defense: { value: 4, dice: Dice.Dice6 },
        };
        player.inventory = [];

        player.avatar = 'assets/images/avatar.png';

        fixture = TestBed.createComponent(PlayerInformationComponent);
        fixture.componentInstance.player = player;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });
});

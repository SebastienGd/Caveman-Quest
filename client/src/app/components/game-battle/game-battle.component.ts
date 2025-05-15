import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Player, PlayerData } from '@common/interfaces/player';
import { MAX_HEALTH } from 'src/utils/constants/combat-constants';

@Component({
    selector: 'app-game-battle',
    imports: [],
    templateUrl: './game-battle.component.html',
    styleUrl: './game-battle.component.scss',
})
export class GameBattleComponent {
    @Input() ourPlayer: Player;
    @Input() otherPlayer: Player;
    @Output() rollDice = new EventEmitter();
    @Output() evade = new EventEmitter();
    playerData = PlayerData;

    get attackerHealthPercent(): number {
        if (!this.ourPlayer?.attributes?.health) return 0;
        return (this.ourPlayer.attributes.currentHealth / this.ourPlayer.attributes.health) * MAX_HEALTH;
    }

    get defenderHealthPercent(): number {
        if (!this.otherPlayer?.attributes?.health) return 0;
        return (this.otherPlayer.attributes.currentHealth / this.otherPlayer.attributes.health) * MAX_HEALTH;
    }

    get isActiveInCombat(): boolean {
        return this.ourPlayer.data.includes(PlayerData.ActiveInCombat);
    }

    onRollDice(): void {
        this.rollDice.emit();
    }

    onEvade(): void {
        this.evade.emit();
    }
}

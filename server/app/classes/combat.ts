import { removePlayerData } from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { COMBAT_CONSTANTS } from '@app/utils/constants/game-constants';
import { TimerEvent } from '@app/utils/constants/timer-events';
import { hasEvadeLeft, isOnIce } from '@app/utils/game-checks';
import { GameData } from '@common/interfaces/game';
import { AttributeName, Dice, Player, PlayerData } from '@common/interfaces/player';
import { EventEmitter } from 'stream';
import { Game } from './game';
import { Timer } from './timer';

export class Combat extends EventEmitter {
    activePlayer: Player;
    inactivePlayer: Player;
    timer: Timer = new Timer();
    private data: GameData;

    constructor() {
        super();
        this.timer.on(TimerEvent.TimerExpired, () => {
            this.attack();
        });
    }

    destroy(): void {
        this.timer.stop();
        this.timer.removeAllListeners();
        this.removeAllListeners();
    }

    evade() {
        if (hasEvadeLeft(this.activePlayer)) {
            --this.activePlayer.evasionAttempts;
            const result = Math.random();
            const evadeSuccessful = result < COMBAT_CONSTANTS.threeTenths;
            this.emit(CombatEvent.EvadeResult, result, evadeSuccessful);
            if (evadeSuccessful) {
                this.endCombat(false);
                return;
            }
        }
        this.changeTurn();
    }

    attack() {
        if (this.data.debugging) {
            this.activePlayer.diceResult =
                this.activePlayer.attributes.attack.dice === Dice.Dice4 ? COMBAT_CONSTANTS.dice4Value : COMBAT_CONSTANTS.dice6Value;
            this.inactivePlayer.diceResult = 1;
        } else {
            this.activePlayer.diceResult = this.rollBonusDice(this.activePlayer.attributes.attack.dice);
            this.inactivePlayer.diceResult = this.rollBonusDice(this.inactivePlayer.attributes.defense.dice);
        }

        for (const obj of this.activePlayer.inventory) {
            const shouldContinue = obj.onBeforeAttack?.(this, this.activePlayer);
            if (shouldContinue === false) return;
        }

        const totalAttack = this.computeAttackSuccess(AttributeName.Attack, this.activePlayer);
        const totalDefense = this.computeAttackSuccess(AttributeName.Defense, this.inactivePlayer);
        const rawDamage = totalAttack - totalDefense;
        const effectiveDamage = Math.min(this.inactivePlayer.attributes.currentHealth, rawDamage);
        this.emit(CombatEvent.AttackResult, totalAttack, totalDefense, effectiveDamage);

        if (rawDamage > 0) {
            this.inactivePlayer.attributes.currentHealth -= effectiveDamage;
            this.emit(CombatEvent.SuccessfulAttack, effectiveDamage);

            if (this.inactivePlayer.attributes.currentHealth <= 0) {
                this.endCombat(true);
                return;
            }
        }
        this.changeTurn();
    }

    startCombat(game: Game, attackerId: string, defenderId: string) {
        game.timer.pause();
        const attacker = game.findPlayer(attackerId);
        if (!attacker.actionsLeft) return;

        this.activePlayer = attacker;
        this.inactivePlayer = game.findPlayer(defenderId);
        this.activePlayer.actionsLeft--;
        this.data = game.data;
        [this.activePlayer, this.inactivePlayer].forEach((player: Player) => {
            if (isOnIce(game.map.tiles, player)) player.data.push(PlayerData.IsOnIce);
            player.data.push(PlayerData.Combat);
        });
        this.generateTurnOrder();
        this.resetPlayerEvasionAttempts();
        this.timer.start(COMBAT_CONSTANTS.combatRoundDuration);
        this.emit(CombatEvent.CombatStart);
        this.emit(CombatEvent.ChangeTurn);
    }

    disconnectPlayer(playerId: string) {
        if (playerId === this.activePlayer.id) this.changeTurn();
        this.endCombat(true);
    }

    endCombat(won: boolean) {
        for (const obj of this.inactivePlayer.inventory) obj.onCombatEnd?.(this, won);
        this.timer.stop();
        this.emit(CombatEvent.ProcessingCombatEnd, won);
        [this.activePlayer, this.inactivePlayer].forEach((player) => {
            removePlayerData(player, [PlayerData.Combat, PlayerData.ActiveInCombat, PlayerData.IsOnIce]);
            player.attributes.currentHealth = player.attributes.health;
            player.diceResult = 0;
        });
        this.emit(CombatEvent.CombatEnd, won);
        this.activePlayer = this.inactivePlayer = null;
    }

    private changeTurn() {
        removePlayerData(this.activePlayer, [PlayerData.ActiveInCombat]);
        this.inactivePlayer.data.push(PlayerData.ActiveInCombat);
        const temp = this.activePlayer;
        this.activePlayer = this.inactivePlayer;
        this.inactivePlayer = temp;
        this.timer.start(hasEvadeLeft(this.activePlayer) ? COMBAT_CONSTANTS.combatRoundDuration : COMBAT_CONSTANTS.shortCombatRoundDuration);
        this.emit(CombatEvent.ChangeTurn);
    }

    private generateTurnOrder() {
        const inactivePlayerIsFaster = this.activePlayer.attributes.speed < this.inactivePlayer.attributes.speed;
        if (inactivePlayerIsFaster) this.changeTurn();
        else this.activePlayer.data.push(PlayerData.ActiveInCombat);
    }

    private rollBonusDice(dice: Dice): number {
        return Math.floor(Math.random() * (dice === Dice.Dice4 ? COMBAT_CONSTANTS.diceRoll4 : COMBAT_CONSTANTS.diceRoll6)) + 1;
    }

    private resetPlayerEvasionAttempts() {
        this.activePlayer.evasionAttempts = 2;
        this.inactivePlayer.evasionAttempts = 2;
    }

    private computeAttackSuccess(attribute: AttributeName.Defense | AttributeName.Attack, player: Player) {
        const onIce = player.data.includes(PlayerData.IsOnIce);
        const penalty = onIce ? COMBAT_CONSTANTS.penalty : 0;
        return player.attributes[attribute].value + penalty + player.diceResult;
    }
}

/* eslint-disable max-classes-per-file */
import { playerHasObject } from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Dice, Player } from '@common/interfaces/player';
import { PositionedTile } from '@common/interfaces/position';
import { Combat } from './combat';
import { Game } from './game';

export class SteakObject implements GameObject {
    constructor(public name: ObjectName) {}

    applyEffect(player: Player, pickUp: boolean) {
        let modifier = 1;
        if (!pickUp) modifier *= -1;
        player.attributes.health += modifier;
        player.attributes.currentHealth += modifier;
        player.attributes.defense.value += modifier;
    }
}

export class ClubWeaponObject implements GameObject {
    constructor(public name: ObjectName) {}

    applyEffect(player: Player, pickUp: boolean) {
        let modifier = 2;
        if (!pickUp) modifier *= -1;
        player.attributes.attack.value += modifier;
        player.attributes.defense.value -= modifier / 2;
    }
}

export class TorchObject implements GameObject {
    private defenseDice: Dice;
    private attackDice: Dice;
    constructor(public name: ObjectName) {}

    onMovePlayer(game: Game, startTile: PositionedTile, endTile: PositionedTile): boolean {
        const playerAttributes = game.activePlayer.player.attributes;

        if (endTile.tile.type === TileType.Water) {
            this.defenseDice = playerAttributes.defense.dice;
            this.attackDice = playerAttributes.attack.dice;
            playerAttributes.defense.dice = Dice.Dice6;
            playerAttributes.attack.dice = Dice.Dice6;
        } else if (this.defenseDice && this.attackDice) {
            playerAttributes.defense.dice = this.defenseDice;
            playerAttributes.attack.dice = this.attackDice;
        }
        return true;
    }
}

export class BoneObject implements GameObject {
    constructor(public name: ObjectName) {}

    onBeforeAttack(combat: Combat, player: Player): boolean {
        if (player.attributes.currentHealth === 1) {
            combat.emit(CombatEvent.SuccessfulAttack, combat.inactivePlayer.attributes.currentHealth);
            combat.endCombat(true);
            return false;
        }
        return true;
    }
}

export class BirdObject implements GameObject {
    constructor(public name: ObjectName) {}

    applyEffect(player: Player, pickUp: boolean) {
        const playerHasMovesLeft = player.movesLeft > 1;
        if (pickUp && !playerHasObject(player, ObjectName.Flag) && playerHasMovesLeft) player.movesLeft = 1;
        else if (!pickUp && player.movesLeft === 0) player.movesLeft = player.attributes.speed;
    }

    onMovePlayer(game: Game, startTile: PositionedTile, endTile: PositionedTile): boolean {
        const player = game.activePlayer.player;
        if (!endTile.tile.player && !game.movePath.length && !playerHasObject(player, ObjectName.Flag)) {
            game.movePath = [startTile, endTile];
            player.movesLeft = TILE_TYPE_TO_COST[endTile.tile.type];
            game.startMovement();
            return false;
        }
        return true;
    }

    onResetPlayer(player: Player) {
        if (!playerHasObject(player, ObjectName.Flag)) player.movesLeft = 1;
    }
}

export class TrexObject implements GameObject {
    constructor(public name: ObjectName) {}

    onCombatEnd(combat: Combat, won: boolean): void {
        if (won) combat.activePlayer.stats.victories--;
    }
}

export class FlagObject implements GameObject {
    constructor(public name: ObjectName) {}
}

const gameObjectFactory: Record<string, new (objectName: ObjectName) => GameObject> = {
    [ObjectName.Steak]: SteakObject,
    [ObjectName.ClubWeapon]: ClubWeaponObject,
    [ObjectName.Torch]: TorchObject,
    [ObjectName.Bone]: BoneObject,
    [ObjectName.Trex]: TrexObject,
    [ObjectName.Bird]: BirdObject,
    [ObjectName.Flag]: FlagObject,
};

export function createObject(gameObject: GameObject) {
    const objectClass = gameObjectFactory[gameObject.name];
    return objectClass ? new objectClass(gameObject.name) : gameObject;
}

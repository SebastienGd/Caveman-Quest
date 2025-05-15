import { findTile, findTileCoordinates, highlightAccessibleTiles, playerHasObject } from '@app/utils/algorithms';
import { DEFENSIVE_ITEM_PRIORITY } from '@app/utils/constants/defensive-player-constants';
import { INVENTORY_SIZE } from '@app/utils/constants/inventory-constants';
import { areCtfEnemies } from '@app/utils/game-checks';
import { TileData } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Combat } from './combat';
import { Game } from './game';
import { VirtualPlayer } from './virtual-player';

export class DefensiveVirtualPlayer extends VirtualPlayer {
    handleCombatTurn(combat: Combat): void {
        if (this.attributes.health === this.attributes.currentHealth || !this.evasionAttempts) {
            combat.attack();
        } else {
            combat.evade();
        }
    }

    handlePlayerTurn(game: Game) {
        const hasMovedDuringRound = this.movesLeft !== this.attributes.speed && !playerHasObject(this, ObjectName.Bird);
        if (!this.tryCtfActions(game) && !this.tryRegularActions(game)) {
            if (hasMovedDuringRound) game.endTurn();
            else this.tweakBeforeEnding(game);
        }
    }

    private tryCtfActions(game: Game): boolean {
        const flagPlayer = this.findFlagHolder(game);
        const canGoToSpawnWithFlag = (flagPlayer === this || areCtfEnemies(flagPlayer, this)) && this.tryToReturnToFlagHolderSpawn(game);
        return canGoToSpawnWithFlag || this.tryCaptureFlag(game);
    }

    private tryRegularActions(game: Game): boolean {
        const currentTile = findTile(game.map.tiles, game.activePlayer.position);
        if (this.inventory.length === INVENTORY_SIZE) {
            if (currentTile?.object && currentTile.object.name !== ObjectName.Spawnpoint && currentTile.object.name !== ObjectName.Flag) {
                this.handleInventoryChoice(game);
                return false;
            }
        }
        return this.tryMoveTowardsItems(game, DEFENSIVE_ITEM_PRIORITY);
    }

    private tweakBeforeEnding(game: Game): boolean {
        highlightAccessibleTiles(game);
        const accessiblesTiles = game.map.tiles.flat().filter((tile) => tile?.data?.includes(TileData.Accessible));
        if (accessiblesTiles.length) {
            const randomIndex = Math.floor(Math.random() * accessiblesTiles.length);
            game.map.resetTilesData();
            game.movePlayer(findTileCoordinates(game.map.tiles, accessiblesTiles[randomIndex]));
        }
        game.endTurn();
        return Boolean(accessiblesTiles.length);
    }
}

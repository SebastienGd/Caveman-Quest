import { findTile } from '@app/utils/algorithms';
import { OFFENSIVE_ITEM_PRIORITY } from '@app/utils/constants/offensive-player-constants';
import { areEnemies } from '@app/utils/game-checks';
import { GameMode, TileBase } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Combat } from './combat';
import { Game } from './game';
import { VirtualPlayer } from './virtual-player';

export class OffensiveVirtualPlayer extends VirtualPlayer {
    handlePlayerTurn(game: Game) {
        let actionSucceeded = false;

        if (game.map.mode === GameMode.Ctf) {
            actionSucceeded = this.ctfActions(game) || this.regularActions(game);
        } else {
            actionSucceeded = this.regularActions(game);
        }

        if (!actionSucceeded) {
            game.endTurn();
        }
    }

    handleCombatTurn(combat: Combat): void {
        combat.attack();
    }

    private regularActions(game: Game): boolean {
        return this.tryAttackReachableEnemy(game) || this.tryMoveTowardsItems(game, OFFENSIVE_ITEM_PRIORITY) || this.tryAttackAnyEnemy(game);
    }

    private ctfActions(game: Game): boolean {
        const canGoToSpawnWithFlag = this.findFlagHolder(game) === this && this.tryOffensiveReturnToSpawn(game);
        return canGoToSpawnWithFlag || this.tryAttackEnemyFlagHolder(game) || this.tryCaptureFlag(game);
    }

    private tryOffensiveReturnToSpawn(game: Game): boolean {
        const spawnTile = findTile(game.map.tiles, this.spawnPoint);
        const pathToSpawn = this.getAllPathsTo(game, (tile) => tile === spawnTile)[0];
        if (!this.tryToMoveTowards(game, pathToSpawn)) {
            if (this.actionsLeft > 0 && pathToSpawn[1].tile.player && areEnemies(this, pathToSpawn[1].tile.player, game)) {
                game.combat.startCombat(game, this.id, pathToSpawn[1].tile.player.id);
                return true;
            }
            game.endTurn();
            return true;
        }
        return true;
    }

    private tryAttackEnemy(game: Game, isEnemy: (opponent: Player) => boolean, seekOnlyInReach: boolean): boolean {
        if (!this.actionsLeft) return false;
        const tileContainsEnemy = (tile: TileBase) => tile.player && isEnemy(tile.player);
        let pathsToOpponents = this.getAllPathsTo(game, tileContainsEnemy);
        if (seekOnlyInReach) {
            pathsToOpponents = pathsToOpponents.filter((path) => this.canTraverseDuringRound(path.slice(0, -1)));
        }

        const enemyPath = pathsToOpponents[0];
        if (!enemyPath) return false;

        if (!this.tryToMoveTowards(game, enemyPath)) {
            if (enemyPath[1].tile.player && areEnemies(this, enemyPath[1].tile.player, game)) {
                game.combat.startCombat(game, this.id, enemyPath[1].tile.player.id);
                return true;
            }
            return false;
        }
        return true;
    }
    private tryAttackReachableEnemy(game: Game) {
        return this.tryAttackEnemy(game, (player: Player) => areEnemies(this, player, game), true);
    }
    private tryAttackAnyEnemy(game: Game) {
        return this.tryAttackEnemy(game, (player: Player) => areEnemies(this, player, game), false);
    }
    private tryAttackEnemyFlagHolder(game: Game) {
        const enemyIsHoldingFlag = (player: Player) => areEnemies(this, player, game) && this.findFlagHolder(game) === player;
        return this.tryAttackEnemy(game, enemyIsHoldingFlag, false);
    }
}

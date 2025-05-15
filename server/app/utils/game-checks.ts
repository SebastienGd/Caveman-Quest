import { Combat } from '@app/classes/combat';
import { Game } from '@app/classes/game';
import { CostConstants } from '@common/constants/game-constants';
import { GameMode, Map, TileBase, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { PositionedTile } from '@common/interfaces/position';
import { dfs, filterMatrix, findTile, playerHasObject, processMatrix, toPositionedTiles } from './algorithms';
import { COMBAT_CONSTANTS } from './constants/game-constants';

export function isTurnDone(game: Game): boolean {
    const positionedTiles = toPositionedTiles(game.map.tiles);
    const startTile = findTile(positionedTiles, game.activePlayer.position);

    const hasActionsLeft = game.activePlayer.player.actionsLeft;
    const hasMovesLeft = game.activePlayer.player.movesLeft;
    const hasEntitiesAtProximity =
        game.map.findDoorsAtProximity(game.activePlayer.position) || game.map.findPlayersAtProximity(game.activePlayer.position);
    const canMove = dfs(positionedTiles, startTile, 1).length > 1;

    game.map.resetTilesData();

    return (!hasActionsLeft && !hasMovesLeft) || (!hasActionsLeft && !canMove) || (!hasMovesLeft && !hasEntitiesAtProximity);
}

export function isGameOver(game: Game): boolean {
    if (game.map.mode === GameMode.Classical) return Boolean(game.players.find((player) => player.stats.victories >= COMBAT_CONSTANTS.victoryToWin));
    else {
        const playerWithFlag = game.players.find((player) => player.inventory.some((object) => object.name === ObjectName.Flag));
        if (!playerWithFlag) return false;
        const positionedTiles = toPositionedTiles(game.map.tiles);
        const condition = (tile: PositionedTile) => tile.tile.player === playerWithFlag;
        const playerTile = filterMatrix(positionedTiles, condition)[0];
        return playerTile.x === playerTile.tile.player.spawnPoint.x && playerTile.y === playerTile.tile.player.spawnPoint.y;
    }
}

export function isActivePlayer(game: Game, id: string) {
    return game?.activePlayer.player.id === id;
}

export function isAdmin(game: Game, id: string) {
    const player = game.findPlayer(id);
    return player?.data.includes(PlayerData.Admin);
}

export function isOnIce(tiles: TileBase[][], player: Player) {
    let playerTile: TileBase;
    processMatrix(tiles, (tile: TileBase) => {
        if (tile.player === player) playerTile = tile;
    });
    return playerTile.type === TileType.Ice;
}

export function isTerrainTile(tile: TileBase): boolean {
    return tile && [TileType.Base, TileType.Water, TileType.Ice].includes(tile.type);
}

export function isDoorTile(tile: TileBase): boolean {
    return tile.type === TileType.ClosedDoor || tile.type === TileType.OpenedDoor;
}

export function isWalkableTile({ tile }: PositionedTile, walkingPlayer: Player) {
    return ![TileType.ClosedDoor, TileType.Wall].includes(tile.type) && (!tile.player || tile.player === walkingPlayer);
}

export function isEmptyTile({ tile }: PositionedTile) {
    return !tile.object;
}

export function isPossiblyWalkableTile(tile: TileBase): boolean {
    return tile.type !== TileType.Wall;
}
export function isVirtualPlayer(player: Player) {
    return [PlayerData.DefensiveVP, PlayerData.OffensiveVP].some((data) => player.data.includes(data));
}
export function isMap(obj: unknown): obj is Map {
    const castObj = obj as Map;
    return (
        typeof castObj._id === 'string' &&
        typeof castObj.name === 'string' &&
        typeof castObj.description === 'string' &&
        typeof castObj.mode === 'string' &&
        typeof castObj.size === 'number' &&
        Array.isArray(castObj.tiles) &&
        castObj.tiles.every((row) => Array.isArray(row)) &&
        typeof castObj.createdAt === 'string' &&
        typeof castObj.updatedAt === 'string' &&
        typeof castObj.visibility === 'boolean'
    );
}

export function areCtfEnemies(playerA: Player, playerB: Player) {
    return playerA?.data.includes(PlayerData.RedTeam) ? playerB?.data.includes(PlayerData.BlueTeam) : playerB?.data.includes(PlayerData.RedTeam);
}

export function areEnemies(playerA: Player, playerB: Player, game: Game): boolean {
    if (game.map.mode === GameMode.Ctf) {
        return areCtfEnemies(playerA, playerB);
    }

    return playerA?.id !== playerB?.id;
}

export function isPlayerInCombat(combat: Combat, playerId: string) {
    return [combat?.activePlayer?.id, combat?.inactivePlayer?.id].includes(playerId);
}

export function isActiveCombatPlayer(combat: Combat, playerId: string) {
    return playerId === combat.activePlayer.id;
}

export function hasEvadeLeft(player: Player) {
    return player.evasionAttempts !== 0;
}

export function isValidTileCost(cost: number, maxCost: number, game?: Game) {
    const playerInDebugMode = game?.data.debugging && !isVirtualPlayer(game?.activePlayer.player);
    return playerInDebugMode || playerHasObject(game?.activePlayer.player, ObjectName.Bird) || cost - CostConstants.TileCostAcceptance <= maxCost;
}

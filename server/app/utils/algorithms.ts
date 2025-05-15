import { Game } from '@app/classes/game';
import { PositionedPlayer } from '@app/interfaces/positionned-player';
import { CostConstants, TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { Map, TileBase, TileData, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { Position, PositionedTile } from '@common/interfaces/position';
import minHeap from 'heap-js';
import { isTerrainTile } from './game-checks';

export function bfs(tiles: PositionedTile[][], startTile: PositionedTile | undefined): PositionedTile[] {
    if (!startTile) return [];

    const visited = new Set<PositionedTile>();
    const queue: PositionedTile[] = [startTile];

    while (queue.length > 0) {
        const current = queue.shift();

        if (visited.has(current)) continue;
        visited.add(current);

        const neighbors = getNeighbors(current, tiles);

        neighbors.forEach((neighbor) => {
            if (!visited.has(neighbor) && neighbor.tile.type !== TileType.Wall) {
                queue.push(neighbor);
            }
        });
    }

    return Array.from(visited.values());
}

export function dfs(tiles: PositionedTile[][], startTile: PositionedTile, maxCost: number): PositionedTile[] {
    if (maxCost === 0) return [];
    const visited = new Set<PositionedTile>();
    const costMap = new Map<PositionedTile, number>();
    const stack: PositionedTile[] = [startTile];
    startTile.cost = 0;
    costMap.set(startTile, 0);

    while (stack.length > 0) {
        stack.sort((a, b) => b.cost - a.cost);
        const current = stack.pop();

        if (visited.has(current)) continue;
        visited.add(current);

        for (const neighbor of getNeighbors(current, tiles)) {
            const newCost = TILE_TYPE_TO_COST[neighbor.tile.type] + current.cost;
            if (newCost > maxCost || neighbor.tile.player) continue;

            if (!costMap.has(neighbor) || newCost < costMap.get(neighbor)) {
                neighbor.cost = newCost;
                costMap.set(neighbor, newCost);
                stack.push(neighbor);
            }
        }
    }
    return Array.from(visited);
}

export function dijkstra(map: Map, startBaseTile: TileBase, endBaseTile: TileBase): PositionedTile[] {
    if (startBaseTile === endBaseTile) return [];

    const tiles = toPositionedTiles(map.tiles);
    const startTile = tiles.flat().find((positionedTile) => positionedTile.tile === startBaseTile);
    const endTile = tiles.flat().find((positionedTile) => positionedTile.tile === endBaseTile);
    if (!startTile || !endTile) return [];

    const visited = new Set<PositionedTile>();
    const queue = new minHeap<PositionedTile>((a, b) => a.cost - b.cost);
    startTile.cost = 0;
    queue.push(startTile);

    let current: PositionedTile | undefined;
    while ((current = queue.pop())) {
        if (current === endTile) break;
        if (visited.has(current)) continue;
        visited.add(current);

        const neighbors = getNeighbors(current, tiles);

        neighbors.forEach((neighbor) => {
            if (visited.has(neighbor)) return;
            let newCost = current?.cost + TILE_TYPE_TO_COST[neighbor.tile.type] + CostConstants.TileCost;
            if (neighbor.tile.player) newCost += CostConstants.PlayerCost;

            if (newCost < (neighbor.cost ?? Infinity)) {
                neighbor.cost = newCost;
                neighbor.parent = current;
                queue.push(neighbor);
            }
        });
    }
    if (!endTile.parent) return [];

    let path: PositionedTile[] = [];
    let tile: PositionedTile | undefined = endTile;
    while (tile) {
        path.push(tile);
        tile = tile.parent;
    }
    path = path.reverse();
    return path;
}

export function getNeighbors<T>(position: Position, tiles: T[][]): T[] {
    const directions = [
        { dy: -1, dx: 0 },
        { dy: 1, dx: 0 },
        { dy: 0, dx: 1 },
        { dy: 0, dx: -1 },
    ];
    const isValid = (dy: number, dx: number) => dy >= 0 && dx >= 0 && tiles.length > dx && tiles.length > dy;
    const validDirections = directions.filter((direction) => isValid(position.y + direction.dy, position.x + direction.dx));
    return validDirections.map(({ dy, dx }) => tiles[dy + position.y][dx + position.x]);
}

export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

export function findTileCoordinates<T>(tiles: T[][], tileToFind: T): Position | undefined {
    for (let j = 0; j < tiles.length; j++) {
        for (let i = 0; i < tiles[j].length; i++) {
            if (tiles[j][i] === tileToFind) return { x: i, y: j };
        }
    }
    return undefined;
}

export function findTile<T>(tiles: T[][], position: Position): T | undefined {
    let foundTile;
    processMatrix(tiles, (tile, x, y) => {
        if (position?.x === x && position?.y === y) {
            foundTile = tile;
        }
    });
    return foundTile;
}

export function filterMatrix<T>(src: T[][], filterCondition: (obj: T, x?: number, y?: number) => boolean): T[] {
    const filteredArray: T[] = [];
    processMatrix(src, (obj, i, j) => {
        if (filterCondition(obj, i, j)) {
            filteredArray.push(obj);
        }
    });
    return filteredArray;
}

export function processMatrix<T>(array: T[][], callBack: (element: T, x?: number, y?: number) => void): void {
    array.forEach((row, j) => {
        row.forEach((element, i) => {
            callBack(element, i, j);
        });
    });
}

export function removePlayerData(player: Player, data: PlayerData[]): void {
    player.data = player.data.filter((info) => !data.includes(info));
}

export function playerHasObject(player: Player, objectName: ObjectName): boolean {
    return player?.inventory.some((object) => object.name === objectName);
}

export function highlightAccessibleTiles(game: Game) {
    const positionedTiles = toPositionedTiles(game.map.tiles);
    const startTile = findTile(positionedTiles, game.activePlayer.position);
    const playerHasBird = playerHasObject(game.activePlayer.player, ObjectName.Bird);
    const playerHasFlag = playerHasObject(game.activePlayer.player, ObjectName.Flag);
    let accessiblesTiles;
    if (game.data.debugging || (playerHasBird && !playerHasFlag && game.activePlayer.player.movesLeft)) {
        const isValidTile = (tile: PositionedTile) => !tile.tile.player && (isTerrainTile(tile.tile) || tile.tile.type === TileType.OpenedDoor);
        accessiblesTiles = positionedTiles.flat().filter(isValidTile);
        if (game.data.debugging) accessiblesTiles = accessiblesTiles.filter((tile) => !tile.tile.object);
    } else {
        accessiblesTiles = dfs(positionedTiles, startTile, game.activePlayer.player.movesLeft);
    }
    accessiblesTiles = accessiblesTiles.filter((tile) => tile !== startTile);
    accessiblesTiles.forEach((positionedTile) => {
        if (!positionedTile.tile.data) positionedTile.tile.data = [];
        positionedTile.tile.data.push(TileData.Accessible);
    });
}

export function respawnPlayer(player: Player, game: Game): void {
    scatterObjects(game, player);

    const currentTile = filterMatrix(game.map.tiles, (tile) => tile.player === player)[0];
    if (currentTile) delete currentTile.player;

    if (player.data.includes(PlayerData.Disconnected)) return;
    const spawnTile = findTile(game.map.tiles, player.spawnPoint);

    if (!spawnTile.player && spawnTile.object.name === ObjectName.Spawnpoint) {
        spawnTile.player = player;
    } else {
        const freeTiles = findEmptyNearbyTiles(game.map.tiles, player.spawnPoint);
        if (freeTiles.length > 0) {
            const closest = freeTiles[0];
            game.map.tiles[closest.y][closest.x].player = player;
        }
    }
}

export function scatterObjects(game: Game, player: Player): void {
    if (playerHasObject(player, ObjectName.Bird)) player.movesLeft = 0;
    const freeTiles = findEmptyNearbyTiles(game.map.tiles, toPositionedPlayer(game.map.tiles, player)?.position);
    player.inventory.forEach((object, i) => {
        object.applyEffect?.(player, false);
        freeTiles[i].tile.object = { name: object.name };
    });
    player.inventory = [];
}

export function placeRandomObjects(game: Game) {
    const objectsInMap = filterMatrix(game.map.tiles, (tile) => Boolean(tile.object));
    const objects = Object.values(ObjectName).filter((object) => object !== ObjectName.Flag && object !== ObjectName.Random);
    const absentObjects = objects.filter((object) => !objectsInMap.some((tile) => tile.object.name === object));
    const shuffledAbsentObjects = shuffleArray(absentObjects);
    let absentObjectIndex = 0;
    objectsInMap.forEach((tile) => {
        if (tile.object.name === ObjectName.Random) {
            if (absentObjectIndex < shuffledAbsentObjects.length) {
                tile.object.name = shuffledAbsentObjects[absentObjectIndex++];
            }
        }
    });
}

export function toPositionedTiles(tiles: TileBase[][]): PositionedTile[][] {
    return tiles.map((row, y) =>
        row.map(
            (tile, x) =>
                ({
                    tile,
                    y,
                    x,
                }) as PositionedTile,
        ),
    );
}

export function toPositionedPlayer(tiles: TileBase[][], player: Player): PositionedPlayer {
    let positionedPlayer: PositionedPlayer;
    processMatrix(tiles, (tile, i, j) => {
        if (tile.player === player) positionedPlayer = { player: tile.player, position: { x: i, y: j } };
    });
    return positionedPlayer;
}

export function findEmptyNearbyTiles(tiles: TileBase[][], position: Position) {
    const positionedTiles = toPositionedTiles(tiles);
    const startTile = findTile(positionedTiles, position);
    return bfs(positionedTiles, startTile).filter((tile) => isTerrainTile(tile.tile) && !tile.tile.player && !tile.tile.object);
}

export function getPlayerTeam(player: Player): PlayerData | null {
    const isBlueteam = player.data.includes(PlayerData.BlueTeam);
    if (isBlueteam) return PlayerData.BlueTeam;
    const isRedTeam = player.data.includes(PlayerData.RedTeam);
    if (isRedTeam) return PlayerData.RedTeam;
    return null;
}

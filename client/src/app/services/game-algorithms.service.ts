import { Injectable } from '@angular/core';
import { CostConstants, TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { Map, TileBase } from '@common/interfaces/map';
import { Position, PositionedTile } from '@common/interfaces/position';
import minHeap from 'heap-js';

@Injectable({
    providedIn: 'root',
})
export class GameAlgorithmsService {
    dijkstra(map: Map, startBaseTile: TileBase, endBaseTile: TileBase): PositionedTile[] {
        if (startBaseTile === endBaseTile) return [];

        const tiles = this.toPositionedTiles(map.tiles);
        const startTile = tiles.flat().find((positionedTile) => positionedTile.tile === startBaseTile);
        const endTile = tiles.flat().find((positionedTile) => positionedTile.tile === endBaseTile);
        if (!startTile || !endTile) return [];

        const visited = new Set<PositionedTile>();
        const queue = new minHeap<PositionedTile>((a, b) => a.cost - b.cost);
        queue.push(startTile);

        let current: PositionedTile | undefined;
        while ((current = queue.pop())) {
            if (current === endTile) break;
            if (visited.has(current)) continue;
            visited.add(current);

            const neighbors = this.getNeighbors(current.y, current.x, tiles);

            neighbors.forEach((neighbor) => {
                if (visited.has(neighbor) || neighbor.tile.player) return;

                const newCost = (current?.cost ?? 0) + TILE_TYPE_TO_COST[neighbor.tile.type] + CostConstants.TileCost;
                if (newCost < (neighbor.cost ?? Infinity)) {
                    neighbor.cost = newCost;
                    neighbor.parent = current;
                    queue.push(neighbor);
                }
            });
        }

        if (!endTile.parent) return [];

        const path: PositionedTile[] = [];
        let tile: PositionedTile | undefined = endTile;
        while (tile) {
            path.push(tile);
            tile = tile.parent;
        }
        path.pop();
        return path.reverse();
    }

    findTilePosition(map: Map, tile: TileBase): Position {
        for (let y = 0; y < map.tiles.length; y++) {
            for (let x = 0; x < map.tiles[y].length; x++) {
                if (map.tiles[y][x] === tile) {
                    return { x, y };
                }
            }
        }
        throw new Error('Tile not found on the map');
    }

    findTileFromPosition(map: Map, pos: Position): TileBase {
        return map.tiles[pos.y]?.[pos.x];
    }

    private getNeighbors<T>(y: number, x: number, tiles: T[][]): T[] {
        const directions = [
            { dy: -1, dx: 0 },
            { dy: 1, dx: 0 },
            { dy: 0, dx: 1 },
            { dy: 0, dx: -1 },
        ];
        const isValid = (dy: number, dx: number) => dy >= 0 && dx >= 0 && tiles.length > dx && tiles.length > dy;
        const validDirections = directions.filter((direction) => isValid(y + direction.dy, x + direction.dx));
        return validDirections.map(({ dy, dx }) => tiles[dy + y][dx + x]);
    }

    private toPositionedTiles(tiles: TileBase[][]): PositionedTile[][] {
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
}

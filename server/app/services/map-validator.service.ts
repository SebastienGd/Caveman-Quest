import { bfs, filterMatrix, getNeighbors } from '@app/utils/algorithms';
import { MapConstants } from '@app/utils/constants/map-constants';
import { SIZE_TO_QUANTITY } from '@app/utils/constants/object-constants';
import { isTerrainTile } from '@app/utils/game-checks';
import { GameMode, Map, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { PositionedTile } from '@common/interfaces/position';
import { Service } from 'typedi';

@Service()
export class MapValidatorService {
    checkDescription(map: Map, errors: string[]): void {
        if (!map.description || map.description.trim() === '') {
            errors.push('Erreur: La carte doit avoir une description.');
        }
    }

    checkTerrainCoverage(map: Map, errors: string[]): void {
        const terrainTiles = filterMatrix(map.tiles, (tile) => isTerrainTile(tile));
        if (terrainTiles.length <= (map.size * map.size) / 2) {
            errors.push('Erreur: Au moins 50% des tuiles de la carte doivent être de type Terrain.');
        }
    }

    checkObjectConstraints(map: Map, errors: string[]): void {
        const tilesWithObjects = filterMatrix(map.tiles, (tile) => tile.object != null);
        const expectedFlagCount = SIZE_TO_QUANTITY[map.size][ObjectName.Flag];
        const flagTilesCount = tilesWithObjects.filter((tile) => tile.object.name === ObjectName.Flag).length;
        const expectedSpawnCount = SIZE_TO_QUANTITY[map.size][ObjectName.Spawnpoint];
        const spawnTilesCount = tilesWithObjects.filter((tile) => tile.object.name === ObjectName.Spawnpoint).length;
        const expectedObjectsCount = SIZE_TO_QUANTITY[map.size][ObjectName.Random];
        const objectTilesCount = tilesWithObjects.filter(
            (tile) => tile.object.name !== ObjectName.Spawnpoint && tile.object.name !== ObjectName.Flag,
        ).length;

        if (expectedSpawnCount !== spawnTilesCount) {
            errors.push(`Erreur: La carte devrait contenir ${expectedSpawnCount} points de départ, veuillez ajouter le nombre approprié.`);
        }
        if (map.mode === GameMode.Ctf && flagTilesCount < expectedFlagCount) {
            errors.push(`Erreur: La carte devrait contenir ${expectedFlagCount} drapeaux, veuillez tous les placer.`);
        }
        if (tilesWithObjects.filter((tile) => !isTerrainTile(tile)).length) {
            errors.push('Erreur: Un ou plusieurs objets sont sur des tuiles invalides.');
        }
        if (expectedObjectsCount !== objectTilesCount) {
            errors.push(`Erreur: La carte devrait contenir ${expectedObjectsCount} items, veuillez vérifier le nombre approprié.`);
        }
    }

    checkDoorPlacement(tiles: PositionedTile[][], errors: string[]): void {
        for (const positionedTile of tiles.flat()) {
            if (positionedTile.tile.type === TileType.ClosedDoor || positionedTile.tile.type === TileType.OpenedDoor) {
                const neighbors = getNeighbors(positionedTile, tiles);
                if (neighbors.length !== MapConstants.MaxNeighbors) {
                    errors.push(`Erreur: La porte aux coordonnées (${positionedTile.x}, ${positionedTile.y}) est sur la bordure de la map.`);
                } else if (!this.isDoorPositionValid(neighbors)) {
                    errors.push(`Erreur: Placement de la porte invalide aux coordonnées (${positionedTile.x}, ${positionedTile.y}).`);
                }
            }
        }
    }

    checkTileAccessibility(tiles: PositionedTile[][], errors: string[]): void {
        const positionedTerrainTiles = filterMatrix(tiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
        const visitedTiles = bfs(tiles, positionedTerrainTiles[0]);
        const positionedNonWallTiles = filterMatrix(tiles, (positionnedTile) => positionnedTile.tile.type !== TileType.Wall);
        if (visitedTiles.length < positionedNonWallTiles.length) {
            errors.push('Erreur: La carte contient des tuiles de type Terrain isolées et inaccessibles.');
        }
    }

    private isDoorPositionValid(neighbors: PositionedTile[]): boolean {
        const up = neighbors[0].tile;
        const down = neighbors[1].tile;
        const right = neighbors[2].tile;
        const left = neighbors[3].tile;
        const isVerticalValid = up.type === TileType.Wall && down.type === TileType.Wall && isTerrainTile(right) && isTerrainTile(left);
        const isHorizontalValid = right.type === TileType.Wall && left.type === TileType.Wall && isTerrainTile(up) && isTerrainTile(down);
        return isVerticalValid || isHorizontalValid;
    }
}

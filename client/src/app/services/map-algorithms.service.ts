import { Injectable } from '@angular/core';
import { Map, TileData, TileType } from '@common/interfaces/map';

@Injectable({
    providedIn: 'root',
})
export class MapAlgorithmsService {
    validateDoors(map: Map) {
        const { size, tiles } = map;
        map.tiles.flat().forEach((tile) => {
            delete tile.data;
        });

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (!this.isDoorTile(tiles[i][j].type)) continue;

                if (!this.isDoorValid(map, i, j)) {
                    map.tiles[i][j].data = [TileData.InvalidTile];
                }
            }
        }
    }

    isDoorTile(tileType: TileType) {
        return [TileType.ClosedDoor, TileType.OpenedDoor].includes(tileType);
    }

    isTerrainTile(tileType: TileType) {
        return ![TileType.ClosedDoor, TileType.OpenedDoor, TileType.Wall].includes(tileType);
    }

    countObjectOccurence(map: Map, objectName: string) {
        let count = 0;
        map.tiles?.forEach((row) => {
            row.forEach((tile) => {
                if (tile.object?.name === objectName) {
                    ++count;
                }
            });
        });

        return count;
    }

    private isDoorValid(map: Map, i: number, j: number) {
        const { size, tiles } = map;
        if (i === 0 || j === 0 || i === size - 1 || j === size - 1) {
            return false;
        }

        const up = tiles[i - 1][j].type;
        const down = tiles[i + 1][j].type;
        const left = tiles[i][j - 1].type;
        const right = tiles[i][j + 1].type;

        const isVerticallyValid = up === TileType.Wall && down === TileType.Wall && this.isTerrainTile(left) && this.isTerrainTile(right);
        const isHorizontallyValid = left === TileType.Wall && right === TileType.Wall && this.isTerrainTile(up) && this.isTerrainTile(down);
        return isVerticallyValid || isHorizontallyValid;
    }
}

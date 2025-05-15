import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WebRoute } from '@common/constants/web-routes';
import { GameMode, Map, MapSize, TileBase, TileType } from '@common/interfaces/map';
import { GridInteractionMode } from 'src/utils/constants/edit-game-constants';
import { SIZE_TO_QUANTITY } from 'src/utils/constants/object-quantity-constants';
import { MapAlgorithmsService } from './map-algorithms.service';
import { ServerFetchService } from './server-fetch.service';

@Injectable({
    providedIn: 'root',
})
export class EditGameService {
    map: Map = { size: MapSize.Small } as Map; // Default size is needed to initialize the html without error
    activeTile: TileType | null = null;
    draggedTileWithObject: TileBase | null = null;
    private interactionMode: GridInteractionMode = GridInteractionMode.Idle;

    constructor(
        private router: Router,
        private serverFetchService: ServerFetchService,
        private mapAlgorithmsService: MapAlgorithmsService,
    ) {}

    fetchMap(id?: string, size?: number, mode?: GameMode) {
        const savedMap = localStorage.getItem('map');
        if (savedMap) {
            this.map = JSON.parse(savedMap);
        } else if (id) {
            this.fetchExistingMap(id);
        } else if (!this.tryCreateNewMap(size, mode)) {
            this.router.navigate([WebRoute.Home]);
        }
    }

    fetchExistingMap(id: string) {
        this.serverFetchService.getMap(id).subscribe({
            next: (map: Map) => {
                this.map = map;
                localStorage.setItem('map', JSON.stringify(map));
            },
            error: () => {
                this.router.navigate([WebRoute.Home]);
            },
        });
    }

    generateMap(size: number, mode: GameMode): Map {
        const tiles = Array.from({ length: size }, () =>
            Array.from({ length: size }, () => ({
                type: TileType.Base,
            })),
        );

        const map: Map = {
            _id: '',
            name: '',
            description: '',
            mode,
            size,
            tiles,
            createdAt: '',
            updatedAt: '',
            visibility: true,
        };
        return map;
    }

    modifyTile(tile: TileBase) {
        if (this.interactionMode === GridInteractionMode.Paint) {
            this.paintTile(tile);
        } else if (this.interactionMode === GridInteractionMode.Delete) {
            tile.type = TileType.Base;
        }
        this.mapAlgorithmsService.validateDoors(this.map);
    }

    handleClick(tile: TileBase, interaction: GridInteractionMode) {
        this.interactionMode = interaction;

        if (!tile.object && this.activeTile === TileType.ClosedDoor) {
            if (TileType.ClosedDoor === tile.type) {
                tile.type = TileType.OpenedDoor;
            } else if (TileType.OpenedDoor === tile.type) {
                tile.type = TileType.ClosedDoor;
            }
        }
        this.modifyTile(tile);
    }

    dropItem(tile: TileBase) {
        if (this.draggedTileWithObject && tile !== this.draggedTileWithObject && this.mapAlgorithmsService.isTerrainTile(tile.type)) {
            tile.object = this.draggedTileWithObject.object;
            this.draggedTileWithObject.object = undefined;
        }
        this.draggedTileWithObject = null;
    }

    dropItemOutsideMap() {
        if (this.draggedTileWithObject) {
            this.draggedTileWithObject.object = undefined;
            this.draggedTileWithObject = null;
        }
    }

    resetInteraction() {
        this.interactionMode = GridInteractionMode.Idle;
        this.draggedTileWithObject = null;
    }

    isValidObjectOccurence(objectName: string) {
        const count = this.mapAlgorithmsService.countObjectOccurence(this.map, objectName);
        return SIZE_TO_QUANTITY[this.map.size][objectName] > count;
    }

    remainingObjectCount(objectName: string) {
        return SIZE_TO_QUANTITY[this.map.size][objectName] - this.mapAlgorithmsService.countObjectOccurence(this.map, objectName);
    }

    private tryCreateNewMap(size?: number, mode?: GameMode): boolean {
        const sizeParamValid = size && Object.values(MapSize).includes(Number(size));
        const modeParamValid = mode && [GameMode.Ctf, GameMode.Classical].includes(mode);
        if (sizeParamValid && modeParamValid) {
            this.map = this.generateMap(Number(size), mode);
            localStorage.setItem('map', JSON.stringify(this.map));
            return true;
        }
        return false;
    }
    private paintTile(tile: TileBase) {
        if (this.activeTile) {
            if (!this.mapAlgorithmsService.isTerrainTile(this.activeTile)) {
                tile.object = undefined;
            }
            if (this.activeTile === TileType.ClosedDoor) {
                if (!this.mapAlgorithmsService.isDoorTile(tile.type)) {
                    tile.type = this.activeTile;
                }
            } else {
                tile.type = this.activeTile;
            }
        }
    }
}

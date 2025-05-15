import { TestBed } from '@angular/core/testing';

import { GameMode, Map, TileData, TileType } from '@common/interfaces/map';
import { GameObject } from '@common/interfaces/object';
import { MapAlgorithmsService } from './map-algorithms.service';

describe('MapAlgorithmsService', () => {
    let service: MapAlgorithmsService;
    let map: Map;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(MapAlgorithmsService);
        map = {
            _id: '123',
            name: 'Test Map',
            description: 'Test Description',
            mode: GameMode.Ctf,
            size: 10,
            tiles: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ type: TileType.Base }))),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            visibility: true,
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should count object occurrences correctly', () => {
        map.tiles[0][0].object = { name: 'steak' } as GameObject;
        map.tiles[0][1].object = { name: 't-rex' } as GameObject;
        map.tiles[3][3].object = { name: 'random' } as GameObject;
        map.tiles[3][4].object = { name: 'random' } as GameObject;
        const steakCount = service.countObjectOccurence(map, 'steak');
        const trexCount = service.countObjectOccurence(map, 't-rex');
        const randomCount = service.countObjectOccurence(map, 'random');
        expect(steakCount).toEqual(1);
        expect(trexCount).toEqual(1);
        expect(randomCount).toEqual(2);
    });

    it('should recognise valid doors correctly', () => {
        map.tiles[1][1].type = TileType.ClosedDoor;
        map.tiles[0][1].type = TileType.Wall;
        map.tiles[2][1].type = TileType.Wall;

        map.tiles[4][5].type = TileType.ClosedDoor;
        map.tiles[4][6].type = TileType.Wall;
        map.tiles[4][4].type = TileType.Wall;
        service.validateDoors(map);
        let nbrOfInvalidTiles = 0;
        map.tiles.flat().forEach((tile) => {
            if (tile?.data?.includes(TileData.InvalidTile) || false) nbrOfInvalidTiles++;
        });
        expect(nbrOfInvalidTiles).toBe(0);
    });

    it('should mark invalid doors correctly', () => {
        map.tiles[1][1].type = TileType.ClosedDoor;
        service.validateDoors(map);
        let nbrOfInvalidTiles = 0;
        map.tiles.flat().forEach((tile) => {
            if (tile?.data?.includes(TileData.InvalidTile) || false) nbrOfInvalidTiles++;
        });
        expect(nbrOfInvalidTiles).toBeGreaterThan(0);
    });

    it('should mark doors at the edge of the map as incorrect', () => {
        map.tiles[0][7].type = TileType.ClosedDoor;
        service.validateDoors(map);
        let nbrOfInvalidTiles = 0;
        map.tiles.flat().forEach((tile) => {
            if (tile?.data?.includes(TileData.InvalidTile) || false) nbrOfInvalidTiles++;
        });
        expect(nbrOfInvalidTiles).toBeGreaterThan(0);
    });
});

/* eslint-disable no-console */
import { TestBed } from '@angular/core/testing';
import { TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { GameBase } from '@common/interfaces/game';
import { GameMode, Map, TileBase, TileType } from '@common/interfaces/map';
import { PositionedTile } from '@common/interfaces/position';
import { mockGame } from 'src/tests/mock-game';
import { GameAlgorithmsService } from './game-algorithms.service';

describe('AlgorithmsService', () => {
    let service: GameAlgorithmsService;
    let mockedGame: GameBase;
    const TOTAL_COST = 10;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameAlgorithmsService);
        mockedGame = JSON.parse(JSON.stringify(mockGame));
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return an empty path if no valid path exists between tiles', () => {
        const startTile = mockedGame.map.tiles[0][4];
        const endTile = mockedGame.map.tiles[2][2];
        expect(startTile.type).toBe(TileType.Wall);
        expect(endTile.type).toBe(TileType.Wall);

        const resultPath = service.dijkstra(mockedGame.map, startTile, endTile);
        expect(resultPath).toEqual([]);
    });

    it('should return empty path if startTile and endTile are the same', () => {
        const startEndTile = mockedGame.map.tiles[1][1];
        const path = service.dijkstra(mockedGame.map, startEndTile, startEndTile);
        expect(path).toEqual([]);
    });

    it('should return empty path if start or end tile not found in positionedTiles', () => {
        const fakeTile: TileBase = {
            type: TileType.Base,
            data: [],
        };
        const path = service.dijkstra(mockedGame.map, fakeTile, mockedGame.map.tiles[0][1]);
        expect(path).toEqual([]);
    });

    it('should not consider neighbors with a player on the tile (blocked)', () => {
        const startTile = mockedGame.map.tiles[9][2];
        const endTile = mockedGame.map.tiles[0][1];
        const neighborsPositions = [
            { y: 8, x: 2 },
            { y: 9, x: 1 },
            { y: 9, x: 3 },
        ];
        neighborsPositions.forEach((pos) => {
            const tile = mockedGame.map.tiles[pos.y]?.[pos.x];
            if (tile) tile.player = mockedGame.players[1];
        });
        const path = service.dijkstra(mockedGame.map, startTile, endTile);
        expect(path).toEqual([]);
    });

    it('should return empty path if queue shift returns undefined (force early return)', () => {
        const miniMap: Map = {
            _id: 'dummy',
            name: 'test',
            description: '',
            size: 1,
            mode: GameMode.Classical,
            visibility: true,
            createdAt: '',
            updatedAt: '',
            tiles: [[]],
        };
        const fakeTile: TileBase = { type: TileType.Base };
        const path = service.dijkstra(miniMap, fakeTile, fakeTile);
        expect(path).toEqual([]);
    });

    it('should return empty path if starBaseTile is null', () => {
        const miniMap: Map = {
            _id: 'dummy',
            name: 'test',
            description: '',
            size: 1,
            mode: GameMode.Classical,
            visibility: true,
            createdAt: '',
            updatedAt: '',
            tiles: [[]],
        };
        const fakeTile: TileBase = { type: TileType.Base };
        const path = service.dijkstra(miniMap, fakeTile, fakeTile);
        expect(path).toEqual([]);
    });

    it('should return empty path if endTile has no parent (blocked before reaching)', () => {
        const startTile = mockedGame.map.tiles[9][2];
        const endTile = mockedGame.map.tiles[0][1];

        const neighborsPositions = [
            { y: 8, x: 2 },
            { y: 9, x: 1 },
            { y: 9, x: 3 },
        ];
        neighborsPositions.forEach((pos) => {
            const tile = mockedGame.map.tiles[pos.y]?.[pos.x];
            if (tile) {
                tile.type = TileType.Wall;
            }
        });

        const result = service.dijkstra(mockedGame.map, startTile, endTile);
        expect(result).toEqual([]);
    });

    it('should find the shortest path using Dijkstra from spawnpoint to T-Rex', () => {
        const positionedTiles = service['toPositionedTiles'](mockedGame.map.tiles);

        const startTile =
            positionedTiles.flat().find((pt: PositionedTile) => pt.tile.object?.name === 'spawnpoint' && pt.tile.player?.id === 'player-4')?.tile ||
            ({} as TileBase);

        const endTile = positionedTiles.flat().find((pt: PositionedTile) => pt.tile.object?.name === 't-rex')?.tile || ({} as TileBase);

        const shortestPath: PositionedTile[] = service.dijkstra(mockedGame.map, startTile, endTile);

        expect(shortestPath.length).toBeGreaterThan(0);
        expect(shortestPath[shortestPath.length - 1].tile).toBe(endTile);

        const expectedSteps = [
            { y: 1, x: 7, type: 'water', cost: 2 },
            { y: 1, x: 6, type: 'ice', cost: 3 },
            { y: 2, x: 6, type: 'base', cost: 4 },
            { y: 3, x: 6, type: 'ice', cost: 5 },
            { y: 3, x: 5, type: 'base', cost: 6 },
            { y: 3, x: 4, type: 'base', cost: 7 },
            { y: 3, x: 3, type: 'base', cost: 8 },
            { y: 3, x: 2, type: 'base', cost: 1 },
            { y: 3, x: 1, type: 'base', cost: 1 },
            { y: 2, x: 1, type: 'ice', cost: 0 },
            { y: 1, x: 1, type: 'ice', cost: 0 },
            { y: 0, x: 1, type: 'base', cost: 1 },
            { y: 0, x: 0, type: 'base', cost: 1 },
        ];

        shortestPath.forEach((posTile, index) => {
            expect(posTile.y).toBe(expectedSteps[index].y);
            expect(posTile.x).toBe(expectedSteps[index].x);
            expect(posTile.tile.type).toBe(expectedSteps[index].type);
        });

        const calculatedCost = shortestPath.reduce((acc, tile) => acc + TILE_TYPE_TO_COST[tile.tile.type], 0);

        expect(calculatedCost).toEqual(TOTAL_COST);
    });

    it('should find the correct position of a tile using findTilePosition()', () => {
        const tileToFind = mockedGame.map.tiles[2][3];
        const position = service.findTilePosition(mockedGame.map, tileToFind);

        expect(position).toEqual({ x: 3, y: 2 });
    });

    it('should throw an error if tile is not found in findTilePosition()', () => {
        const fakeTile = { ...mockedGame.map.tiles[0][0] };
        expect(() => service.findTilePosition(mockedGame.map, fakeTile)).toThrowError('Tile not found on the map');
    });

    it('should return the correct tile from a position using findTileFromPosition()', () => {
        const expectedTile = mockedGame.map.tiles[1][4];
        const resultTile = service.findTileFromPosition(mockedGame.map, { x: 4, y: 1 });

        expect(resultTile).toBe(expectedTile);
    });

    it('should return undefined for invalid position in findTileFromPosition()', () => {
        const resultTile = service.findTileFromPosition(mockedGame.map, { x: 100, y: 100 });
        expect(resultTile).toBeUndefined();
    });
});

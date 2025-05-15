import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { SinonSandbox, createSandbox } from 'sinon';

import { MapValidatorService } from '@app/services/map-validator.service';
import * as algorithms from '@app/utils/algorithms';
import * as gameChecks from '@app/utils/game-checks';

import { GameMode, Map, MapSize, TileBase, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { PositionedTile } from '@common/interfaces/position';

describe('MapValidatorService', () => {
    let validator: MapValidatorService;
    let sandbox: SinonSandbox;

    beforeEach(() => {
        validator = new MapValidatorService();
        sandbox = createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('checkDescription', () => {
        it('should add an error if the description is empty', () => {
            const map = { description: '' } as Map;
            const errors: string[] = [];
            validator.checkDescription(map, errors);
            expect(errors).to.include('Erreur: La carte doit avoir une description.');
        });

        it('should not add an error if the description is valid', () => {
            const map = { description: 'A valid description' } as Map;
            const errors: string[] = [];
            validator.checkDescription(map, errors);
            return expect(errors).to.be.empty;
        });
    });

    describe('checkTerrainCoverage', () => {
        it('should not add an error if terrain coverage is sufficient', () => {
            const errors: string[] = [];
            const tiles: TileBase[][] = [
                [{ type: TileType.Water }, { type: TileType.Base }],
                [{ type: TileType.Ice }, { type: TileType.Wall }],
            ];
            const map = { description: 'Test', size: 2, tiles } as Map;

            validator.checkTerrainCoverage(map, errors);
            return expect(errors).to.be.empty;
        });

        it('should add an error if terrain coverage is insufficient', () => {
            const map = { description: 'Test', size: 4, tiles: [] } as Map;
            const errors: string[] = [];
            const tiles: TileBase[] = [{ type: TileType.Base }];
            sandbox.stub(algorithms, 'filterMatrix').returns(tiles);
            validator.checkTerrainCoverage(map, errors);
            return expect(errors).to.include('Erreur: Au moins 50% des tuiles de la carte doivent être de type Terrain.');
        });

        it('should not add an error if terrain coverage is sufficient', () => {
            const map = { description: 'Test', size: 2, tiles: [] } as Map;
            const errors: string[] = [];
            const terrainTiles: TileBase[] = [{ type: TileType.Base }, { type: TileType.Base }, { type: TileType.Base }];
            sandbox.stub(algorithms, 'filterMatrix').returns(terrainTiles);
            validator.checkTerrainCoverage(map, errors);
            return expect(errors).to.be.empty;
        });
    });

    describe('checkObjectConstraints', () => {
        it('should add an error if a tile with an object is on an invalid (non-terrain) tile', () => {
            const errors: string[] = [];
            const tileWithObject: TileBase = { type: TileType.Wall, object: { name: ObjectName.Bird } };
            const map = { description: 'Test', size: MapSize.Small, mode: GameMode.Ctf, tiles: [[tileWithObject]] } as Map;

            sandbox.stub(gameChecks, 'isTerrainTile').returns(false);
            validator.checkObjectConstraints(map, errors);
            return expect(errors).to.include('Erreur: Un ou plusieurs objets sont sur des tuiles invalides.');
        });

        it('should add an error if tile with a flag appears in a classical map', () => {
            const map = { description: 'Test', size: MapSize.Small, mode: GameMode.Classical, tiles: [[]] } as Map;
            const errors: string[] = [];
            const tileWithObject: TileBase = { type: TileType.Base, object: { name: ObjectName.Flag } };
            sandbox.stub(algorithms, 'filterMatrix').returns([tileWithObject]);
            sandbox.stub(gameChecks, 'isTerrainTile').returns(false);
            validator.checkObjectConstraints(map, errors);
            return expect(errors).to.include('Erreur: Un ou plusieurs objets sont sur des tuiles invalides.');
        });

        it('should add an error if spawnpoints are not the right amount in a classical map', () => {
            const map = { description: 'Test', size: MapSize.Small, mode: GameMode.Classical, tiles: [[]] } as Map;
            const errors: string[] = [];
            const tileWithObject: TileBase = { type: TileType.Base, object: { name: ObjectName.Spawnpoint } };
            sandbox.stub(algorithms, 'filterMatrix').returns([tileWithObject]);
            sandbox.stub(gameChecks, 'isTerrainTile').returns(false);
            validator.checkObjectConstraints(map, errors);
            return expect(errors).to.include('Erreur: La carte devrait contenir 2 points de départ, veuillez ajouter le nombre approprié.');
        });
    });

    describe('checkDoorPlacement', () => {
        it('should add an error if a door tile has fewer than 4 neighbors', () => {
            const errors: string[] = [];
            const doorTile: PositionedTile = {
                x: 2,
                y: 2,
                cost: 0,
                tile: { type: TileType.OpenedDoor },
            };
            const tiles: PositionedTile[][] = [[doorTile]];
            sandbox.stub(algorithms, 'getNeighbors').returns([]);
            validator.checkDoorPlacement(tiles, errors);
            return expect(errors).to.include('Erreur: La porte aux coordonnées (2, 2) est sur la bordure de la map.');
        });

        it('should add an error if a door isnt placed on a valid axis', () => {
            const errors: string[] = [];
            const doorTile: PositionedTile = { x: 5, y: 5, cost: 0, tile: { type: TileType.ClosedDoor } };
            const tiles: PositionedTile[][] = [[doorTile]];
            const neighbors: PositionedTile[] = [
                { x: 5, y: 4, cost: 0, tile: { type: TileType.Base } },
                { x: 5, y: 6, cost: 0, tile: { type: TileType.Wall } },
                { x: 6, y: 5, cost: 0, tile: { type: TileType.Wall } },
                { x: 4, y: 5, cost: 0, tile: { type: TileType.Wall } },
            ];
            sandbox.stub(algorithms, 'getNeighbors').returns(neighbors);
            sandbox.stub(gameChecks, 'isTerrainTile').callsFake((tile: TileBase) => tile.type === TileType.Base);
            validator.checkDoorPlacement(tiles, errors);
            return expect(errors).to.include('Erreur: Placement de la porte invalide aux coordonnées (5, 5).');
        });

        it('should not add an error if a door is placed on an axis', () => {
            const errors: string[] = [];
            const doorTile: PositionedTile = { x: 5, cost: 0, y: 5, tile: { type: TileType.ClosedDoor } };
            const tiles: PositionedTile[][] = [[doorTile]];
            const neighbors: PositionedTile[] = [
                { x: 5, y: 4, cost: 0, tile: { type: TileType.Wall } },
                { x: 5, y: 6, cost: 0, tile: { type: TileType.Wall } },
                { x: 6, y: 5, cost: 0, tile: { type: TileType.Base } },
                { x: 4, y: 5, cost: 0, tile: { type: TileType.Base } },
            ];
            sandbox.stub(algorithms, 'getNeighbors').returns(neighbors);
            sandbox.stub(gameChecks, 'isTerrainTile').callsFake((tile: TileBase) => tile.type === TileType.Base);
            validator.checkDoorPlacement(tiles, errors);
            return expect(errors).to.be.empty;
        });
    });

    describe('checkTileAccessibility', () => {
        it('should add an error if not all non-wall tiles are visited', () => {
            const errors: string[] = [];
            const tile1: PositionedTile = { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } };
            const tile2: PositionedTile = { x: 1, y: 0, cost: 0, tile: { type: TileType.Wall } };
            const tile3: PositionedTile = { x: 2, y: 0, cost: 0, tile: { type: TileType.Base } };
            const posTiles: PositionedTile[][] = [[tile1, tile2, tile3]];
            sandbox.stub(algorithms, 'bfs').returns([tile1]);
            sandbox.stub(algorithms, 'filterMatrix').callsFake((tiles: unknown[], predicate: (tile: unknown) => boolean) => {
                return tiles.flat().filter(predicate);
            });
            validator.checkTileAccessibility(posTiles, errors);
            return expect(errors).to.include('Erreur: La carte contient des tuiles de type Terrain isolées et inaccessibles.');
        });

        it('should not add an error if all non-wall tiles are visited', () => {
            const errors: string[] = [];
            const tile1: PositionedTile = { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } };
            const tile2: PositionedTile = { x: 1, y: 0, cost: 0, tile: { type: TileType.Wall } };
            const posTiles: PositionedTile[][] = [[tile1, tile2]];
            sandbox.stub(algorithms, 'bfs').returns([tile1]);
            sandbox.stub(algorithms, 'filterMatrix').callsFake((tiles: unknown[], predicate: (tile: unknown) => boolean) => {
                return tiles.flat().filter(predicate);
            });
            validator.checkTileAccessibility(posTiles, errors);
            return expect(errors).to.be.empty;
        });
    });
});

import { Game } from '@app/classes/game';
import {
    bfs,
    dfs,
    dijkstra,
    filterMatrix,
    findEmptyNearbyTiles,
    findTileCoordinates,
    getNeighbors,
    highlightAccessibleTiles,
    placeRandomObjects,
    removePlayerData,
    respawnPlayer,
    scatterObjects,
    toPositionedPlayer,
    toPositionedTiles,
} from '@app/utils/algorithms';

import { CostConstants } from '@common/constants/game-constants';
import { createObject } from '@app/classes/game-objects';
import { GameMode, Map, TileBase, TileData, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { PositionedTile } from '@common/interfaces/position';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { describe } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import { isMap, isTerrainTile } from './game-checks';

const serverRoot = process.cwd();

const validMap = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/validMap.json'), 'utf8'));
const invalidMap = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/invalidMap.json'), 'utf8'));

const toPositionedTileMatrix = (tiles: TileBase[][]): PositionedTile[][] => toPositionedTiles(tiles);

const MAX_NEIGHBORS = 4;
const CORNER_NEIGHBORS = 2;
dotenv.config();

const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));
const player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8')) as Player;
const player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8')) as Player;
const player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8')) as Player;
const player4 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player4.json'), 'utf8')) as Player;
const players = [player1, player2, player3, player4];

describe('Algorithms', () => {
    let game: Game;

    function applyToTiles(callBack: (tile: TileBase, x?: number, y?: number) => void) {
        game.map.tiles.forEach((row, i) => {
            row.forEach((tile, j) => {
                callBack(tile, j, i);
            });
        });
    }
    beforeEach(() => {
        game = new Game(JSON.parse(JSON.stringify(map)), '9111', players);
    });
    describe('filterMatrix', () => {
        it('should filter tiles based on the condition', () => {
            const tiles: TileBase[][] = validMap.tiles;
            const terrainTiles = filterMatrix(tiles, (tile: TileBase) => isTerrainTile(tile));
            expect(terrainTiles).to.be.an('array');
            expect(terrainTiles.length).to.be.greaterThan(0);
            terrainTiles.forEach((tile) => {
                expect([TileType.Base, TileType.Water, TileType.Ice]).to.include(tile.type);
            });
        });

        it('should return an empty array if no tiles match the condition', () => {
            const tiles: TileBase[][] = validMap.tiles;
            const nonExistentTiles = filterMatrix(tiles, (tile) => tile.type === ('NON_EXISTENT_TYPE' as TileType));
            return expect(nonExistentTiles).to.be.an('array').that.is.empty;
        });

        it('should return an empty array for an empty matrix', () => {
            const tiles: TileBase[][] = [];
            const filteredTiles = filterMatrix(tiles, (tile) => isTerrainTile(tile));
            return expect(filteredTiles).to.be.an('array').that.is.empty;
        });
    });

    describe('bfs', () => {
        it('should return all accessible tiles in the map', () => {
            const tiles: TileBase[][] = validMap.tiles;
            const positionedTiles: PositionedTile[][] = toPositionedTileMatrix(tiles);
            const positionedTerrainTiles = filterMatrix(positionedTiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
            const visitedTiles = bfs(positionedTiles, positionedTerrainTiles[0]);

            const accessibleTiles = filterMatrix(tiles, (tile) =>
                [TileType.Base, TileType.Water, TileType.Ice, TileType.OpenedDoor, TileType.ClosedDoor].includes(tile.type),
            );

            return expect(visitedTiles).to.be.an('array'), expect(visitedTiles.length).to.equal(accessibleTiles.length);
        });

        it('should return an empty array if there are no accessible tiles', () => {
            const tiles: PositionedTile[][] = [[{ x: 0, y: 0, cost: 0, tile: { type: TileType.Wall, object: null } }]];
            const positionedTerrainTiles = filterMatrix(tiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
            const visitedTiles = bfs(tiles, positionedTerrainTiles[0]);
            return expect(visitedTiles).to.be.an('array').that.is.empty;
        });

        it('should visit fewer tiles than the number of accessible tiles in a blocked map', () => {
            const tiles: TileBase[][] = invalidMap.tiles;
            const positionedTiles: PositionedTile[][] = toPositionedTileMatrix(tiles);
            const positionedTerrainTiles = filterMatrix(positionedTiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
            const visitedTiles = bfs(positionedTiles, positionedTerrainTiles[0]);

            const accessibleTiles = filterMatrix(tiles, (tile) =>
                [TileType.Base, TileType.Water, TileType.Ice, TileType.OpenedDoor, TileType.ClosedDoor].includes(tile.type),
            );
            return expect(visitedTiles).to.be.an('array'), expect(visitedTiles.length).to.be.lessThan(accessibleTiles.length);
        });
    });

    describe('dfs', () => {
        it('should return all accessible tiles within range', () => {
            const NBR_OF_VISITED_TILES = 3;
            const tiles: TileBase[][] = validMap.tiles;
            const positionedTiles: PositionedTile[][] = toPositionedTileMatrix(tiles);
            const positionedTerrainTiles = filterMatrix(positionedTiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
            const visitedTiles = dfs(positionedTiles, positionedTerrainTiles[0], 1);
            const visitedTiles2 = dfs(positionedTiles, positionedTerrainTiles[0], 2);
            const EXPECTED_LENGTH = 6;
            return (
                expect(visitedTiles).to.be.an('array'),
                expect(visitedTiles.length).to.be.equal(NBR_OF_VISITED_TILES) && expect(visitedTiles2.length).to.be.equal(EXPECTED_LENGTH)
            );
        });
    });

    describe('dijkstra', () => {
        it('should return shortest path', () => {
            const tiles: TileBase[][] = validMap.tiles;
            const positionedTiles: PositionedTile[][] = toPositionedTileMatrix(tiles);
            const positionedTerrainTiles = filterMatrix(positionedTiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
            const visitedTiles = dijkstra({ tiles } as Map, positionedTerrainTiles[0].tile, positionedTerrainTiles[9].tile);
            const EXPECTED_LENGTH = 10;
            return expect(visitedTiles).to.be.an('array'), expect(visitedTiles.length).to.be.equal(EXPECTED_LENGTH);
        });
        it('should not return shortest path if endTile cant be found', () => {
            const tiles: TileBase[][] = validMap.tiles;
            const positionedTiles: PositionedTile[][] = toPositionedTileMatrix(tiles);
            const positionedTerrainTiles = filterMatrix(positionedTiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
            const invalidEnd: PositionedTile = { x: 444, y: 32323, tile: {} as TileBase, cost: 32 };

            const visitedTiles = dijkstra({ tiles } as Map, positionedTerrainTiles[0].tile, invalidEnd.tile);

            return expect(visitedTiles).to.be.an('array'), expect(visitedTiles.length).to.be.equal(0);
        });
        it('should return null if startTile and endTile are the same', () => {
            const tiles: TileBase[][] = validMap.tiles;
            const visitedTiles = dijkstra({ tiles } as Map, tiles[0][0], tiles[0][0]);
            return expect(visitedTiles).to.be.an('array'), expect(visitedTiles.length).to.be.equal(0);
        });
        it('should return shortest path with players cost', () => {
            const tiles: TileBase[][] = validMap.tiles;
            const positionedTiles: PositionedTile[][] = toPositionedTileMatrix(tiles);
            const positionedTerrainTiles = filterMatrix(positionedTiles, (positionnedTile) => isTerrainTile(positionnedTile.tile));
            positionedTerrainTiles[9].tile.player = {} as Player;
            const visitedTiles = dijkstra({ tiles } as Map, positionedTerrainTiles[0].tile, positionedTerrainTiles[9].tile);
            const EXPECTED_LENGTH = 10;
            return (
                expect(visitedTiles).to.be.an('array'),
                expect(visitedTiles.length).to.be.equal(EXPECTED_LENGTH),
                expect(visitedTiles[visitedTiles.length - 1].cost).to.be.greaterThan(CostConstants.PlayerCost)
            );
        });
    });

    describe('getNeighbors', () => {
        it('should return 4 neighbors for a tile not on the border of the map', () => {
            const positionedTiles: PositionedTile[][] = toPositionedTileMatrix(validMap.tiles);
            const neighbors = getNeighbors({ x: 1, y: 1 }, positionedTiles);
            return expect(neighbors).to.be.an('array').that.has.lengthOf(MAX_NEIGHBORS);
        });

        it('should return 2 neighbors for a tile in the top-left corner of the map', () => {
            const positionedTiles = toPositionedTileMatrix(validMap.tiles);
            const neighbors = getNeighbors({ x: 0, y: 0 }, positionedTiles);
            return expect(neighbors).to.be.an('array').that.has.lengthOf(CORNER_NEIGHBORS);
        });
    });

    describe('isTerrainTile', () => {
        it('should return true for terrain tiles (BASE, WATER, ICE)', () => {
            const baseTile: TileBase = { type: TileType.Base, object: null };
            const waterTile: TileBase = { type: TileType.Water, object: null };
            const iceTile: TileBase = { type: TileType.Ice, object: null };

            return (
                expect(isTerrainTile(baseTile)).to.be.true && expect(isTerrainTile(waterTile)).to.be.true && expect(isTerrainTile(iceTile)).to.be.true
            );
        });

        it('should return false for non-terrain tiles', () => {
            const wallTile: TileBase = { type: TileType.Wall, object: null };
            const closedDoorTile: TileBase = { type: TileType.ClosedDoor, object: null };

            return expect(isTerrainTile(wallTile)).to.be.false && expect(isTerrainTile(closedDoorTile)).to.be.false;
        });
    });

    describe('isMap', () => {
        it('should return true for valid Map objects', () => {
            const validMapBase: Map = {
                _id: '12345',
                name: 'name',
                description: 'This map is valid.',
                mode: GameMode.Classical,
                size: 10,
                tiles: [[]],
                createdAt: 'test',
                updatedAt: 'test',
                visibility: true,
            };

            return expect(isMap(validMapBase)).to.be.true;
        });

        it('should return false for invalid Map objects', () => {
            const invalidMapBase: unknown = { _id: '12345', name: 'Test Map' };
            return expect(isMap(invalidMapBase)).to.be.false;
        });
    });

    it('should place unused objects on map', () => {
        placeRandomObjects(game);

        let randomObjectsCounter = 0;
        applyToTiles((tile) => {
            if (tile.object?.name === ObjectName.Random) {
                ++randomObjectsCounter;
            }
        });

        const objectsInMap = [];
        const objectsSet = new Set();
        applyToTiles((tile) => {
            if (tile.object) {
                if (tile.object?.name !== ObjectName.Spawnpoint && tile.object?.name !== ObjectName.Flag) {
                    objectsInMap.push(tile.object.name);
                    objectsSet.add(tile.object.name);
                }
            }
        });
        expect(objectsInMap.length).to.equal(objectsSet.size);
        expect(randomObjectsCounter).to.equal(0);
    });

    describe('findTileCoordinates', () => {
        it('should return the correct coordinates when the tile is found', () => {
            const tileToFind: TileBase = { type: TileType.Base, object: null };

            const tiles: TileBase[][] = [
                [tileToFind, { type: TileType.Water, object: null }, { type: TileType.Ice, object: null }],
                [
                    { type: TileType.Wall, object: null },
                    { type: TileType.Base, object: null },
                    { type: TileType.Water, object: null },
                ],
            ];

            const result = findTileCoordinates(tiles, tileToFind);

            expect(result).to.deep.equal({ x: 0, y: 0 });
        });

        it('should return undefined when the tile is not found', () => {
            const tiles: TileBase[][] = [
                [
                    { type: TileType.Water, object: null },
                    { type: TileType.Ice, object: null },
                ],
                [
                    { type: TileType.Wall, object: null },
                    { type: TileType.Water, object: null },
                ],
            ];

            const tileToFind: TileBase = { type: TileType.Base, object: null };
            const result = findTileCoordinates(tiles, tileToFind);

            return expect(result).to.be.undefined;
        });

        it('should handle an empty 2D array', () => {
            const tiles: TileBase[][] = [];
            const tileToFind: TileBase = { type: TileType.Base, object: null };
            const result = findTileCoordinates(tiles, tileToFind);

            return expect(result).to.be.undefined;
        });
    });

    describe('respawnPlayer', () => {
        it('should respawn the player at the spawn point if it is free', () => {
            const spawnTile = game.map.tiles[0][0];
            spawnTile.object = { name: ObjectName.Spawnpoint };
            spawnTile.player = null;

            player1.spawnPoint = { x: 0, y: 0 };

            respawnPlayer(player1, game);

            expect(spawnTile.player).to.deep.equal(player1);
        });

        it('should not respawn the player if they are disconnected', () => {
            player1.data.push(PlayerData.Disconnected);

            respawnPlayer(player1, game);

            const allTiles = game.map.tiles.flat();
            const playerTiles = allTiles.filter((tile) => tile.player === player1);

            expect(playerTiles.length).to.equal(0);
        });

        it('should remove the player from their current tile before respawning', () => {
            const currentTile = game.map.tiles[0][0];
            currentTile.player = player1;

            respawnPlayer(player1, game);

            return expect(currentTile.player).to.be.undefined;
        });
    });

    describe('highlightAccessibleTiles', () => {
        it("should highlight all accessible tiles within the player's move range in normal mode", () => {
            game.activePlayer.player = player1;
            game.activePlayer.position = { x: 0, y: 0 };

            game.activePlayer.player.movesLeft = 2;
            game.data.debugging = false;

            highlightAccessibleTiles(game);

            const accessibleTiles = game.map.tiles.flat().filter((tile) => tile.data?.includes(TileData.Accessible));
            expect(accessibleTiles.length).to.be.greaterThan(0);

            const outOfRangeTile = game.map.tiles[2][2];
            return expect(outOfRangeTile.data?.includes(TileData.Accessible)).to.be.undefined;
        });

        it('should highlight all valid tiles in debugging mode', () => {
            game.activePlayer.player = player1;
            game.activePlayer.position = { x: 0, y: 0 };
            game.data.debugging = true;
            game.map.tiles[0][1].player = {} as Player;
            game.map.tiles[0][1].type = TileType.OpenedDoor;

            highlightAccessibleTiles(game);

            const accessibleTiles = game.map.tiles.flat().filter((tile) => tile.data?.includes(TileData.Accessible));
            expect(accessibleTiles.length).to.be.greaterThan(0);

            const invalidTile = game.map.tiles.find((row) => row.some((tile) => tile.type === TileType.Wall));
            return expect(invalidTile).to.be.undefined;
        });

        it('should not highlight any tiles if the player has no moves left', () => {
            game.activePlayer.player = player1;
            game.activePlayer.position = { x: 0, y: 0 };
            game.activePlayer.player.movesLeft = 0;
            game.data.debugging = false;

            highlightAccessibleTiles(game);

            const accessibleTiles = game.map.tiles.flat().filter((tile) => tile.data?.includes(TileData.Accessible));
            expect(accessibleTiles.length).to.equal(0);
        });

        it('should remove player data', () => {
            game.players[0].data.push(PlayerData.RedTeam);
            removePlayerData(game.players[0], [PlayerData.RedTeam]);
            return expect(game.players[0].data.includes(PlayerData.RedTeam)).to.be.false;
        });

        it('should scatter players object', () => {
            const steakObject = createObject({ name: ObjectName.Steak });
            player1.inventory = [steakObject];
            const freeTiles = findEmptyNearbyTiles(game.map.tiles, toPositionedPlayer(game.map.tiles, player1)?.position);
            const steakSpy = sinon.spy(steakObject, 'applyEffect');

            scatterObjects(game, player1);

            return (
                expect(steakSpy.calledWith(player1, false)).to.be.true &&
                expect((freeTiles[0].tile.object = { name: steakObject.name })) &&
                expect(player1.inventory.length).to.equal(0)
            );
        });
    });
});

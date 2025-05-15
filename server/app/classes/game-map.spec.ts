import { TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { TileBase, TileData, TileType } from '@common/interfaces/map';
import { Player, PlayerData } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { describe, it } from 'mocha';
import * as path from 'path';
import { Game } from './game';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));
const player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8')) as Player;
const player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8')) as Player;
const player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8')) as Player;
const player4 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player4.json'), 'utf8')) as Player;
const players = [player1, player2, player3, player4];

describe('Game object', () => {
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

    it('should create a Game object', () => {
        expect(typeof game).to.equal('object');
    });

    it('should highlight nearby doors', () => {
        const playerPosition = { x: 3, y: 16 };
        game.activePlayer = { player: player1, position: playerPosition };
        const doorPosition: Position = { x: 4, y: 16 };

        game.map.tiles[doorPosition.y][doorPosition.x].type = TileType.OpenedDoor;
        game.map.findDoorsAtProximity(playerPosition);

        expect(game.map.tiles[doorPosition.y][doorPosition.x].data.includes(TileData.DoorInProximity)).to.equal(true);
    });

    it('should highlight nearby players', () => {
        const playerPosition1 = { x: 18, y: 9 };
        const playerPosition2 = { x: 19, y: 9 };

        game.map.tiles[playerPosition1.y][playerPosition1.x].player = player1;
        game.map.tiles[playerPosition2.y][playerPosition2.x].player = player2;
        game.activePlayer = { player: player1, position: playerPosition1 };
        game.map.findPlayersAtProximity(playerPosition1);

        expect(game.map.tiles[playerPosition2.y][playerPosition2.x].data.includes(TileData.PlayerInProximity)).to.equal(true);
    });

    it('should move player', () => {
        const playerPosition1 = { x: 6, y: 6 };
        const destination = { x: 6, y: 5 };
        const MOVES_LEFT = 3;
        game.activePlayer.player.movesLeft = MOVES_LEFT;
        game.map.tiles[playerPosition1.y][playerPosition1.x].player = player1;
        game.map.tiles[playerPosition1.y][playerPosition1.x].type = TileType.Ice;
        game.map.tiles[destination.y][destination.x].type = TileType.Base;

        game.activePlayer = { player: player1, position: playerPosition1 };
        game.map.movePlayerImage(game.activePlayer, destination, true);

        return (
            expect(game.map.tiles[destination.y][destination.x].player).to.equal(player1) &&
            expect((game.activePlayer.player.movesLeft = MOVES_LEFT - TILE_TYPE_TO_COST[TileType.Base]))
        );
    });

    it('should not move player if invalid position', () => {
        const playerPosition1 = { x: 6, y: 6 };
        const destination = { x: 131, y: 5 };
        const MOVES_LEFT = 3;
        game.activePlayer.player.movesLeft = MOVES_LEFT;
        game.map.tiles[playerPosition1.y][playerPosition1.x].player = player1;
        game.map.tiles[playerPosition1.y][playerPosition1.x].type = TileType.Ice;

        game.activePlayer = { player: player1, position: playerPosition1 };
        game.map.movePlayerImage(game.activePlayer, destination, true);

        return expect(game.map.tiles[playerPosition1.y][playerPosition1.x].player).to.equal(player1);
    });

    it('should reset all tile data to default', () => {
        game.map.tiles[0][0].data = [TileData.DoorInProximity, TileData.FastestRoute];
        game.map.resetTilesData();
        applyToTiles((tile) => {
            expect(tile.data).to.equal(undefined);
        });
    });

    describe('interactWithDoor', () => {
        let playerPosition: Position;
        let doorPosition: Position;

        beforeEach(() => {
            game = new Game(JSON.parse(JSON.stringify(map)), '9111', players);
            playerPosition = { x: 3, y: 3 };
            doorPosition = { x: 3, y: 4 };
            game.activePlayer = { player: player1, position: playerPosition };
            player1.data = [PlayerData.Active];
            game.map.tiles[playerPosition.y][playerPosition.x].player = player1;
            game.map.tiles[doorPosition.y][doorPosition.x].type = TileType.ClosedDoor;
        });

        it('should toggle a door from closed to open', () => {
            player1.actionsLeft = 1;
            game.activePlayer = { player: player1, position: playerPosition };
            game.map.interactWithDoor(playerPosition, doorPosition);
            expect(game.map.tiles[doorPosition.y][doorPosition.x].type).to.equal(TileType.OpenedDoor);
        });

        it('should toggle a door from open to closed', () => {
            player1.actionsLeft = 1;
            game.activePlayer = { player: player1, position: playerPosition };
            game.map.tiles[doorPosition.y][doorPosition.x].type = TileType.OpenedDoor;

            game.map.interactWithDoor(playerPosition, doorPosition);
            expect(game.map.tiles[doorPosition.y][doorPosition.x].type).to.equal(TileType.ClosedDoor);
        });

        it('should not interact with a door if player has no actions left', () => {
            player1.actionsLeft = 0;
            game.activePlayer = { player: player1, position: playerPosition };

            game.map.interactWithDoor(playerPosition, doorPosition);
            expect(game.map.tiles[doorPosition.y][doorPosition.x].type).to.equal(TileType.ClosedDoor);
        });

        it('should not interact with a door if another player is on it', () => {
            player1.movesLeft = 1;
            game.map.tiles[doorPosition.y][doorPosition.x].type = TileType.ClosedDoor;
            game.map.tiles[doorPosition.y][doorPosition.x].player = player2;

            game.map.interactWithDoor(playerPosition, doorPosition);
            expect(game.map.tiles[doorPosition.y][doorPosition.x].type).to.equal(TileType.ClosedDoor);
        });

        it('should not interact if the target tile is not a door', () => {
            player1.movesLeft = 1;
            game.map.tiles[doorPosition.y][doorPosition.x].type = TileType.Wall;

            game.map.interactWithDoor(playerPosition, doorPosition);
            expect(game.map.tiles[doorPosition.y][doorPosition.x].type).to.equal(TileType.Wall);
        });

        it('should not interact if the distance is greater than 1', () => {
            player1.movesLeft = 1;
            const farDoorPosition = { x: 3, y: 6 };
            game.map.tiles[farDoorPosition.y][farDoorPosition.x].type = TileType.OpenedDoor;

            game.map.interactWithDoor(playerPosition, farDoorPosition);
            expect(game.map.tiles[farDoorPosition.y][farDoorPosition.x].type).to.equal(TileType.OpenedDoor);
        });
    });
    describe('interactWithDoor', () => {
        it('should delete player', () => {
            const position = { x: 3, y: 6 };
            game.map.tiles[position.y][position.x].player = player1;

            game.map.deletePlayer(player1);
            return expect(game.map.tiles[position.y][position.x].player).to.be.undefined;
        });
    });
    describe('interactWithDoor', () => {
        it('should delete spawnpoint', () => {
            const position = { x: 3, y: 6 };
            game.map.tiles[position.y][position.x].player = player1;

            game.map.deleteSpawnPoint(game.map.tiles[position.y][position.x], player1);
            return expect(player1.spawnPoint).to.be.undefined;
        });
    });
});

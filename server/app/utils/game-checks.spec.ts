import { Combat } from '@app/classes/combat';
import { Game } from '@app/classes/game';
import * as algorithms from '@app/utils/algorithms';
import {
    areCtfEnemies,
    areEnemies,
    hasEvadeLeft,
    isActiveCombatPlayer,
    isActivePlayer,
    isAdmin,
    isDoorTile,
    isGameOver,
    isOnIce,
    isPlayerInCombat,
    isTurnDone,
} from '@app/utils/game-checks';
import { GameMode, TileBase, TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { describe, it } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import { COMBAT_CONSTANTS } from './constants/game-constants';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));
const mapCTF = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMapCTF.json'), 'utf8'));
const player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8')) as Player;
const player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8')) as Player;
const player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8')) as Player;
const player4 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player4.json'), 'utf8')) as Player;
const players = [player1, player2, player3, player4];
describe('Game Utilities Tests', () => {
    let game: Game;
    let gameCTF: Game;

    beforeEach(() => {
        game = new Game(JSON.parse(JSON.stringify(map)), '9111', players);
        gameCTF = new Game(JSON.parse(JSON.stringify(mapCTF)), '9111', players);
    });

    it('should return true if turn is done due to no actions or moves left', () => {
        game.activePlayer.player.actionsLeft = 0;
        game.activePlayer.player.movesLeft = 0;

        const result = isTurnDone(game);
        expect(result).to.equal(true);
    });

    it('should return true if turn is done due to no actions and no movement possible', () => {
        game.activePlayer.player.actionsLeft = 0;
        game.activePlayer.player.movesLeft = 1;
        sinon.stub(algorithms, 'dfs').returns([]);

        const result = isTurnDone(game);
        expect(result).to.equal(true);
    });
    it('should return true if turn is done due to no actions or moves left', () => {
        game.activePlayer.player.actionsLeft = 1;
        game.activePlayer.player.movesLeft = 0;
        game.map.findDoorsAtProximity = sinon.stub().returns(false);
        game.map.findPlayersAtProximity = sinon.stub().returns(false);

        const result = isTurnDone(game);
        expect(result).to.equal(true);
    });

    it('should return true if game is over when a player has enough victories', () => {
        game.players.forEach((p) => (p.stats.victories = 0));
        game.players[0].stats.victories = COMBAT_CONSTANTS.victoryToWin;
        const result = isGameOver(game);
        expect(result).to.equal(true);
    });

    it('should return true if game is over when a player has flag on spawnpoint', () => {
        const result = isGameOver(gameCTF);
        expect(result).to.equal(false);
        gameCTF.players[0].inventory.push({ name: ObjectName.Flag } as GameObject);
        const spawnPoint = algorithms.findTile(gameCTF.map.tiles, gameCTF.players[0].spawnPoint);
        spawnPoint.player = gameCTF.players[0];
        const result2 = isGameOver(gameCTF);
        expect(result2).to.equal(true);
    });

    it('should return false if game is not over', () => {
        game.players.forEach((p) => (p.stats.victories = 0));
        const result = isGameOver(game);
        expect(result).to.equal(false);
    });

    it('should return true if the correct player is active', () => {
        game.activePlayer = { player: player1, position: { x: 0, y: 0 } };
        const result = isActivePlayer(game, player1.id);
        expect(result).to.equal(true);
    });
    it('should return false if isActivePlayer is called with invalid game', () => {
        const result = isActivePlayer(null, player1.id);
        expect(result).to.equal(false);
    });

    it('should return false if the incorrect player is active', () => {
        const result = isActivePlayer(game, 'player2');
        expect(result).to.equal(false);
    });

    it('should return true if player is an admin', () => {
        game.findPlayer = sinon.stub().returns({
            data: [PlayerData.Admin],
        });
        const result = isAdmin(game, 'player1');
        expect(result).to.equal(true);
    });

    it('should return false if player is not an admin', () => {
        game.findPlayer = sinon.stub().returns({
            data: ['player'],
        });
        const result = isAdmin(game, 'player1');
        expect(result).to.equal(false);
    });
    it('should return false if cant find player in isAdmin', () => {
        game.findPlayer = sinon.stub().returns(null);
        const result = isAdmin(game, 'player1');
        expect(result).to.equal(undefined);
    });

    it('should return true if player is on ice', () => {
        const playerOnIceTile: TileBase = {
            type: TileType.Ice,
            player: player1,
        };
        game.map.tiles.flat().forEach((t) => delete t.player);

        game.map.tiles[0][0] = playerOnIceTile;
        const result = isOnIce(game.map.tiles, player1);
        expect(result).to.equal(true);
    });

    it('should return false if player is on ice', () => {
        const playerNotOnIceTile: TileBase = {
            type: TileType.Base,
            player: player1,
        };
        game.map.tiles.flat().forEach((t) => (t.type = TileType.Base));
        game.map.tiles[0][0] = playerNotOnIceTile;
        const result = isOnIce(game.map.tiles, player1);
        expect(result).to.equal(false);
    });

    it('should return true if the tile is a door tile (ClosedDoor)', () => {
        const doorTile: TileBase = { type: TileType.ClosedDoor };
        const result = isDoorTile(doorTile);
        expect(result).to.equal(true);
    });

    it('should return true if the tile is a door tile (OpenedDoor)', () => {
        const doorTile: TileBase = { type: TileType.OpenedDoor };
        const result = isDoorTile(doorTile);
        expect(result).to.equal(true);
    });

    it('should return false if the tile is not a door tile', () => {
        const nonDoorTile: TileBase = { type: TileType.Base };
        const result = isDoorTile(nonDoorTile);
        expect(result).to.equal(false);
    });

    it('should return true if the player is in combat', () => {
        const combat: Combat = {
            activePlayer: { id: 'player1' },
            inactivePlayer: { id: 'player2' },
        } as Combat;
        const result = isPlayerInCombat(combat, 'player1');
        expect(result).to.equal(true);
    });

    it('should return false if the player is not in combat', () => {
        const combat: Combat = {
            activePlayer: { id: 'player1' },
            inactivePlayer: { id: 'player2' },
        } as Combat;
        const result = isPlayerInCombat(combat, 'player3');
        expect(result).to.equal(false);
    });

    it('should return true if the player is the active combat player', () => {
        const combat: Combat = {
            activePlayer: { id: 'player1' },
            inactivePlayer: { id: 'player2' },
        } as Combat;
        const result = isActiveCombatPlayer(combat, 'player1');
        expect(result).to.equal(true);
    });

    it('should return false if the player is not the active combat player', () => {
        const combat: Combat = {
            activePlayer: { id: 'player1' },
            inactivePlayer: { id: 'player2' },
        } as Combat;
        const result = isActiveCombatPlayer(combat, 'player2');
        expect(result).to.equal(false);
    });

    it('should return true if player has evade attempts left', () => {
        const player: Player = { evasionAttempts: 1 } as Player;
        const result = hasEvadeLeft(player);
        expect(result).to.equal(true);
    });

    it('should return false if player has no evade attempts left', () => {
        const player: Player = { evasionAttempts: 0 } as Player;
        const result = hasEvadeLeft(player);
        expect(result).to.equal(false);
    });
    it('should return true for Blue vs Red', () => {
        player1.data = [PlayerData.BlueTeam];
        player2.data = [PlayerData.RedTeam];
        const result = areCtfEnemies(player1, player2);
        return expect(result).to.be.true;
    });
    it('should return true for Red vs Blue', () => {
        player1.data = [PlayerData.RedTeam];
        player2.data = [PlayerData.BlueTeam];
        const result = areCtfEnemies(player1, player2);
        return expect(result).to.be.true;
    });
    it('should return false for same team (Red vs Red)', () => {
        player1.data = [PlayerData.RedTeam];
        player2.data = [PlayerData.RedTeam];
        const result = areCtfEnemies(player1, player2);
        return expect(result).to.be.false;
    });
    it('should return false in CTF mode if players are on same team', () => {
        player1.data = [PlayerData.RedTeam];
        player2.data = [PlayerData.RedTeam];
        game.map.mode = GameMode.Ctf;
        const result = areEnemies(player1, player2, game);
        return expect(result).to.be.false;
    });
    it('should return true in non-CTF mode if player ids are different', () => {
        player1.id = '1';
        player2.id = '2';
        game.map.mode = GameMode.Classical;
        const result = areEnemies(player1, player2, game);
        return expect(result).to.be.true;
    });

    it('should return false in non-CTF mode if player ids are the same', () => {
        player1.id = '1';
        player2.id = '1';
        game.map.mode = GameMode.Classical;
        const result = areEnemies(player1, player2, game);
        return expect(result).to.be.false;
    });
});

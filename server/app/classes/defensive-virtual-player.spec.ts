/* eslint-disable @typescript-eslint/no-explicit-any */
import * as algorithms from '@app/utils/algorithms';
import { DEFENSIVE_ITEM_PRIORITY } from '@app/utils/constants/defensive-player-constants';
import * as gameChecks from '@app/utils/game-checks';
import { TileData } from '@common/interfaces/map';
import { Dice, Player, PlayerAttributes, PlayerData } from '@common/interfaces/player';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { Combat } from './combat';
import { DefensiveVirtualPlayer } from './defensive-virtual-player';
import { Game } from './game';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));

describe('DefensiveVirtualPlayer', () => {
    let sandbox: sinon.SinonSandbox;
    let game: Game;
    let defensiveVirtualPlayer: DefensiveVirtualPlayer;
    let players: Player[];
    let player1: Player;
    let player2: Player;
    let player3: Player;
    let combat: Combat;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8')) as Player;
        player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8')) as Player;
        player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8')) as Player;

        const playerAttributes: PlayerAttributes = {
            health: 6,
            currentHealth: 6,
            speed: 4,
            attack: { value: 10, dice: Dice.Dice4 },
            defense: { value: 5, dice: Dice.Dice6 },
        };

        defensiveVirtualPlayer = new DefensiveVirtualPlayer(
            'defensiveidvirtual',
            'Defensive Bot',
            'avatar2',
            [PlayerData.DefensiveVP],
            playerAttributes,
        );

        players = [player1, player2, player3, defensiveVirtualPlayer];

        game = new Game(JSON.parse(JSON.stringify(map)), '9111', players);
        game.activePlayer = {
            player: defensiveVirtualPlayer,
            position: { x: 0, y: 0 },
        };

        combat = new Combat();
        game.combat = combat;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('handleCombatTurn', () => {
        it('should attack in a combat when player has max health', () => {
            const attackStub = sandbox.stub(combat, 'attack');
            const evadeStub = sandbox.stub(combat, 'evade');

            defensiveVirtualPlayer.attributes.currentHealth = defensiveVirtualPlayer.attributes.health;
            defensiveVirtualPlayer.handleCombatTurn(combat);

            expect(attackStub.calledOnce).to.equal(true);
            expect(evadeStub.called).to.equal(false);
        });

        it('should attack in a combat when player has not max health but no evasions left', () => {
            const attackStub = sandbox.stub(combat, 'attack');
            const evadeStub = sandbox.stub(combat, 'evade');

            defensiveVirtualPlayer.attributes.currentHealth = defensiveVirtualPlayer.attributes.health - 1;
            defensiveVirtualPlayer.evasionAttempts = 0;
            defensiveVirtualPlayer.handleCombatTurn(combat);

            expect(attackStub.calledOnce).to.equal(true);
            expect(evadeStub.called).to.equal(false);
        });

        it('should try to evade in combat if the player has reduced health and evasion attempts left', () => {
            const attackStub = sandbox.stub(combat, 'attack');
            const evadeStub = sandbox.stub(combat, 'evade');

            defensiveVirtualPlayer.attributes.currentHealth = defensiveVirtualPlayer.attributes.health - 1;
            defensiveVirtualPlayer.evasionAttempts = 1;
            defensiveVirtualPlayer.handleCombatTurn(combat);

            expect(attackStub.called).to.equal(false);
            expect(evadeStub.calledOnce).to.equal(true);
        });
    });

    describe('handlePlayerTurn', () => {
        it('should try CTF and regular actions and end its turn if it has already moved', () => {
            const tryCtfActionsStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryCtfActions').returns(false);
            const tryRegularActionsStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryRegularActions').returns(false);
            const tweakBeforeEndingStub = sandbox.stub(defensiveVirtualPlayer as any, 'tweakBeforeEnding');
            const endTurnStub = sandbox.stub(game, 'endTurn');

            defensiveVirtualPlayer.movesLeft = defensiveVirtualPlayer.attributes.speed - 1;
            defensiveVirtualPlayer.handlePlayerTurn(game);

            expect(tryCtfActionsStub.calledOnce).to.equal(true);
            expect(tryRegularActionsStub.calledOnce).to.equal(true);
            expect(tweakBeforeEndingStub.called).to.equal(false);
            expect(endTurnStub.calledOnce).to.equal(true);
        });

        it("should try to make a random movement if it hasn't moved yet and other actions fail", () => {
            const tryCtfActionsStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryCtfActions').returns(false);
            const tryRegularActionsStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryRegularActions').returns(false);
            const tweakBeforeEndingStub = sandbox.stub(defensiveVirtualPlayer as any, 'tweakBeforeEnding');
            const endTurnStub = sandbox.stub(game, 'endTurn');

            defensiveVirtualPlayer.movesLeft = defensiveVirtualPlayer.attributes.speed;
            defensiveVirtualPlayer.handlePlayerTurn(game);

            expect(tryCtfActionsStub.calledOnce).to.equal(true);
            expect(tryRegularActionsStub.calledOnce).to.equal(true);
            expect(tweakBeforeEndingStub.calledOnce).to.equal(true);
            expect(endTurnStub.called).to.equal(false);
        });

        it('should not try other actions if CTF actions succeed', () => {
            const tryCtfActionsStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryCtfActions').returns(true);
            const tryRegularActionsStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryRegularActions');
            const tweakBeforeEndingStub = sandbox.stub(defensiveVirtualPlayer as any, 'tweakBeforeEnding');
            const endTurnStub = sandbox.stub(game, 'endTurn');

            defensiveVirtualPlayer.handlePlayerTurn(game);

            expect(tryCtfActionsStub.calledOnce).to.equal(true);
            expect(tryRegularActionsStub.called).to.equal(false);
            expect(tweakBeforeEndingStub.called).to.equal(false);
            expect(endTurnStub.called).to.equal(false);
        });
    });

    describe('tryCtfActions', () => {
        it('should return to spawn with the flag if the player has the flag', () => {
            const findFlagHolderStub = sandbox.stub(defensiveVirtualPlayer as any, 'findFlagHolder').returns(defensiveVirtualPlayer);
            const tryToReturnToFlagHolderSpawnStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryToReturnToFlagHolderSpawn').returns(true);
            const tryCaptureFlagStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryCaptureFlag');

            const result = (defensiveVirtualPlayer as any).tryCtfActions(game);

            expect(result).to.equal(true);
            expect(findFlagHolderStub.calledOnce).to.equal(true);
            expect(tryToReturnToFlagHolderSpawnStub.calledOnce).to.equal(true);
            expect(tryCaptureFlagStub.called).to.equal(false);
        });

        it('should try to capture the flag if no one has it', () => {
            const findFlagHolderStub = sandbox.stub(defensiveVirtualPlayer as any, 'findFlagHolder').returns(undefined);
            const tryToReturnToFlagHolderSpawnStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryToReturnToFlagHolderSpawn');
            const tryCaptureFlagStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryCaptureFlag').returns(true);

            const result = (defensiveVirtualPlayer as any).tryCtfActions(game);

            expect(result).to.equal(true);
            expect(findFlagHolderStub.calledOnce).to.equal(true);
            expect(tryToReturnToFlagHolderSpawnStub.called).to.equal(false);
            expect(tryCaptureFlagStub.calledOnce).to.equal(true);
        });

        it('should help a teammate return to spawn with the flag', () => {
            sandbox.stub(gameChecks, 'areCtfEnemies').returns(true);
            const teammate = { ...player2 };
            const findFlagHolderStub = sandbox.stub(defensiveVirtualPlayer as any, 'findFlagHolder').returns(teammate);
            const tryToReturnToFlagHolderSpawnStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryToReturnToFlagHolderSpawn').returns(true);
            const tryCaptureFlagStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryCaptureFlag');

            const result = (defensiveVirtualPlayer as any).tryCtfActions(game);

            expect(result).to.equal(true);
            expect(findFlagHolderStub.calledOnce).to.equal(true);
            expect(tryToReturnToFlagHolderSpawnStub.calledOnce).to.equal(true);
            expect(tryCaptureFlagStub.called).to.equal(false);
        });
    });

    describe('tryRegularActions', () => {
        it('should try to move towards items according to defensive priorities', () => {
            const tryMoveTowardsItemsStub = sandbox.stub(defensiveVirtualPlayer as any, 'tryMoveTowardsItems').returns(true);

            const result = (defensiveVirtualPlayer as any).tryRegularActions(game);

            expect(result).to.equal(true);
            expect(tryMoveTowardsItemsStub.calledOnce).to.equal(true);
            expect(tryMoveTowardsItemsStub.calledWith(game, DEFENSIVE_ITEM_PRIORITY)).to.equal(true);
        });

        it('should handle inventory choice when inventory is full and standing on an object', () => {
            defensiveVirtualPlayer.inventory = Array(2).fill({ name: 'Steak' });

            const tileWithObject = { object: { name: 'Torch' } };
            const findTileStub = sandbox.stub(algorithms, 'findTile').returns(tileWithObject);

            const handleInventoryChoiceStub = sandbox.stub(defensiveVirtualPlayer as any, 'handleInventoryChoice');

            const result = (defensiveVirtualPlayer as any).tryRegularActions(game);

            expect(result).to.equal(false);
            expect(findTileStub.calledOnce).to.equal(true);
            expect(handleInventoryChoiceStub.calledOnce).to.equal(true);
            expect(handleInventoryChoiceStub.calledWith(game)).to.equal(true);
        });
    });

    describe('tweakBeforeEnding', () => {
        it('should find accessible tiles and move to a random tile', () => {
            const highlightAccessibleTilesStub = sandbox.stub(algorithms, 'highlightAccessibleTiles').returns();

            const movePlayerStub = sandbox.stub(game, 'movePlayer');
            game.map.tiles[0][0].data = [TileData.Accessible];
            game.map.tiles[0][1].data = [TileData.Accessible];
            sandbox.stub(Math, 'random').returns(0);

            const result = (defensiveVirtualPlayer as any).tweakBeforeEnding(game);

            expect(result).to.equal(true);
            expect(highlightAccessibleTilesStub.calledOnce).to.equal(true);
            expect(movePlayerStub.calledWith(algorithms.findTileCoordinates(game.map.tiles, game.map.tiles[0][0]))).to.equal(true);
        });
    });
});

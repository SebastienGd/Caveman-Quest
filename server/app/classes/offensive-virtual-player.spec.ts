/* eslint-disable @typescript-eslint/no-explicit-any */
import * as algorithms from '@app/utils/algorithms';
import * as gameChecks from '@app/utils/game-checks';
import { GameMode, TileBase } from '@common/interfaces/map';
import { Dice, Player, PlayerAttributes, PlayerData } from '@common/interfaces/player';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { Combat } from './combat';
import { Game } from './game';
import { OffensiveVirtualPlayer } from './offensive-virtual-player';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));

describe('OffensiveVirtualPlayer', () => {
    let sandbox: sinon.SinonSandbox;
    let game: Game;
    let offensiveVirtualPlayer: OffensiveVirtualPlayer;
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

        offensiveVirtualPlayer = new OffensiveVirtualPlayer(
            'offensiveidvirtual',
            'Offensive Bot',
            'avatar1',
            [PlayerData.OffensiveVP],
            playerAttributes,
        );

        players = [player1, player2, player3, offensiveVirtualPlayer];

        game = new Game(JSON.parse(JSON.stringify(map)), '9111', players);
        game.activePlayer = {
            player: offensiveVirtualPlayer,
            position: { x: 0, y: 0 },
        };

        combat = new Combat();
        game.combat = combat;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('regularActions', () => {
        it('should try actions in order and return true if at least one succeeds', () => {
            const tryAttackReachableEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackReachableEnemy').returns(true);
            const tryMoveTowardsItemsStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryMoveTowardsItems');
            const tryAttackAnyEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackAnyEnemy');

            const result = (offensiveVirtualPlayer as any).regularActions(game);

            expect(result).to.equal(true);
            expect(tryAttackReachableEnemyStub.calledOnce).to.equal(true);
            expect(tryMoveTowardsItemsStub.called).to.equal(false);
            expect(tryAttackAnyEnemyStub.called).to.equal(false);
        });

        it('should try the second action if the first one fails', () => {
            const tryAttackReachableEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackReachableEnemy').returns(false);
            const tryMoveTowardsItemsStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryMoveTowardsItems').returns(true);
            const tryAttackAnyEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackAnyEnemy');

            const result = (offensiveVirtualPlayer as any).regularActions(game);

            expect(result).to.equal(true);
            expect(tryAttackReachableEnemyStub.calledOnce).to.equal(true);
            expect(tryMoveTowardsItemsStub.calledOnce).to.equal(true);
            expect(tryAttackAnyEnemyStub.called).to.equal(false);
        });

        it('should return false if all actions fail', () => {
            const tryAttackReachableEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackReachableEnemy').returns(false);
            const tryMoveTowardsItemsStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryMoveTowardsItems').returns(false);
            const tryAttackAnyEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackAnyEnemy').returns(false);

            const result = (offensiveVirtualPlayer as any).regularActions(game);

            expect(result).to.equal(false);
            expect(tryAttackReachableEnemyStub.calledOnce).to.equal(true);
            expect(tryMoveTowardsItemsStub.calledOnce).to.equal(true);
            expect(tryAttackAnyEnemyStub.calledOnce).to.equal(true);
        });
    });

    describe('ctfActions', () => {
        it("should attack an enemy with the flag if the player doesn't have the flag", () => {
            const findFlagHolderStub = sandbox.stub(offensiveVirtualPlayer as any, 'findFlagHolder').returns(player1);
            const tryToReturnToFlagHolderSpawnStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryToReturnToFlagHolderSpawn');
            const tryAttackEnemyFlagHolderStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackEnemyFlagHolder').returns(true);
            const tryCaptureFlagStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryCaptureFlag');

            const result = (offensiveVirtualPlayer as any).ctfActions(game);

            expect(result).to.equal(true);
            expect(findFlagHolderStub.calledOnce).to.equal(true);
            expect(tryToReturnToFlagHolderSpawnStub.called).to.equal(false);
            expect(tryAttackEnemyFlagHolderStub.calledOnce).to.equal(true);
            expect(tryCaptureFlagStub.called).to.equal(false);
        });

        it('should try to capture the flag if no previous actions succeed', () => {
            const findFlagHolderStub = sandbox.stub(offensiveVirtualPlayer as any, 'findFlagHolder').returns(player1);
            const tryAttackEnemyFlagHolderStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackEnemyFlagHolder').returns(false);
            const tryCaptureFlagStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryCaptureFlag').returns(true);

            const result = (offensiveVirtualPlayer as any).ctfActions(game);

            expect(result).to.equal(true);
            expect(findFlagHolderStub.calledOnce).to.equal(true);
            expect(tryAttackEnemyFlagHolderStub.calledOnce).to.equal(true);
            expect(tryCaptureFlagStub.calledOnce).to.equal(true);
        });

        it('should try to return to spawn when player has the flag', () => {
            const findFlagHolderStub = sandbox.stub(offensiveVirtualPlayer as any, 'findFlagHolder').returns(offensiveVirtualPlayer);
            const tryOffensiveReturnToSpawnStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryOffensiveReturnToSpawn').returns(true);
            const tryAttackEnemyFlagHolderStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackEnemyFlagHolder');
            const tryCaptureFlagStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryCaptureFlag');

            const result = (offensiveVirtualPlayer as any).ctfActions(game);

            expect(result).to.equal(true);
            expect(findFlagHolderStub.calledOnce).to.equal(true);
            expect(tryOffensiveReturnToSpawnStub.calledOnce).to.equal(true);
            expect(tryAttackEnemyFlagHolderStub.called).to.equal(false);
            expect(tryCaptureFlagStub.called).to.equal(false);
        });
    });

    describe('handlePlayerTurn', () => {
        it('should use CTF actions in CTF mode and end the turn if no action succeeds', () => {
            game.map.mode = GameMode.Ctf;
            const ctfActionsStub = sandbox.stub(offensiveVirtualPlayer as any, 'ctfActions').returns(false);
            const regularActionsStub = sandbox.stub(offensiveVirtualPlayer as any, 'regularActions').returns(false);
            const endTurnStub = sandbox.stub(game, 'endTurn');

            offensiveVirtualPlayer.handlePlayerTurn(game);

            expect(ctfActionsStub.calledOnce).to.equal(true);
            expect(regularActionsStub.calledOnce).to.equal(true);
            expect(endTurnStub.calledOnce).to.equal(true);
        });

        it('should only use regular actions in normal mode', () => {
            game.map.mode = GameMode.Classical;
            const ctfActionsStub = sandbox.stub(offensiveVirtualPlayer as any, 'ctfActions');
            const regularActionsStub = sandbox.stub(offensiveVirtualPlayer as any, 'regularActions').returns(true);
            const endTurnStub = sandbox.stub(game, 'endTurn');

            offensiveVirtualPlayer.handlePlayerTurn(game);

            expect(ctfActionsStub.called).to.equal(false);
            expect(regularActionsStub.calledOnce).to.equal(true);
            expect(endTurnStub.called).to.equal(false);
        });
    });

    describe('handleCombatTurn', () => {
        it('should always attack in combat', () => {
            const attackStub = sandbox.stub(combat, 'attack');

            offensiveVirtualPlayer.handleCombatTurn(combat);

            expect(attackStub.calledOnce).to.equal(true);
        });
    });

    describe('tryAttackEnemy', () => {
        it('should return false if the player has no actions left', () => {
            offensiveVirtualPlayer.actionsLeft = 0;
            const isEnemyFunc = sandbox.stub().returns(true);

            const result = (offensiveVirtualPlayer as any).tryAttackEnemy(game, isEnemyFunc, true);

            expect(result).to.equal(false);
        });

        it('should return false if no path to an enemy is found', () => {
            offensiveVirtualPlayer.actionsLeft = 1;
            const isEnemyFunc = sandbox.stub().returns(true);
            sandbox.stub(offensiveVirtualPlayer as any, 'getAllPathsTo').returns([]);

            const result = (offensiveVirtualPlayer as any).tryAttackEnemy(game, isEnemyFunc, true);

            expect(result).to.equal(false);
        });

        it('should filter paths based on the seekOnlyInReach parameter', () => {
            offensiveVirtualPlayer.actionsLeft = 1;
            const isEnemyFunc = sandbox.stub().returns(true);

            const path1 = [{ tile: {} }, { tile: { player: player1 } }];
            const path2 = [{ tile: {} }, { tile: {} }, { tile: { player: player2 } }];

            sandbox.replace(offensiveVirtualPlayer as any, 'getAllPathsTo', (game2: Game, tileContainsEnemy: (tile: TileBase) => boolean) => {
                return (
                    game2 &&
                    expect(tileContainsEnemy(path1[path1.length - 1].tile as TileBase)) &&
                    expect(tileContainsEnemy(path2[path2.length - 1].tile as TileBase)) && [path1, path2]
                );
            });
            const canTraverseStub = sandbox.stub(offensiveVirtualPlayer as any, 'canTraverseDuringRound').returns(true);
            sandbox.stub(offensiveVirtualPlayer as any, 'tryToMoveTowards').returns(true);

            (offensiveVirtualPlayer as any).tryAttackEnemy(game, isEnemyFunc, true);

            expect(canTraverseStub.called).to.equal(true);
        });

        it('should attack an adjacent enemy when movement fails', () => {
            offensiveVirtualPlayer.actionsLeft = 1;
            const isEnemyFunc = sandbox.stub().returns(true);

            const playerPos = { tile: { player: offensiveVirtualPlayer } };
            const enemyPos = { tile: { player: player1 } };
            const pathToAttack = [playerPos, enemyPos];

            sandbox.stub(offensiveVirtualPlayer as any, 'getAllPathsTo').returns([pathToAttack]);
            sandbox.stub(offensiveVirtualPlayer as any, 'tryToMoveTowards').returns(false);
            sandbox.stub(gameChecks, 'areEnemies').returns(true);
            const startCombatStub = sandbox.stub(game.combat, 'startCombat');

            const result = (offensiveVirtualPlayer as any).tryAttackEnemy(game, isEnemyFunc, false);

            expect(result).to.equal(true);
            expect(startCombatStub.calledOnce).to.equal(true);
        });

        it('should return false if enemy is adjacent but areEnemies returns false', () => {
            offensiveVirtualPlayer.actionsLeft = 1;
            const mockEnemyFunc = () => true;

            const playerPos = { tile: { player: offensiveVirtualPlayer } };
            const adjacentPos = { tile: { player: player1 } };
            const pathEnemy = [playerPos, adjacentPos];

            sandbox.stub(offensiveVirtualPlayer as any, 'getAllPathsTo').returns([pathEnemy]);
            sandbox.stub(offensiveVirtualPlayer as any, 'tryToMoveTowards').returns(false);
            sandbox.stub(gameChecks, 'areEnemies').returns(false);

            const startCombatStub = sandbox.stub(game.combat, 'startCombat');

            const result = (offensiveVirtualPlayer as any).tryAttackEnemy(game, mockEnemyFunc, false);

            expect(result).to.equal(false);
            expect(startCombatStub.called).to.equal(false);
        });
    });

    describe('tryAttackReachableEnemy et tryAttackAnyEnemy', () => {
        it('tryAttackReachableEnemy should call tryAttackEnemy with the correct seekOnlyInReach parameter', () => {
            const tryAttackEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackEnemy').returns(true);

            const result = (offensiveVirtualPlayer as any).tryAttackReachableEnemy(game);

            expect(result).to.equal(true);
            expect(tryAttackEnemyStub.calledOnce).to.equal(true);
            const seekOnlyInReach = tryAttackEnemyStub.args[0][2];
            expect(seekOnlyInReach).to.equal(true);
        });

        it('tryAttackAnyEnemy should call tryAttackEnemy with the correct seekOnlyInReach parameter', () => {
            sandbox.replace(offensiveVirtualPlayer as any, 'tryAttackEnemy', (game2: Game, callBack: (player: Player) => boolean) => {
                return game && expect(callBack({ data: [PlayerData.BlueTeam] } as Player)).to.be.true && true;
            });

            offensiveVirtualPlayer.data = [PlayerData.RedTeam];
            const result = (offensiveVirtualPlayer as any).tryAttackAnyEnemy(game);

            expect(result).to.equal(true);
        });
    });

    describe('tryAttackEnemyFlagHolder', () => {
        it('should call tryAttackEnemy when flag holder is an enemy', () => {
            const enemyFlagHolder = player1;
            sandbox.stub(offensiveVirtualPlayer as any, 'findFlagHolder').returns(enemyFlagHolder);
            sandbox.stub(gameChecks, 'areEnemies').returns(true);
            const tryAttackEnemyStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryAttackEnemy').returns(true);

            (offensiveVirtualPlayer as any).tryAttackEnemyFlagHolder(game);

            expect(tryAttackEnemyStub.calledOnce).to.equal(true);
        });

        it('should call tryAttackEnemy with enemyIsHoldingFlag function', () => {
            const enemyFlagHolder = player1;
            const findFlagHolderStub = sandbox.stub(offensiveVirtualPlayer as any, 'findFlagHolder').returns(enemyFlagHolder);
            sandbox.replace(offensiveVirtualPlayer as any, 'tryAttackEnemy', (g: Game, callbackFn: (player: Player) => boolean) => {
                const callbackResult = callbackFn(enemyFlagHolder);
                expect(callbackResult).to.equal(true);
                return true;
            });

            sandbox.stub(gameChecks, 'areEnemies').returns(true);
            const result = (offensiveVirtualPlayer as any).tryAttackEnemyFlagHolder(game);
            expect(result).to.equal(true);
            expect(findFlagHolderStub.calledOnce).to.equal(true);
        });
    });

    describe('tryOffensiveReturnToSpawn', () => {
        it('should handle the case when a player cannot move towards spawn and there is an enemy blocking the path', () => {
            const spawnTile = { x: 5, y: 5 };
            offensiveVirtualPlayer.spawnPoint = spawnTile;
            offensiveVirtualPlayer.actionsLeft = 1;

            const mockEnemyPlayer = { id: 'enemy-id' };
            const mockPath = [{ tile: { player: offensiveVirtualPlayer } }, { tile: { player: mockEnemyPlayer } }];

            const findTileStub = sandbox.stub(algorithms, 'findTile').returns(spawnTile);
            const getAllPathsToStub = sandbox.stub(offensiveVirtualPlayer as any, 'getAllPathsTo').returns([mockPath]);
            const tryToMoveTowardsStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryToMoveTowards').returns(false);
            const areEnemiesStub = sandbox.stub(gameChecks, 'areEnemies').returns(true);
            const startCombatStub = sandbox.stub(game.combat, 'startCombat');

            const result = (offensiveVirtualPlayer as any).tryOffensiveReturnToSpawn(game);

            expect(result).to.equal(true);
            expect(findTileStub.calledOnce).to.equal(true);
            expect(getAllPathsToStub.calledOnce).to.equal(true);
            expect(tryToMoveTowardsStub.calledOnce).to.equal(true);
            expect(areEnemiesStub.calledOnce).to.equal(true);
            expect(startCombatStub.calledOnce).to.equal(true);
            expect(startCombatStub.calledWith(game, offensiveVirtualPlayer.id, mockEnemyPlayer.id)).to.equal(true);
        });

        it('should handle the case when a player cannot move towards spawn and there is no enemy in the way', () => {
            const spawnTile = { x: 5, y: 5 };
            offensiveVirtualPlayer.spawnPoint = spawnTile;
            offensiveVirtualPlayer.actionsLeft = 1;

            const mockPath = [{ tile: { player: offensiveVirtualPlayer } }, { tile: {} }];

            const findTileStub = sandbox.stub(algorithms, 'findTile').returns(spawnTile);
            const getAllPathsToStub = sandbox.stub(offensiveVirtualPlayer as any, 'getAllPathsTo').returns([mockPath]);
            const tryToMoveTowardsStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryToMoveTowards').returns(false);
            const endTurnStub = sandbox.stub(game, 'endTurn');

            const result = (offensiveVirtualPlayer as any).tryOffensiveReturnToSpawn(game);

            expect(result).to.equal(true);
            expect(findTileStub.calledOnce).to.equal(true);
            expect(getAllPathsToStub.calledOnce).to.equal(true);
            expect(tryToMoveTowardsStub.calledOnce).to.equal(true);
            expect(endTurnStub.calledOnce).to.equal(true);
        });

        it('should return true when a player successfully moves towards spawn', () => {
            const spawnTile = { x: 5, y: 5 };
            offensiveVirtualPlayer.spawnPoint = spawnTile;

            const mockPath = [{ tile: { player: offensiveVirtualPlayer } }, { tile: {} }, { tile: {} }];

            const findTileStub = sandbox.stub(algorithms, 'findTile').returns(spawnTile);
            const getAllPathsToStub = sandbox.stub(offensiveVirtualPlayer as any, 'getAllPathsTo').returns([mockPath]);
            const tryToMoveTowardsStub = sandbox.stub(offensiveVirtualPlayer as any, 'tryToMoveTowards').returns(true);

            const result = (offensiveVirtualPlayer as any).tryOffensiveReturnToSpawn(game);

            expect(result).to.equal(true);
            expect(findTileStub.calledOnce).to.equal(true);
            expect(getAllPathsToStub.calledOnce).to.equal(true);
            expect(tryToMoveTowardsStub.calledOnce).to.equal(true);
        });
    });
});

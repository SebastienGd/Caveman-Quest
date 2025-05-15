/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import * as algorithms from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import * as gameChecks from '@app/utils/game-checks';
import { GameData } from '@common/interfaces/game';
import { GameMode, TileBase, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Dice, Player, PlayerAttributes, PlayerData } from '@common/interfaces/player';
import { PositionedTile } from '@common/interfaces/position';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { Combat } from './combat';
import { DefensiveVirtualPlayer } from './defensive-virtual-player';
import { Game } from './game';
import { OffensiveVirtualPlayer } from './offensive-virtual-player';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));

describe('VirtualPlayer', () => {
    let sandbox: sinon.SinonSandbox;
    let game: Game;
    let offensiveVirtualPlayer: OffensiveVirtualPlayer;
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

        offensiveVirtualPlayer = new OffensiveVirtualPlayer(
            'offensiveidvirtual',
            'Offensive Bot',
            'avatar1',
            [PlayerData.OffensiveVP],
            playerAttributes,
        );

        defensiveVirtualPlayer = new DefensiveVirtualPlayer(
            'defensiveidvirtual',
            'Defensive Bot',
            'avatar2',
            [PlayerData.DefensiveVP],
            playerAttributes,
        );

        players = [player1, player2, player3, offensiveVirtualPlayer, defensiveVirtualPlayer];

        game = new Game(JSON.parse(JSON.stringify(map)), '9111', players);
        game.activePlayer = {
            player: offensiveVirtualPlayer,
            position: { x: 0, y: 0 },
        };

        combat = new Combat();
        game.combat = combat;
        game.data = { debugging: false } as GameData;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('tryCaptureFlagTest', () => {
        it('should return false if the game mode is not CTF', () => {
            game.map.mode = GameMode.Classical;
            const result = offensiveVirtualPlayer['tryCaptureFlag'](game);
            expect(result).to.equal(false);
        });
    });

    describe('tryReturnToSpawnWithFlag', () => {
        it('should return false if no player has the flag', () => {
            const result = offensiveVirtualPlayer['tryToReturnToFlagHolderSpawn'](game);
            expect(result).to.equal(false);
        });
    });

    describe('findEnemyFlagHolder', () => {
        it('should return undefined if nobody has the flag', () => {
            game.map.mode = GameMode.Ctf;
            const result = offensiveVirtualPlayer['findFlagHolder'](game);
            expect(result).to.equal(undefined);
        });
    });

    describe('isTileWithObjectToPickUp', () => {
        it('should return false for flags', () => {
            const tile = {
                object: { name: ObjectName.Flag },
                player: null,
            } as TileBase;

            const result = offensiveVirtualPlayer['isTileWithObjectToPickUp'](tile, {});
            expect(result).to.equal(false);
        });

        it('should return false for spawn points', () => {
            const tile = {
                object: { name: ObjectName.Spawnpoint },
                player: null,
            } as TileBase;

            const result = offensiveVirtualPlayer['isTileWithObjectToPickUp'](tile, {});
            expect(result).to.equal(false);
        });

        it('should return true for collectable objects', () => {
            const tile = {
                object: { name: ObjectName.Steak },
                player: null,
            } as TileBase;

            offensiveVirtualPlayer.inventory = [];

            const result = offensiveVirtualPlayer['isTileWithObjectToPickUp'](tile, { [ObjectName.Steak]: 1 });
            expect(result).to.equal(true);
        });
    });

    describe('interactIfBlockedByDoor', () => {
        it('should interact with a closed door on the path', () => {
            const doorPosition = { x: 1, y: 0, cost: 0, tile: { type: TileType.ClosedDoor } } as PositionedTile;
            const playerPosition = { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } } as PositionedTile;

            const pathWithDoor = [playerPosition, doorPosition];
            offensiveVirtualPlayer.actionsLeft = 1;

            const interactWithDoorStub = sandbox.stub(game.map, 'interactWithDoor');

            const result = offensiveVirtualPlayer['interactIfBlockedByDoor'](game, pathWithDoor);

            expect(result).to.equal(true);
            expect(interactWithDoorStub.calledOnce).to.equal(true);
        });

        it('should return false if no action is available', () => {
            const doorPosition = { x: 1, y: 0, cost: 0, tile: { type: TileType.ClosedDoor } } as PositionedTile;
            const playerPosition = { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } } as PositionedTile;

            const pathWithoutAction = [playerPosition, doorPosition];
            offensiveVirtualPlayer.actionsLeft = 0;

            const interactWithDoorStub = sandbox.stub(game.map, 'interactWithDoor');

            const result = offensiveVirtualPlayer['interactIfBlockedByDoor'](game, pathWithoutAction);

            expect(result).to.equal(false);
            expect(interactWithDoorStub.called).to.equal(false);
        });
    });

    describe('setupEventHandlers', () => {
        it('should configure event handlers for the game and combat', () => {
            sandbox.replace(offensiveVirtualPlayer as any, 'handlerWrapper', (emitter: Game | Combat, event: string, params: () => void) => {
                params();
            });
            const playerTurnSpy = sandbox.stub(offensiveVirtualPlayer as any, 'handlePlayerTurn');
            const combatTurnSpy = sandbox.stub(offensiveVirtualPlayer as any, 'handleCombatTurn');
            const inventoryChoiceSpy = sandbox.stub(offensiveVirtualPlayer as any, 'handleInventoryChoice');

            offensiveVirtualPlayer.setupEventHandlers(game);

            return expect(playerTurnSpy.called).to.be.true && expect(combatTurnSpy.called).to.be.true && expect(inventoryChoiceSpy.called).to.be.true;
        });
    });

    describe('tryToMoveTowards', () => {
        it('should return false if the path is empty', () => {
            const result = offensiveVirtualPlayer.tryToMoveTowards(game, undefined);
            expect(result).to.equal(false);
        });

        it('should return false if the player cannot interact with a blocking door', () => {
            const interactStub = sandbox.stub(offensiveVirtualPlayer as any, 'interactIfBlockedByDoor').returns(false);
            const pathDoor = [{ x: 0, y: 0 }] as PositionedTile[];

            const result = offensiveVirtualPlayer.tryToMoveTowards(game, pathDoor);

            expect(result).to.equal(false);
            expect(interactStub.calledOnce).to.equal(true);
        });

        it('should call movePlayer and return true if the movement succeeds', () => {
            const interactStub = sandbox.stub(offensiveVirtualPlayer as any, 'interactIfBlockedByDoor').returns(true);
            const movePlayerStub = sandbox.stub(game, 'movePlayer');
            const pathToMove = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ] as PositionedTile[];

            game.movePath = [{ x: 0, y: 0 } as PositionedTile];

            const result = offensiveVirtualPlayer.tryToMoveTowards(game, pathToMove);

            expect(result).to.equal(true);
            expect(interactStub.calledOnce).to.equal(true);
            expect(movePlayerStub.calledOnce).to.equal(true);
            expect(movePlayerStub.calledWith(pathToMove[pathToMove.length - 1])).to.equal(true);
        });
    });

    describe('canTraverseDuringRound', () => {
        it('should correctly calculate the cost with closed doors', () => {
            const pathClosedDoor = [
                { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } },
                { x: 1, y: 0, cost: 1, tile: { type: TileType.ClosedDoor } },
                { x: 2, y: 0, cost: 4, tile: { type: TileType.Base } },
            ] as PositionedTile[];

            offensiveVirtualPlayer.actionsLeft = 1;
            offensiveVirtualPlayer.movesLeft = 6;

            const isValidTileCostStub = sandbox.stub(gameChecks, 'isValidTileCost').returns(true);

            const result = offensiveVirtualPlayer.canTraverseDuringRound(pathClosedDoor);

            expect(result).to.equal(true);
            expect(isValidTileCostStub.calledOnce).to.equal(true);
        });

        it("should not consider door costs if the player doesn't have enough actions", () => {
            const pathNoActions = [
                { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } },
                { x: 1, y: 0, cost: 1, tile: { type: TileType.ClosedDoor } },
                { x: 2, y: 0, cost: 4, tile: { type: TileType.Base } },
            ] as PositionedTile[];

            offensiveVirtualPlayer.actionsLeft = 0;
            offensiveVirtualPlayer.movesLeft = 6;

            const isValidTileCostStub = sandbox.stub(gameChecks, 'isValidTileCost').returns(true);

            const result = offensiveVirtualPlayer.canTraverseDuringRound(pathNoActions);
            const VALID_COST = 4;

            expect(result).to.equal(true);
            expect(isValidTileCostStub.calledOnce).to.equal(true);
            expect(isValidTileCostStub.firstCall.args[0]).to.equal(VALID_COST);
        });
    });

    describe('getAllPathsTo', () => {
        it('should return all paths to the target tiles', () => {
            const currentTile = { x: 0, y: 0, tile: { type: TileType.Base, player: offensiveVirtualPlayer } };
            const targetTile1 = { x: 1, y: 0, tile: { type: TileType.Base, object: { name: ObjectName.Steak } } };
            const targetTile2 = { x: 2, y: 0, tile: { type: TileType.Base, object: { name: ObjectName.Torch } } };

            const filterMatrixStub = sandbox.stub(algorithms, 'filterMatrix').returns([currentTile.tile]);
            const dijkstraStub = sandbox.stub(algorithms, 'dijkstra');

            dijkstraStub.onFirstCall().returns([
                { x: 0, y: 0, cost: 0, tile: currentTile.tile },
                { x: 1, y: 0, cost: 1, tile: targetTile1.tile },
            ]);

            dijkstraStub.onSecondCall().returns([
                { x: 0, y: 0, cost: 0, tile: currentTile.tile },
                { x: 1, y: 0, cost: 1, tile: { type: TileType.Base } },
                { x: 2, y: 0, cost: 2, tile: targetTile2.tile },
            ]);

            game.map.tiles = [[currentTile.tile, targetTile1.tile, targetTile2.tile]] as TileBase[][];

            const isTileToVisit = (tile: TileBase) => Boolean(tile.object);

            const result = offensiveVirtualPlayer.getAllPathsTo(game, isTileToVisit);

            expect(filterMatrixStub.calledOnce).to.equal(true);
            expect(dijkstraStub.calledTwice).to.equal(true);
            expect(result.length).to.equal(2);
            expect(result[0][result[0].length - 1].cost).to.be.lessThan(result[1][result[1].length - 1].cost);
        });

        it('should handle Bird object correctly', () => {
            const playerHasObjectStub = sandbox.stub(algorithms, 'playerHasObject');
            playerHasObjectStub.withArgs(offensiveVirtualPlayer, ObjectName.Bird).returns(true);

            const result = offensiveVirtualPlayer.getAllPathsTo(game, () => true);

            expect(result[0][0].cost).to.equal(0);
            expect(result[0][1].cost).to.equal(0);
        });
    });

    describe('tryToReturnToFlagHolderSpawn', () => {
        it("should find the flag holder's spawn point and move there", () => {
            const flagHolder = player1;
            flagHolder.inventory = [{ name: ObjectName.Flag }];
            flagHolder.spawnPoint = { x: 5, y: 5 };

            const spawnTile = { type: TileType.Base };
            const findTileStub = sandbox.stub(algorithms, 'findTile').returns(spawnTile);
            const getAllPathsToStub = sandbox.stub(offensiveVirtualPlayer, 'getAllPathsTo').returns([
                [
                    { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } },
                    { x: 5, y: 5, cost: 1, tile: spawnTile },
                ],
            ]);
            const tryToMoveTowardsStub = sandbox.stub(offensiveVirtualPlayer, 'tryToMoveTowards').returns(true);
            const endTurnStub = sandbox.stub(game, 'endTurn');

            const result = offensiveVirtualPlayer.tryToReturnToFlagHolderSpawn(game);

            expect(result).to.equal(true);
            expect(findTileStub.calledWith(game.map.tiles, flagHolder.spawnPoint)).to.equal(true);
            expect(getAllPathsToStub.calledOnce).to.equal(true);
            expect(tryToMoveTowardsStub.calledOnce).to.equal(true);
            expect(endTurnStub.calledOnce).to.equal(true);
        });
    });

    describe('tryCaptureFlag', () => {
        it("should return false if there's no path to the flag", () => {
            const getAllPathsToStub = sandbox.stub(offensiveVirtualPlayer, 'getAllPathsTo').returns([]);

            const result = offensiveVirtualPlayer.tryCaptureFlag(game);

            expect(result).to.equal(false);
            expect(getAllPathsToStub.calledOnce).to.equal(true);
        });

        it('should endTurn if no movement available', () => {
            sandbox.stub(offensiveVirtualPlayer, 'getAllPathsTo').returns([[]]);
            sandbox.stub(offensiveVirtualPlayer, 'tryToMoveTowards').returns(true);
            const endTurnSpy = sandbox.spy(game, 'endTurn');

            const result = offensiveVirtualPlayer.tryCaptureFlag(game);

            return expect(result).to.be.true && expect(endTurnSpy.called).to.be.true;
        });
    });

    describe('tryMoveTowardsItems', () => {
        it('should find paths to priority items', () => {
            const objectPriorities = { [ObjectName.Steak]: 3, [ObjectName.Torch]: 2 };
            const pathToItem1 = [
                { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } },
                { x: 1, y: 0, cost: 1, tile: { type: TileType.Base, object: { name: ObjectName.Steak } } },
            ] as PositionedTile[];
            const pathToItem2 = [
                { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } },
                { x: 2, y: 0, cost: 1, tile: { type: TileType.Base, object: { name: ObjectName.Torch } } },
            ] as PositionedTile[];

            const getAllPathsToStub = sandbox.stub(offensiveVirtualPlayer, 'getAllPathsTo').returns([pathToItem1, pathToItem2]);
            const canTraverseStub = sandbox.stub(offensiveVirtualPlayer, 'canTraverseDuringRound').returns(true);
            const tryToMoveTowardsStub = sandbox.stub(offensiveVirtualPlayer, 'tryToMoveTowards').returns(true);

            const result = offensiveVirtualPlayer['tryMoveTowardsItems'](game, objectPriorities);

            expect(result).to.equal(true);
            expect(getAllPathsToStub.calledOnce).to.equal(true);
            expect(canTraverseStub.calledTwice).to.equal(true);
            expect(tryToMoveTowardsStub.calledOnce).to.equal(true);
            expect(tryToMoveTowardsStub.firstCall.args[1][1].tile.object.name).to.equal(ObjectName.Steak);
        });

        it('should use inaccessible paths if no accessible path exists', () => {
            const objectPriorities = { [ObjectName.Steak]: 3 };
            const pathToItem = [
                { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } },
                { x: 1, y: 0, cost: 1, tile: { type: TileType.Base, object: { name: ObjectName.Steak } } },
            ] as PositionedTile[];

            const getAllPathsToStub = sandbox.stub(offensiveVirtualPlayer, 'getAllPathsTo').returns([pathToItem]);
            const canTraverseStub = sandbox.stub(offensiveVirtualPlayer, 'canTraverseDuringRound').returns(false);
            const tryToMoveTowardsStub = sandbox.stub(offensiveVirtualPlayer, 'tryToMoveTowards').returns(true);

            const result = offensiveVirtualPlayer['tryMoveTowardsItems'](game, objectPriorities);

            expect(result).to.equal(true);
            expect(getAllPathsToStub.calledOnce).to.equal(true);
            expect(canTraverseStub.calledOnce).to.equal(true);
            expect(tryToMoveTowardsStub.calledOnce).to.equal(true);
            expect(tryToMoveTowardsStub.firstCall.args[1]).to.equal(pathToItem);
        });
    });

    describe('isTileWithObjectToPickUp', () => {
        it('should return true for a higher priority replaceable object', () => {
            const objectPriorities = { [ObjectName.Steak]: 3, [ObjectName.Torch]: 5 };
            const tile = {
                object: { name: ObjectName.Torch },
                player: null,
            } as TileBase;

            offensiveVirtualPlayer.inventory = Array(2).fill({ name: ObjectName.Steak });

            const result = offensiveVirtualPlayer['isTileWithObjectToPickUp'](tile, objectPriorities);

            expect(result).to.equal(true);
        });

        it('should return false for a non-replaceable object when inventory is full', () => {
            const objectPriorities = { [ObjectName.Steak]: 3, [ObjectName.Torch]: 2 };
            const tile = {
                object: { name: ObjectName.Steak },
                player: null,
            } as TileBase;

            offensiveVirtualPlayer.inventory = Array(2).fill({ name: ObjectName.Steak });

            const result = offensiveVirtualPlayer['isTileWithObjectToPickUp'](tile, objectPriorities);

            expect(result).to.equal(false);
        });

        it('should handle full inventory with lower priority items', () => {
            const tile = {
                object: { name: ObjectName.Steak },
                player: null,
            } as TileBase;

            const priorities = { [ObjectName.Torch]: 3, [ObjectName.Steak]: 5 };
            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Torch }, { name: ObjectName.Torch }];

            const result = offensiveVirtualPlayer['isTileWithObjectToPickUp'](tile, priorities);

            return expect(result).to.be.true;
        });

        it('should return true when inventory has space', () => {
            const tile = {
                object: { name: ObjectName.Steak },
                player: null,
            } as TileBase;

            const priorities = { [ObjectName.Steak]: 3 };
            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Torch }];

            const result = offensiveVirtualPlayer['isTileWithObjectToPickUp'](tile, priorities);

            return expect(result).to.be.true;
        });
    });

    describe('handleInventoryChoice', () => {
        it('should handle inventory choice for defensive player', () => {
            const findTileStub = sandbox.stub(algorithms, 'findTile').returns({
                object: { name: ObjectName.Steak },
            });
            const shouldPickUpObjectStub = sandbox.stub(defensiveVirtualPlayer as any, 'shouldPickUpObject').returns(true);
            const switchObjectStub = sandbox.stub(defensiveVirtualPlayer as any, 'switchObject');

            defensiveVirtualPlayer['handleInventoryChoice'](game);

            expect(findTileStub.calledOnce).to.equal(true);
            expect(shouldPickUpObjectStub.calledOnce).to.equal(true);
            expect(switchObjectStub.calledOnce).to.equal(true);
        });

        it('should do nothing if no item on tile', () => {
            const findTileStub = sandbox.stub(algorithms, 'findTile').returns({});
            const swapPlayerObjectStub = sandbox.stub(game, 'swapPlayerObject');

            offensiveVirtualPlayer['handleInventoryChoice'](game);

            expect(findTileStub.calledOnce).to.equal(true);
            expect(swapPlayerObjectStub.called).to.equal(false);
        });

        it('should swap object directly if item has lower priority', () => {
            const lowPriorityObject = { name: ObjectName.Torch };
            const findTileStub = sandbox.stub(algorithms, 'findTile').returns({
                object: lowPriorityObject,
            });

            const shouldPickUpObjectStub = sandbox.stub(offensiveVirtualPlayer as any, 'shouldPickUpObject').returns(false);

            const swapPlayerObjectStub = sandbox.stub(game, 'swapPlayerObject');

            offensiveVirtualPlayer['handleInventoryChoice'](game);

            expect(findTileStub.calledOnce).to.equal(true);
            expect(shouldPickUpObjectStub.calledOnce).to.equal(true);
            expect(swapPlayerObjectStub.calledOnce).to.equal(true);
            expect(swapPlayerObjectStub.calledWith(lowPriorityObject.name)).to.equal(true);
        });
    });

    describe('shouldPickUpObject', () => {
        it('should return false if object has higher priority', () => {
            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Steak }];

            const result = offensiveVirtualPlayer['shouldPickUpObject'](ObjectName.Torch, 'offensive');

            expect(result).to.equal(false);
        });

        it('should return false if object has lower priority', () => {
            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Steak }];

            const result = offensiveVirtualPlayer['shouldPickUpObject'](ObjectName.Torch, 'offensive');

            expect(result).to.equal(false);
        });

        it('should handle empty inventory', () => {
            offensiveVirtualPlayer.inventory = [];
            const result = offensiveVirtualPlayer['shouldPickUpObject'](ObjectName.Torch, 'offensive');
            expect(result).to.equal(true);
        });

        it('should return true if inventory is full and all items have higher priority', () => {
            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Trex }, { name: ObjectName.ClubWeapon }];
            const result = offensiveVirtualPlayer['shouldPickUpObject'](ObjectName.Torch, 'offensive');
            return expect(result).to.be.true;
        });

        it('should return true if inventory is not full', () => {
            offensiveVirtualPlayer.inventory = [];

            const result = offensiveVirtualPlayer['shouldPickUpObject'](ObjectName.Torch, 'offensive');

            return expect(result).to.be.true;
        });

        it('should handle defensive player priorities correctly', () => {
            defensiveVirtualPlayer.inventory = [{ name: ObjectName.Torch }, { name: ObjectName.Bone }];

            const steakResult = defensiveVirtualPlayer['shouldPickUpObject'](ObjectName.Steak, 'defensive');
            const torchResult = defensiveVirtualPlayer['shouldPickUpObject'](ObjectName.Torch, 'defensive');

            expect(steakResult).to.equal(true);
            expect(torchResult).to.equal(false);
        });
    });

    describe('findLowestPriorityObject', () => {
        it('should return null if inventory is empty', () => {
            offensiveVirtualPlayer.inventory = [];
            const result = offensiveVirtualPlayer['findLowestPriorityObject']({});
            expect(result).to.equal(null);
        });

        it('should find the lowest priority object', () => {
            const priorities = { [ObjectName.Steak]: 5, [ObjectName.Torch]: 1, [ObjectName.Bone]: 3 };
            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Steak }, { name: ObjectName.Torch }, { name: ObjectName.Bone }];

            const result = offensiveVirtualPlayer['findLowestPriorityObject'](priorities);

            expect(result.name).to.equal(ObjectName.Torch);
        });

        it('should handle objects with same priority', () => {
            const priorities = { [ObjectName.Steak]: 5, [ObjectName.Torch]: 5, [ObjectName.Bone]: 5 };
            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Steak }, { name: ObjectName.Torch }, { name: ObjectName.Bone }];

            const result = offensiveVirtualPlayer['findLowestPriorityObject'](priorities);

            return expect(result).to.not.be.null;
        });
    });

    describe('switchObject', () => {
        it('should swap the lowest priority object for offensive player', () => {
            const swapPlayerObjectStub = sandbox.stub(game, 'swapPlayerObject');

            offensiveVirtualPlayer.inventory = [{ name: ObjectName.Torch }];

            offensiveVirtualPlayer['switchObject'](game);

            expect(swapPlayerObjectStub.calledOnce).to.equal(true);
            expect(swapPlayerObjectStub.calledWith(ObjectName.Torch)).to.equal(true);
        });

        it('should swap the lowest priority object for defensive player', () => {
            const swapPlayerObjectStub = sandbox.stub(game, 'swapPlayerObject');

            defensiveVirtualPlayer.inventory = [{ name: ObjectName.Steak }];

            defensiveVirtualPlayer['switchObject'](game);

            expect(swapPlayerObjectStub.calledOnce).to.equal(true);
            expect(swapPlayerObjectStub.calledWith(ObjectName.Steak)).to.equal(true);
        });

        it('should do nothing if inventory is empty', () => {
            const swapPlayerObjectStub = sandbox.stub(game, 'swapPlayerObject');

            offensiveVirtualPlayer.inventory = [];

            offensiveVirtualPlayer['switchObject'](game);

            expect(swapPlayerObjectStub.called).to.equal(false);
        });
    });

    describe('interactIfBlockedByDoor', () => {
        it('should handle bird object when moving', () => {
            const playerHasObjectStub = sandbox.stub(algorithms, 'playerHasObject').returns(true);
            const isWalkableStub = sandbox.stub(gameChecks, 'isWalkableTile').returns(true);
            const path2 = [
                { x: 0, y: 0, cost: 0, tile: { type: TileType.Base } },
                { x: 1, y: 0, cost: 1, tile: { type: TileType.Base } },
                { x: 2, y: 0, cost: 2, tile: { type: TileType.Base } },
            ];

            const result = offensiveVirtualPlayer['interactIfBlockedByDoor'](game, path2);

            expect(result).to.equal(true);
            expect(playerHasObjectStub.calledOnce).to.equal(true);
            expect(isWalkableStub.called).to.equal(true);
        });
    });

    describe('findFlagHolder', () => {
        it('should return a player holding the flag', () => {
            const flagHolderPlayer = { ...player1 };
            flagHolderPlayer.inventory = [{ name: ObjectName.Flag }];
            game.players = [flagHolderPlayer, player2, player3];

            const result = offensiveVirtualPlayer['findFlagHolder'](game);

            expect(result).to.equal(flagHolderPlayer);
        });

        it('should return undefined when no one has the flag', () => {
            game.players.forEach((p) => (p.inventory = []));

            const result = offensiveVirtualPlayer['findFlagHolder'](game);

            return expect(result).to.be.undefined;
        });
    });

    describe('handlerWrapper', () => {
        let clock: sinon.SinonFakeTimers;

        beforeEach(() => {
            clock = sandbox.useFakeTimers();
            game.timer = { time: 10 } as any;
        });

        afterEach(() => {
            if (clock) {
                clock.restore();
            }
        });

        it('should use Combat ActiveInCombat data for combat events', () => {
            const testCombat = new Combat();
            const callback = sandbox.stub();

            offensiveVirtualPlayer.data.push(PlayerData.ActiveInCombat);

            (offensiveVirtualPlayer as any).handlerWrapper(testCombat, CombatEvent.ChangeTurn, callback);

            testCombat.emit(CombatEvent.ChangeTurn);
            const TIME_CONST = 5000;
            clock.tick(TIME_CONST);
            return expect(callback.called).to.be.true;
        });
    });
});

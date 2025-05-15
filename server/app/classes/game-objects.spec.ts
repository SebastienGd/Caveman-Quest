/* eslint-disable @typescript-eslint/no-explicit-any */
import { CombatEvent } from '@app/utils/constants/combat-events';
import { TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Dice, Player } from '@common/interfaces/player';
import { PositionedTile } from '@common/interfaces/position';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { describe, it } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import { Combat } from './combat';
import { Game } from './game';
import { createObject } from './game-objects';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));
const VALUE_WITH_OBJECT = 6;
const INITIAL_VALUE = 4;
const INITIAL_DEFENSE = 3;
const DEFENSE_WITH_OBJECT = 5;

describe('Game items', () => {
    let game: Game;
    let combat: Combat;
    let sandbox: sinon.SinonSandbox;
    let player1: Player;
    let player2: Player;
    let players: Player[];
    const baseTile: PositionedTile = { x: 0, y: 0, cost: 1, tile: { type: TileType.Base } };
    const waterTile: PositionedTile = { x: 0, y: 0, cost: 2, tile: { type: TileType.Water } };
    const iceTile: PositionedTile = { x: 6, y: 6, cost: 1, tile: { type: TileType.Ice } };

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8'));
        player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8'));
        player1.inventory = [];
        player2.inventory = [];
        players = [player1, player2];

        game = new Game(JSON.parse(JSON.stringify(map)), '1234', players);
        combat = new Combat();
        (combat as any).data = game.data;
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should increase player attribute when steak object is picked up', () => {
        const steakObject = createObject({ name: ObjectName.Steak });
        player1.attributes.health = INITIAL_VALUE;
        player1.attributes.currentHealth = INITIAL_VALUE;
        player1.attributes.defense.value = INITIAL_DEFENSE;

        steakObject.applyEffect(player1, true);
        expect(player1.attributes.health).to.equal(VALUE_WITH_OBJECT - 1);
        expect(player1.attributes.currentHealth).to.equal(VALUE_WITH_OBJECT - 1);
        expect(player1.attributes.defense.value).to.equal(DEFENSE_WITH_OBJECT - 1);
    });

    it('should decrease player attribute when steak object is released', () => {
        const steakObject = createObject({ name: ObjectName.Steak });
        player1.attributes.health = VALUE_WITH_OBJECT;
        player1.attributes.currentHealth = VALUE_WITH_OBJECT;
        player1.attributes.defense.value = DEFENSE_WITH_OBJECT;

        steakObject.applyEffect(player1, false);
        expect(player1.attributes.health).to.equal(INITIAL_VALUE + 1);
        expect(player1.attributes.currentHealth).to.equal(INITIAL_VALUE + 1);
        expect(player1.attributes.defense.value).to.equal(INITIAL_DEFENSE + 1);
    });

    it('should increase player attribute when club weapon object is picked up', () => {
        const clubWeaponObject = createObject({ name: ObjectName.ClubWeapon });
        player1.attributes.attack.value = INITIAL_VALUE;

        clubWeaponObject.applyEffect(player1, true);
        expect(player1.attributes.attack.value).to.equal(VALUE_WITH_OBJECT);
    });

    it('should increase player attribute when bird object is picked up', () => {
        const birdObject = createObject({ name: ObjectName.Bird });
        const flagObject = createObject({ name: ObjectName.Flag });
        const MOVES_LEFT = 4;
        player1.movesLeft = 4;
        player1.inventory = [flagObject];

        birdObject.applyEffect(player1, true);
        expect(player1.movesLeft).to.equal(MOVES_LEFT);

        player1.inventory = [];
        birdObject.applyEffect(player1, true);
        expect(player1.movesLeft).to.equal(1);
    });

    it('should decrease player attribute when club weapon object is released', () => {
        const clubWeaponObject = createObject({ name: ObjectName.ClubWeapon });
        player1.attributes.attack.value = VALUE_WITH_OBJECT;

        clubWeaponObject.applyEffect(player1, false);
        expect(player1.attributes.attack.value).to.equal(INITIAL_VALUE);
    });

    it('should reset player movement to 1 if bird object', () => {
        const birdObject = createObject({ name: ObjectName.Bird });

        const MOVES_LEFT = 0;
        player1.movesLeft = MOVES_LEFT;

        birdObject.onResetPlayer(player1);
        expect(player1.movesLeft).to.equal(1);
    });

    it('should set player dices to 6 when move to water tile with torch object', () => {
        const torchObject = createObject({ name: ObjectName.Torch });
        player1.attributes.attack.dice = Dice.Dice4;
        player1.attributes.defense.dice = Dice.Dice4;
        game.activePlayer.player = player1;

        const startTile = baseTile;
        const endTile = waterTile;

        torchObject.onMovePlayer(game, startTile, endTile);
        expect(player1.attributes.attack.dice).to.equal(Dice.Dice6);
        expect(player1.attributes.defense.dice).to.equal(Dice.Dice6);
    });

    it('should not change player dices when move to non-water tile with torch object', () => {
        const torchObject = createObject({ name: ObjectName.Torch });
        const initialAttackDice = player1.attributes.attack.dice;
        const initialDefenseDice = player1.attributes.defense.dice;
        game.activePlayer.player = player1;

        const startTile = baseTile;
        const endTile = waterTile;
        torchObject.onMovePlayer(game, startTile, endTile);

        const startTile2 = waterTile;
        const endTile2 = iceTile;
        torchObject.onMovePlayer(game, startTile2, endTile2);

        expect(player1.attributes.attack.dice).to.equal(initialAttackDice);
        expect(player1.attributes.defense.dice).to.equal(initialDefenseDice);
    });

    it('should end the combat if the bone object is effective', () => {
        const boneObject = createObject({ name: ObjectName.Bone });
        player1.attributes.currentHealth = 1;
        combat.inactivePlayer = player2;

        const emitSpy = sandbox.spy(combat, 'emit');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endCombatStub = sandbox.stub(combat as any, 'endCombat');
        boneObject.onBeforeAttack(combat, player1);
        return (
            expect(emitSpy.calledWith(CombatEvent.SuccessfulAttack, player2.attributes.currentHealth)).to.be.true &&
            expect(endCombatStub.calledWith(true)).to.be.true
        );
    });

    it('should not end the combat if the bone object is ineffective', () => {
        const boneObject = createObject({ name: ObjectName.Bone });
        player1.attributes.currentHealth = 3;

        const emitSpy = sandbox.spy(combat, 'emit');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endCombatSpy = sandbox.spy(combat as any, 'endCombat');

        const result = boneObject.onBeforeAttack(combat, player1);

        return (
            expect(emitSpy.calledWith(CombatEvent.SuccessfulAttack)).to.be.false &&
            expect(endCombatSpy.calledWith(true)).to.be.false &&
            expect(result).to.be.true
        );
    });

    it('should let player move on any available tile with bird object', () => {
        const birdObject = createObject({ name: ObjectName.Bird });

        const startTile = baseTile;
        const endTile = waterTile;
        game.activePlayer.player = player1;

        const startMovementSpy = sandbox.spy(game, 'startMovement');
        const result = birdObject.onMovePlayer(game, startTile, endTile);

        return (
            expect(player1.movesLeft).to.equal(TILE_TYPE_TO_COST[endTile.tile.type]) &&
            expect(startMovementSpy.called).to.be.true &&
            expect(result).to.be.false
        );
    });

    it('should not let player move on occupied tile with bird object', () => {
        const birdObject = createObject({ name: ObjectName.Bird });

        const startTile = baseTile;
        const endTile = waterTile;
        endTile.tile.player = player2;
        game.activePlayer.player = player1;

        const startMovementSpy = sandbox.spy(game, 'startMovement');
        const result = birdObject.onMovePlayer(game, startTile, endTile);

        return (
            expect(game.movePath).to.not.equal([startTile, endTile]) &&
            expect(player1.movesLeft).to.not.equal(TILE_TYPE_TO_COST[endTile.tile.type]) &&
            expect(startMovementSpy.called).to.be.false &&
            expect(result).to.be.true
        );
    });

    it('should decrease the winner victories if the opponent has a Trex object', () => {
        const trexObject = createObject({ name: ObjectName.Trex });
        player1.stats.victories = 1;
        combat.activePlayer = player1;

        trexObject.onCombatEnd(combat, true);
        expect(player1.stats.victories).to.equal(0);
    });

    it('should return the same object if the name does not match any known object name', () => {
        const unknownObject = { name: 'UnknownObject' } as unknown as GameObject;
        const result = createObject(unknownObject);

        expect(result).to.equal(unknownObject);
    });
});

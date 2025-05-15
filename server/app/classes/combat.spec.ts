/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CombatEvent } from '@app/utils/constants/combat-events';
import { COMBAT_CONSTANTS } from '@app/utils/constants/game-constants';
import { TimerEvent } from '@app/utils/constants/timer-events';
import * as gameChecks from '@app/utils/game-checks';
import { ObjectName } from '@common/interfaces/object';
import { Dice, Player, PlayerData } from '@common/interfaces/player';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { Combat } from './combat';
import { Game } from './game';
import { createObject } from './game-objects';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));

describe('Combat', () => {
    let combat: Combat;
    let sandbox: sinon.SinonSandbox;
    let game: Game;
    let players: Player[];
    let emitSpy: sinon.SinonSpy;
    let player1: Player;
    let player2: Player;
    let player3: Player;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8'));
        player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8'));
        player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8'));
        players = [player1, player2, player3];
        game = new Game(JSON.parse(JSON.stringify(map)), '1234', players);
        combat = new Combat();
        (combat as any).data = {
            debugging: false,
            transitioning: false,
            turnIsEnding: false,
            isSelectingObject: false,
            gameIsOver: false,
        };

        emitSpy = sandbox.spy(combat, 'emit');
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('destroy', () => {
        it('should stop the timer and remove all listeners', () => {
            const stopSpy = sandbox.spy(combat.timer, 'stop');
            const timerRemoveAllListenersSpy = sandbox.spy(combat.timer, 'removeAllListeners');
            const combatRemoveAllListenersSpy = sandbox.spy(combat, 'removeAllListeners');

            combat.destroy();

            expect(stopSpy.calledOnce).to.be.true;
            expect(timerRemoveAllListenersSpy.calledOnce).to.be.true;
            expect(combatRemoveAllListenersSpy.calledOnce).to.be.true;
        });
    });

    describe('startCombat', () => {
        it('should initialize with correct players', () => {
            player1.actionsLeft = 1;
            player1.attributes.speed = 100;
            combat.startCombat(game, player1.id, player2.id);
            return expect(combat.activePlayer.id).to.equal(player1.id) && expect(combat.inactivePlayer.id).to.equal(player2.id);
        });

        it('should initialize with correct players if opponent is faster', () => {
            player1.actionsLeft = 1;
            player2.attributes.speed = 100;
            combat.startCombat(game, player1.id, player2.id);
            return expect(combat.activePlayer.id).to.equal(player2.id) && expect(combat.inactivePlayer.id).to.equal(player1.id);
        });

        it('should set combat data flags for both players', () => {
            player1.actionsLeft = 1;
            combat.startCombat(game, player1.id, player2.id);
            return expect(player1.data.includes(PlayerData.Combat)).to.be.true && expect(player2.data.includes(PlayerData.Combat)).to.be.true;
        });

        it('should not start combat if attacker has no actions left', () => {
            player1.actionsLeft = 0;
            combat.startCombat(game, player1.id, player2.id);

            return expect(combat.activePlayer).to.be.undefined && expect(emitSpy.calledWith(CombatEvent.CombatStart)).to.be.false;
        });

        it('should not increase the winner victories if the opponent has a Trex object', () => {
            const trexObject = createObject({ name: ObjectName.Trex });
            player1.inventory = [trexObject];
            player2.stats.victories = 1;
            combat.inactivePlayer = player1;
            combat.activePlayer = player2;
            combat.endCombat(true);

            expect(player2.stats.victories).to.equal(0);
        });

        it('should not affect the winner victories if the opponent do not have a Trex object', () => {
            const steakObject = createObject({ name: ObjectName.Steak });
            player1.inventory = [steakObject];
            player2.stats.victories = 1;
            combat.inactivePlayer = player1;
            combat.activePlayer = player2;
            combat.endCombat(true);

            expect(player2.stats.victories).to.equal(1);
        });
    });

    describe('evade', () => {
        beforeEach(() => {
            player1.actionsLeft = 1;
            combat.startCombat(game, player1.id, player2.id);
        });

        it('should end combat on successful evade', () => {
            const PROBABILITY = 0.2;
            sandbox.stub(Math, 'random').returns(PROBABILITY);
            combat.evade();

            return expect(emitSpy.calledWith(CombatEvent.CombatEnd, false)).to.be.true;
        });

        it('should change turn after failed evade', () => {
            const PROBABILITY = 0.5;
            sandbox.stub(Math, 'random').returns(PROBABILITY);
            combat.evade();

            return expect(emitSpy.calledWith(CombatEvent.ChangeTurn)).to.be.true && expect(combat.activePlayer).to.equal(player2);
        });
    });

    describe('attack', () => {
        beforeEach(() => {
            player1.actionsLeft = 1;
            combat.startCombat(game, player1.id, player2.id);
        });

        it('should end combat if defender is defeated', () => {
            player2.attributes.currentHealth = 1;
            const ATTACK = 10;
            const DEFENSE = 5;
            sandbox
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .stub(combat as any, 'computeAttackSuccess')
                .onFirstCall()
                .returns(ATTACK)
                .onSecondCall()
                .returns(DEFENSE);

            combat.attack();

            return (
                expect(emitSpy.calledWith(CombatEvent.SuccessfulAttack, 1)).to.be.true &&
                expect(emitSpy.calledWith(CombatEvent.CombatEnd, true)).to.be.true &&
                expect(player2.attributes.currentHealth).to.equal(player2.attributes.health)
            );
        });

        it('should change turn after unsuccessful attack', () => {
            const ATTACK = 10;
            const DEFENSE = 5;
            sandbox
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .stub(combat as any, 'computeAttackSuccess')
                .onFirstCall()
                .returns(ATTACK)
                .onSecondCall()
                .returns(DEFENSE);

            combat.attack();

            return expect(emitSpy.calledWith(CombatEvent.ChangeTurn)).to.be.true && expect(combat.activePlayer).to.equal(player2);
        });
        it('should set diceResult for active and inactive player based on debugging mode (attack dice 4)', () => {
            (combat as any).data.debugging = true;
            player2.attributes.currentHealth = 100;
            player1.attributes.attack.dice = Dice.Dice4;
            combat.attack();
            expect(combat.inactivePlayer.diceResult).to.be.equal(COMBAT_CONSTANTS.dice4Value);
            expect(combat.activePlayer.diceResult).to.equal(1);
        });

        it('should set diceResult for active and inactive player based on debugging mode (attack dice 6)', () => {
            (combat as any).data.debugging = true;
            player2.attributes.currentHealth = 100;
            player1.attributes.attack.dice = Dice.Dice6;

            combat.attack();
            expect(combat.inactivePlayer.diceResult).to.be.equal(COMBAT_CONSTANTS.dice6Value);
            expect(combat.activePlayer.diceResult).to.equal(1);
        });

        it('should not proceed with the attack if the bone object is effective', () => {
            const boneObject = createObject({ name: ObjectName.Bone });
            player1.inventory = [boneObject];
            player1.attributes.currentHealth = 1;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const changeTurnSpy = sandbox.spy(combat as any, 'changeTurn');

            combat.attack();
            return expect(changeTurnSpy.called).to.be.false;
        });

        it('should proceed with the attack if the bone object effect is ineffective', () => {
            const steakObject = createObject({ name: ObjectName.Steak });
            player1.inventory = [steakObject];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const changeTurnSpy = sandbox.spy(combat as any, 'changeTurn');

            combat.attack();
            return expect(changeTurnSpy.called).to.be.true;
        });
    });

    describe('attack (when on ice)', () => {
        beforeEach(() => {
            player1.actionsLeft = 1;
            const stub = sinon.stub(gameChecks, 'isOnIce').returns(true);
            combat.startCombat(game, player1.id, player2.id);
            stub.restore();
        });

        it('should apply penalty to attack when player is on ice', () => {
            player2.attributes.currentHealth = 10;
            player1.attributes.attack.value = 5;
            player2.attributes.defense.value = 3;
            const EXPECTED_HEALTH = 8;
            sandbox
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .stub(combat as any, 'rollBonusDice')
                .returns(0);

            combat.attack();

            return (
                expect(emitSpy.calledWith(CombatEvent.SuccessfulAttack, 2)).to.be.true &&
                expect(player2.attributes.currentHealth).to.equal(EXPECTED_HEALTH)
            );
        });
    });

    describe('disconnectPlayer', () => {
        it('should end combat when any player disconnects', () => {
            player1.actionsLeft = 1;

            combat.startCombat(game, player1.id, player2.id);
            combat.disconnectPlayer(player1.id);

            return expect(emitSpy.calledWith(CombatEvent.CombatEnd, true)).to.be.true && expect(combat.activePlayer).to.be.null;
        });
    });

    describe('timer events', () => {
        it('should trigger attack when timer expires', () => {
            player1.actionsLeft = 1;

            const attackSpy = sandbox.spy(combat, 'attack');
            combat.startCombat(game, player1.id, player2.id);

            combat.timer.emit(TimerEvent.TimerExpired);
            return expect(attackSpy.called).to.be.true;
        });

        it('should start a short combat round duration when no evade attempts are left', () => {
            player1.actionsLeft = 1;
            combat.startCombat(game, player1.id, player2.id);

            player1.evasionAttempts = 0;
            const hasEvadeLeftStub = sandbox.stub(gameChecks, 'hasEvadeLeft').returns(false);
            const startSpy = sandbox.spy(combat.timer, 'start');
            combat['changeTurn']();
            return expect(startSpy.calledWith(COMBAT_CONSTANTS.shortCombatRoundDuration)).to.be.true && hasEvadeLeftStub.restore();
        });
    });
});

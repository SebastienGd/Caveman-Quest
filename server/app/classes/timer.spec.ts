import { GameConstants } from '@app/utils/constants/game-constants';
import { TimerEvent } from '@app/utils/constants/timer-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Timer } from './timer';

describe('Timer class tests', () => {
    let timer: Timer;
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
        timer = new Timer();
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
    });

    it('should start the timer with a specified time', () => {
        const startTime = 10;
        timer.start(startTime);
        expect(timer.time).to.equal(startTime);
    });
    it('should not start a new timer if one is already running', () => {
        timer.start(2);
        const startSpy = sinon.spy(timer, 'start');
        timer.start(2);
        expect(startSpy.callCount).to.equal(1);
    });

    it('should emit NewTime event at each tick', () => {
        const startTime = 5;
        const newTimeSpy = sinon.spy();
        timer.on(TimerEvent.NewTime, newTimeSpy);

        timer.start(startTime);
        clock.tick(GameConstants.TimerTickMs * startTime);

        expect(newTimeSpy.callCount).to.equal(startTime + 1);
    });

    it('should emit TimerExpired when time reaches zero', () => {
        const startTime = 3;
        const expiredSpy = sinon.spy();
        timer.on(TimerEvent.TimerExpired, expiredSpy);

        timer.start(startTime);
        clock.tick(GameConstants.TimerTickMs * (startTime + 1));

        return expect(expiredSpy.calledOnce).to.be.true;
    });

    it('should pause the timer and store the remaining time', () => {
        const NBR_OF_TICKS = 8;

        const startTime = 10;
        timer.start(startTime);
        clock.tick(GameConstants.TimerTickMs * NBR_OF_TICKS);
        timer.pause();

        return expect(timer.paused).to.be.true && expect(timer.time).to.equal(startTime - NBR_OF_TICKS);
    });

    it('should resume from paused state', () => {
        const NBR_OF_TICKS = 5;
        const NBR_OF_TICKS2 = 3;
        const startTime = 10;
        const EXPECTED_TIME = startTime - NBR_OF_TICKS - NBR_OF_TICKS2;

        timer.start(startTime);
        clock.tick(GameConstants.TimerTickMs * NBR_OF_TICKS);
        timer.pause();
        timer.start();

        clock.tick(GameConstants.TimerTickMs * NBR_OF_TICKS2);
        expect(timer.time).to.equal(EXPECTED_TIME);
    });

    it('should stop the timer and reset', () => {
        const START_TIME = 10;
        timer.start(START_TIME);
        timer.stop();

        return expect(timer.time).to.equal(0) && expect(timer.paused).to.be.false;
    });
});

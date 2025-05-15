import { GameConstants } from '@app/utils/constants/game-constants';
import { TimerEvent } from '@app/utils/constants/timer-events';
import { EventEmitter } from 'events';

export class Timer extends EventEmitter {
    private isPaused: boolean = false;
    private timerId: NodeJS.Timeout | null = null;
    private currentTime: number = 0;
    private remainingTime: number = 0;

    get time(): number {
        return this.currentTime;
    }
    get paused(): boolean {
        return this.isPaused;
    }

    start(time?: number) {
        if (time) {
            this.stop();
            this.currentTime = time;
        } else if (this.isPaused) {
            this.currentTime = this.remainingTime;
            this.isPaused = false;
        }

        if (this.timerId) return;
        this.emit(TimerEvent.NewTime);
        this.timerId = setInterval(() => {
            this.currentTime--;
            this.emit(TimerEvent.NewTime);
            if (this.currentTime <= 0) {
                this.stop();
                this.emit(TimerEvent.TimerExpired);
            }
        }, GameConstants.TimerTickMs);
    }

    pause() {
        if (this.timerId && !this.isPaused) {
            clearInterval(this.timerId);
            this.timerId = null;
            this.remainingTime = this.currentTime;
            this.isPaused = true;
        }
    }

    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isPaused = false;
        this.currentTime = 0;
        this.remainingTime = 0;
    }
}

import { Component, Input } from '@angular/core';
import { GameBase, GameStats } from '@common/interfaces/game';

const MINUTE = 60;

@Component({
    selector: 'app-global-stats',
    standalone: true,
    templateUrl: './global-stats.component.html',
    styleUrls: ['./global-stats.component.scss'],
})
export class GlobalStatsComponent {
    @Input() game!: GameBase;

    get stats(): GameStats {
        return (
            this.game?.stats || {
                duration: 0,
                nbTurns: 0,
                doorInteractedPercentage: 0,
                tilesVisitedPercentage: 0,
                nbPlayersHeldFlag: 0,
            }
        );
    }

    get formattedDuration(): string {
        const minutes = Math.floor(this.stats.duration / MINUTE);
        const seconds = this.stats.duration % MINUTE;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

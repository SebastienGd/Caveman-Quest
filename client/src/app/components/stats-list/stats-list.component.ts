import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Player, PlayerStats } from '@common/interfaces/player';
import { COLUMNS } from 'src/utils/constants/stats-constants';

@Component({
    selector: 'app-stats-list',
    templateUrl: './stats-list.component.html',
    styleUrls: ['./stats-list.component.scss'],
})
export class StatsListComponent implements OnChanges {
    @Input() players: Player[] = [];
    sortedPlayers: Player[] = [];
    sortColumn: keyof PlayerStats = 'combat';
    sortDirection: 'asc' | 'desc' = 'asc';
    columns = COLUMNS;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['players'] && this.players.length > 0) {
            this.sortPlayers();
        }
    }

    onSort(column: (typeof this.columns)[number]['key']): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.sortPlayers();
    }

    private sortPlayers(): void {
        this.sortedPlayers = [...this.players].sort((a, b) => {
            const key = this.sortColumn as keyof PlayerStats;
            const aValue = a.stats[key];
            const bValue = b.stats[key];
            return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }
}

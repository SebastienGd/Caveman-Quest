import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';

@Component({
    selector: 'app-player-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './player-list.component.html',
    styleUrls: ['./player-list.component.scss'],
})
export class PlayerListComponent {
    @Input() players: Player[] = [];
    @Input() activePlayerName: string = '';
    @Input() organizerName: string = '';

    playerData = PlayerData;
    playerHasFlag(player: Player) {
        return player.inventory.some((object) => object.name === ObjectName.Flag);
    }
}

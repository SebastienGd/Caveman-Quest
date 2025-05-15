import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Player, PlayerData } from '@common/interfaces/player';

@Component({
    selector: 'app-waiting-room-list',
    imports: [CommonModule],
    templateUrl: './waiting-room-list.component.html',
    styleUrl: './waiting-room-list.component.scss',
})
export class WaitingRoomListComponent implements OnInit {
    @Input() players: Player[] = [];
    @Input() playerID: string;
    @Output() remove = new EventEmitter<string>();

    admin: Player;

    ngOnInit(): void {
        this.setAdmin();
    }

    isAdmin(id: string | undefined): boolean {
        return id === this.admin.id;
    }

    private setAdmin() {
        this.admin = this.players.find((plyr) => plyr.data.includes(PlayerData.Admin)) || ({} as Player);
    }
}

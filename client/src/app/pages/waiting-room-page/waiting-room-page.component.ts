import { CommonModule } from '@angular/common';
import { Component, OnInit, Signal } from '@angular/core';
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';
import { ChoiceModalComponent } from '@app/components/choice-modal/choice-modal.component';
import { WaitingRoomListComponent } from '@app/components/waiting-room-list/waiting-room-list.component';
import { ChatService } from '@app/services/chat.service';
import { WaitingRoomService } from '@app/services/waiting-room.service';
import { AVATARS } from '@common/constants/avatars';
import { ChatMessage } from '@common/interfaces/chat-message';
import { JournalMessage } from '@common/interfaces/journal-message';
import { Player, PlayerData } from '@common/interfaces/player';

@Component({
    selector: 'app-waiting-room-page',
    imports: [ChatBoxComponent, WaitingRoomListComponent, CommonModule, ChoiceModalComponent],
    templateUrl: './waiting-room-page.component.html',
    styleUrl: './waiting-room-page.component.scss',
})
export class WaitingRoomPageComponent implements OnInit {
    isQuitPopupVisible = false;

    chatMessages: Signal<ChatMessage[]> = this.chatService.chatMessages.asReadonly();
    journalMessages: Signal<JournalMessage[]> = this.chatService.journalMessages.asReadonly();
    constructor(
        public waitingRoomService: WaitingRoomService,
        public chatService: ChatService,
    ) {}

    get isAdmin() {
        const admin = this.waitingRoomService.waitingRoom?.players.find((player) => player.data.includes(PlayerData.Admin));
        return admin?.id === this.waitingRoomService.playerId;
    }

    get hasAvatarsLeft() {
        return this.waitingRoomService.waitingRoom?.selectedAvatars
            ? AVATARS.length > Object.values(this.waitingRoomService.waitingRoom.selectedAvatars).length
            : true;
    }

    ngOnInit() {
        this.isQuitPopupVisible = false;
        this.waitingRoomService.resetRoom();
    }

    toggleLock() {
        this.waitingRoomService.toggleLock();
    }

    quitCancel() {
        this.isQuitPopupVisible = false;
    }
    quitConfirm() {
        this.isQuitPopupVisible = false;
        this.waitingRoomService.playerQuit();
    }

    handleClickOnExclude(id: string) {
        this.waitingRoomService.kickPlayer(id);
    }

    startGame() {
        this.waitingRoomService.startGame();
    }

    addAgressiveVP() {
        const profile = 'agressive';
        this.waitingRoomService.addVirtualPlayer(profile);
    }

    addDefensiveVP() {
        const profile = 'defensive';
        this.waitingRoomService.addVirtualPlayer(profile);
    }

    getCurrentPlayer(): Player {
        return this.waitingRoomService.waitingRoom.players.find((p) => p.id === this.waitingRoomService.playerId) || ({} as Player);
    }
}

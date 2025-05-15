import { Component, OnInit, Signal } from '@angular/core';
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';
import { ChoiceModalComponent } from '@app/components/choice-modal/choice-modal.component';
import { GlobalStatsComponent } from '@app/components/global-stats/global-stats.component';
import { StatsListComponent } from '@app/components/stats-list/stats-list.component';
import { ChatService } from '@app/services/chat.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { StatsService } from '@app/services/stats.service';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { ChatMessage } from '@common/interfaces/chat-message';
import { GameBase } from '@common/interfaces/game';
import { JournalMessage } from '@common/interfaces/journal-message';

@Component({
    selector: 'app-stats-page',
    imports: [StatsListComponent, GlobalStatsComponent, ChoiceModalComponent, ChatBoxComponent],
    templateUrl: './stats-page.component.html',
    styleUrl: './stats-page.component.scss',
})
export class StatsPageComponent implements OnInit {
    isQuitPopupVisible: boolean = false;
    game: Signal<GameBase> = this.statsService.localGame.asReadonly();
    chatMessages: Signal<ChatMessage[]> = this.chatService.chatMessages.asReadonly();
    journalMessages: Signal<JournalMessage[]> = this.chatService.journalMessages.asReadonly();

    constructor(
        public statsService: StatsService,
        public chatService: ChatService,
        private socketService: SocketClientService,
    ) {}
    ngOnInit() {
        this.socketService.send(RoomEvent.VerifyRoom, Room.Stats);
    }
    handleQuit() {
        this.isQuitPopupVisible = true;
    }

    closeQuitPopup(confirm: boolean) {
        this.isQuitPopupVisible = false;
        if (confirm) {
            this.statsService.disconnect();
        }
    }
}

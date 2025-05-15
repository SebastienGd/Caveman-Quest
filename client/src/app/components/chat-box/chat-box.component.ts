/* eslint-disable @typescript-eslint/member-ordering */
import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@common/interfaces/chat-message';
import { JournalMessage } from '@common/interfaces/journal-message';
import { Player } from '@common/interfaces/player';

@Component({
    selector: 'app-chat-box',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './chat-box.component.html',
    styleUrls: ['./chat-box.component.scss'],
})
export class ChatBoxComponent implements AfterViewChecked {
    @Input() currentPlayer!: Player;
    @Input() messages: ChatMessage[] = [];
    @Input() logs: JournalMessage[] = [];
    @Output() sendChatMessage = new EventEmitter<{ author: string; content: string }>();

    @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

    showMessages = true;
    messageContent = '';
    filterLogs = false;
    private messageSize = 0;

    toggleLogFilter(): void {
        this.filterLogs = !this.filterLogs;
    }

    get filteredLogs(): JournalMessage[] {
        if (this.filterLogs && this.currentPlayer?.name) {
            return this.logs.filter((log) => log.players.includes(this.currentPlayer.name));
        }
        return this.logs;
    }

    ngAfterViewChecked(): void {
        if (this.messageSize !== this.messages.length) {
            this.messageSize = this.messages.length;
            this.scrollToBottom();
        }
    }

    toggleView(showMessages: boolean): void {
        this.showMessages = showMessages;
    }

    handleSendMessage(): void {
        const trimmed = this.messageContent.trim();
        if (trimmed.length === 0) return;

        this.sendChatMessage.emit({
            author: this.currentPlayer.name,
            content: trimmed,
        });
        this.messageContent = '';
    }

    handleInputKeydown(event: KeyboardEvent): void {
        event.stopPropagation();
        if (event.key === 'Enter') {
            this.handleSendMessage();
        }
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            const el = this.messagesContainer.nativeElement;
            el.scrollTop = el.scrollHeight;
        }
    }
}

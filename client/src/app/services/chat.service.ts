import { Injectable, signal, WritableSignal } from '@angular/core';
import { RoomEvent } from '@common/constants/room-events';
import { ChatMessage } from '@common/interfaces/chat-message';
import { JournalMessage } from '@common/interfaces/journal-message';
import { SocketClientService } from './socket-client.service';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    readonly chatMessages: WritableSignal<ChatMessage[]> = signal([]);
    readonly journalMessages: WritableSignal<JournalMessage[]> = signal([]);

    constructor(private socketClientService: SocketClientService) {
        this.configureRoutesToServerSocket();
    }

    sendMessage(message: { author: string; content: string }) {
        this.socketClientService.send(RoomEvent.ChatMessage, message);
    }

    private configureRoutesToServerSocket(): void {
        this.socketClientService.on(RoomEvent.ChatMessage, (messages: ChatMessage[]) => {
            this.chatMessages.set(messages);
        });

        this.socketClientService.on(RoomEvent.JournalMessage, (message: JournalMessage) => {
            const currentMessages = this.journalMessages();
            this.journalMessages.set([...currentMessages, message]);
        });

        this.socketClientService.on(RoomEvent.ClearJournal, () => {
            this.journalMessages.set([]);
        });
    }
}

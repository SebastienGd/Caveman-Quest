import { TestBed } from '@angular/core/testing';
import { RoomEvent } from '@common/constants/room-events';
import { ChatMessage } from '@common/interfaces/chat-message';
import { JournalMessage } from '@common/interfaces/journal-message';
import { ChatService } from './chat.service';
import { SocketClientService } from './socket-client.service';

describe('ChatService', () => {
    let service: ChatService;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;

    beforeEach(() => {
        mockSocketClientService = jasmine.createSpyObj('SocketClientService', ['send', 'on']);

        TestBed.configureTestingModule({
            providers: [ChatService, { provide: SocketClientService, useValue: mockSocketClientService }],
        });

        service = TestBed.inject(ChatService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize with empty chat and journal messages', () => {
        expect(service.chatMessages()).toEqual([]);
        expect(service.journalMessages()).toEqual([]);
    });

    it('should set up socket listeners on creation', () => {
        expect(mockSocketClientService.on).toHaveBeenCalledWith(RoomEvent.ChatMessage, jasmine.any(Function));
        expect(mockSocketClientService.on).toHaveBeenCalledWith(RoomEvent.JournalMessage, jasmine.any(Function));
        expect(mockSocketClientService.on).toHaveBeenCalledWith(RoomEvent.ClearJournal, jasmine.any(Function));
    });

    describe('sendMessage', () => {
        it('should send message through socket', () => {
            const testMessage = { author: 'Test', content: 'Hello' };
            service.sendMessage(testMessage);
            expect(mockSocketClientService.send).toHaveBeenCalledWith(RoomEvent.ChatMessage, testMessage);
        });
    });

    describe('socket event handling', () => {
        it('should update chatMessages when receiving ChatMessage event', () => {
            const testMessages: ChatMessage[] = [
                {
                    author: 'Test',
                    content: 'Message 1',
                    timestamp: new Date().toISOString(),
                },
                {
                    author: 'Test',
                    content: 'Message 2',
                    timestamp: new Date().toISOString(),
                },
            ];

            const chatCallback = mockSocketClientService.on.calls.argsFor(0)[1];
            chatCallback(testMessages);

            expect(service.chatMessages()).toEqual(testMessages);
        });

        it('should add a journal message when receiving JournalMessage event', () => {
            const journalCallback = mockSocketClientService.on.calls.argsFor(1)[1];

            service.journalMessages.set([{ content: 'old', players: ['p1'] }]);

            const newMessage: JournalMessage = { content: 'new', players: ['p2'] };
            journalCallback(newMessage);

            expect(service.journalMessages()).toEqual([
                { content: 'old', players: ['p1'] },
                { content: 'new', players: ['p2'] },
            ]);
        });

        it('should clear journalMessages when receiving ClearJournal event', () => {
            const clearJournalCallback = mockSocketClientService.on.calls.argsFor(2)[1];

            service.journalMessages.set([
                { content: 'old1', players: ['p1'] },
                { content: 'old2', players: ['p2'] },
            ]);

            clearJournalCallback(undefined);

            expect(service.journalMessages()).toEqual([]);
        });
    });
});

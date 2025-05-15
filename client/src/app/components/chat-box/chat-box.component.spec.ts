/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@common/interfaces/chat-message';
import { JournalMessage } from '@common/interfaces/journal-message';
import { Dice, Player, PlayerData } from '@common/interfaces/player';
import { ChatBoxComponent } from './chat-box.component';

describe('ChatBoxComponent', () => {
    let component: ChatBoxComponent;
    let fixture: ComponentFixture<ChatBoxComponent>;

    const mockPlayer: Player = {
        id: 'player-1',
        name: 'Alice',
        avatar: 'avatar.png',
        data: [PlayerData.Regular, PlayerData.BlueTeam],
        movesLeft: 3,
        diceResult: 4,
        actionsLeft: 2,
        attributes: {
            currentHealth: 90,
            health: 100,
            speed: 5,
            attack: {
                value: 10,
                dice: Dice.Dice6,
            },
            defense: {
                value: 5,
                dice: Dice.Dice4,
            },
        },
        stats: {
            victories: 1,
            defeats: 2,
            evasions: 0,
            combat: 3,
            lostHP: 20,
            damageDone: 50,
            nbrOfPickedUpObjects: 5,
            tilesVisitedPercentage: 80,
        },
        inventory: [],
    };

    const mockMessages: ChatMessage[] = [
        { author: 'Bob', timestamp: '2024-01-01T12:00:00Z', content: 'Hello' },
        { author: 'Alice', timestamp: '2024-01-01T12:01:00Z', content: 'Hi' },
    ];

    const mockLogs: JournalMessage[] = [
        { content: 'Alice a lancé les dés', players: ['Alice'] },
        { content: 'Bob a déplacé son pion', players: ['Bob'] },
        { content: 'Alice a attaqué', players: ['Alice'] },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FormsModule, ChatBoxComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatBoxComponent);
        component = fixture.componentInstance;
        component.currentPlayer = { ...mockPlayer };
        component.messages = [...mockMessages];
        component.logs = [...mockLogs];

        const div = document.createElement('div');
        Object.defineProperty(div, 'scrollTop', {
            value: 0,
            writable: true,
        });
        Object.defineProperty(div, 'scrollHeight', {
            value: 500,
        });

        component.messagesContainer = new ElementRef(div);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle view correctly', () => {
        component.toggleView(false);
        expect(component.showMessages).toBeFalse();
        component.toggleView(true);
        expect(component.showMessages).toBeTrue();
    });

    it('should not emit message if input is empty or whitespace', () => {
        spyOn(component.sendChatMessage, 'emit');
        component.messageContent = '   ';
        component.handleSendMessage();
        expect(component.sendChatMessage.emit).not.toHaveBeenCalled();
    });

    it('should emit message and reset input when valid message is provided', () => {
        spyOn(component.sendChatMessage, 'emit');
        component.messageContent = 'Salut !';
        component.handleSendMessage();
        expect(component.sendChatMessage.emit).toHaveBeenCalledWith({
            author: 'Alice',
            content: 'Salut !',
        });
        expect(component.messageContent).toBe('');
    });

    it('should call handleSendMessage on Enter keydown', () => {
        spyOn(component, 'handleSendMessage');
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        spyOn(event, 'stopPropagation');
        component.handleInputKeydown(event);
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.handleSendMessage).toHaveBeenCalled();
    });

    it('should stop propagation on other keydown', () => {
        const event = new KeyboardEvent('keydown', { key: 'a' });
        spyOn(event, 'stopPropagation');
        component.handleInputKeydown(event);
        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should scroll to bottom after view is checked', () => {
        const scrollEl = {
            scrollTop: 0,
            scrollHeight: 268,
        } as HTMLDivElement;
        component.messages = [{} as ChatMessage];
        component.messagesContainer = new ElementRef(scrollEl);
        component.ngAfterViewChecked();

        expect(scrollEl.scrollTop).toBe(268);
    });

    describe('filterLogs functionality', () => {
        it('should toggle filterLogs flag', () => {
            expect(component.filterLogs).toBeFalse();
            component.toggleLogFilter();
            expect(component.filterLogs).toBeTrue();
            component.toggleLogFilter();
            expect(component.filterLogs).toBeFalse();
        });

        it('should filter logs when enabled', () => {
            component.filterLogs = true;
            const filtered = component.filteredLogs;
            expect(filtered).toEqual([
                { content: 'Alice a lancé les dés', players: ['Alice'] },
                { content: 'Alice a attaqué', players: ['Alice'] },
            ]);
        });

        it('should return all logs when filter is disabled', () => {
            component.filterLogs = false;
            expect(component.filteredLogs).toEqual(mockLogs);
        });

        it('should handle missing player name gracefully', () => {
            component.currentPlayer.name = '';
            component.filterLogs = true;
            expect(component.filteredLogs).toEqual(mockLogs);
        });
    });

    describe('scrollToBottom edge cases', () => {
        it('should handle missing messages container', () => {
            component.messagesContainer = null as unknown as ElementRef<HTMLDivElement>;
            expect(() => component.ngAfterViewChecked()).not.toThrow();
        });
    });

    describe('UI interactions', () => {
        beforeEach(() => {
            component.showMessages = false;
            component.currentPlayer = { ...mockPlayer, name: 'Alice' };
            component.logs = [...mockLogs];
            component.filterLogs = true;
            fixture.detectChanges();
        });

        it('should display filtered logs in template when filter active', () => {
            const logEntries = fixture.nativeElement.querySelectorAll('[data-testid="log-entry"]');
            expect(logEntries.length).toBe(2);
            expect(logEntries[0].textContent?.trim()).toBe('Alice a lancé les dés');
            expect(logEntries[1].textContent?.trim()).toBe('Alice a attaqué');
        });

        it('should update button text when filter active', () => {
            let button = fixture.nativeElement.querySelector('[data-testid="filter-button"]');
            expect(button?.textContent?.trim()).toBe('Tout voir');

            component.filterLogs = false;
            fixture.detectChanges();
            button = fixture.nativeElement.querySelector('[data-testid="filter-button"]');
            expect(button?.textContent?.trim()).toBe('Filtrer Alice');
        });
    });
});

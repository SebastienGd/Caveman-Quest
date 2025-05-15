/* eslint-disable @typescript-eslint/no-explicit-any */
import { Signal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatService } from '@app/services/chat.service';
import { StatsService } from '@app/services/stats.service';
import { ChatMessage } from '@common/interfaces/chat-message';
import { GameBase } from '@common/interfaces/game';
import { JournalMessage } from '@common/interfaces/journal-message';
import { StatsPageComponent } from './stats-page.component';

class MockStatsService {
    localGame: Signal<GameBase> = signal({
        code: 'test-code',
        map: {} as any,
        players: [] as any,
        data: {} as any,
        stats: {} as any,
    });
    disconnect = jasmine.createSpy('disconnect');
}

class MockChatService {
    chatMessages: Signal<ChatMessage[]> = signal([
        {
            author: 'User',
            timestamp: '2024-04-27T12:00:00Z',
            content: 'Hello',
        },
    ]);

    journalMessages: Signal<JournalMessage[]> = signal([
        { content: 'Entry 1', players: ['Player1'] },
        { content: 'Entry 2', players: ['Player2'] },
    ]);
}

describe('StatsPageComponent', () => {
    let component: StatsPageComponent;
    let fixture: ComponentFixture<StatsPageComponent>;
    let statsService: MockStatsService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StatsPageComponent],
            providers: [
                { provide: StatsService, useClass: MockStatsService },
                { provide: ChatService, useClass: MockChatService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(StatsPageComponent);
        component = fixture.componentInstance;
        statsService = TestBed.inject(StatsService) as unknown as MockStatsService;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should expose signals from services', () => {
        expect(component.game().code).toEqual('test-code');
        expect(component.chatMessages().length).toBeGreaterThan(0);
        expect(component.journalMessages()).toContain(jasmine.objectContaining({ content: 'Entry 1' }));
    });

    it('should set isQuitPopupVisible to true on handleQuit()', () => {
        component.isQuitPopupVisible = false;
        component.handleQuit();
        expect(component.isQuitPopupVisible).toBeTrue();
    });

    it('should close the quit popup without calling disconnect if confirm is false', () => {
        component.isQuitPopupVisible = true;
        component.closeQuitPopup(false);
        expect(component.isQuitPopupVisible).toBeFalse();
        expect(statsService.disconnect).not.toHaveBeenCalled();
    });

    it('should close the quit popup and call disconnect if confirm is true', () => {
        component.isQuitPopupVisible = true;
        component.closeQuitPopup(true);
        expect(component.isQuitPopupVisible).toBeFalse();
        expect(statsService.disconnect).toHaveBeenCalled();
    });
});

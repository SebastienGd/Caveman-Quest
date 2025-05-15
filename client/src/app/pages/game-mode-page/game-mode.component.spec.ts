import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { GameModeComponent } from './game-mode.component';

@Component({ template: '' })
class AdminStubComponent {}

@Component({ template: '' })
class GameSizeStubComponent {}

describe('GameModeComponent', () => {
    let component: GameModeComponent;
    let fixture: ComponentFixture<GameModeComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameModeComponent, ButtonComponent],
            providers: [
                provideRouter([
                    { path: 'admin', component: AdminStubComponent },
                    { path: 'game-size', component: GameSizeStubComponent },
                ]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameModeComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should navigate to admin when handleBackClick is called', () => {
        const navigateSpy = spyOn(router, 'navigate');
        component.handleBackClick();
        expect(navigateSpy).toHaveBeenCalledWith(['admin']);
    });

    it('should navigate to game-size with mode query param', () => {
        const navigateSpy = spyOn(router, 'navigate');
        const testMode = 'testMode';
        component.handleGameModeClick(testMode);
        expect(navigateSpy).toHaveBeenCalledWith(['game-size'], { queryParams: { mode: testMode } });
    });

    const modes = ['classic', 'special', 'arcade'];
    modes.forEach((mode) => {
        it(`should handle ${mode} mode correctly`, () => {
            const navigateSpy = spyOn(router, 'navigate');
            component.handleGameModeClick(mode);
            expect(navigateSpy).toHaveBeenCalledWith(['game-size'], { queryParams: { mode } });
        });
    });
});

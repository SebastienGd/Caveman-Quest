import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { of } from 'rxjs';
import { GameSizePageComponent } from './game-size-page.component';

@Component({ template: '' })
class GameModeStubComponent {}
@Component({ template: '' })
class EditGameStubComponent {}

describe('GameSizePageComponent', () => {
    let component: GameSizePageComponent;
    let fixture: ComponentFixture<GameSizePageComponent>;
    let router: Router;

    const mockActivatedRoute = {
        queryParams: of({ mode: 'testMode' }),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameSizePageComponent, ButtonComponent],
            providers: [
                provideRouter([
                    { path: 'game-mode', component: GameModeStubComponent },
                    { path: 'edit-game', component: EditGameStubComponent },
                ]),
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameSizePageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with mode from query params', () => {
        expect(component['mode']).toBe('testMode');
    });

    it('should handle back click navigation', () => {
        const navigateSpy = spyOn(router, 'navigate');
        component.handleBackClick();
        expect(navigateSpy).toHaveBeenCalledWith(['game-mode']);
    });

    it('should navigate to edit-game with correct params on map size selection', () => {
        const navigateSpy = spyOn(router, 'navigate');
        const testSize = 2;

        component.handleMapSizeClick(testSize);

        expect(navigateSpy).toHaveBeenCalledWith(['edit-game'], { queryParams: { size: testSize, mode: 'testMode' } });
    });

    describe('Query params handling', () => {
        const testModes = ['classic', 'time', 'survival'];

        testModes.forEach((mode) => {
            it(`should handle ${mode} mode correctly`, () => {
                const localMockRoute = {
                    queryParams: of({ mode }),
                };

                TestBed.resetTestingModule();

                TestBed.configureTestingModule({
                    imports: [GameSizePageComponent, ButtonComponent],
                    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: localMockRoute }],
                }).compileComponents();

                const localFixture = TestBed.createComponent(GameSizePageComponent);
                const localComponent = localFixture.componentInstance;
                localFixture.detectChanges();

                expect(localComponent['mode']).toBe(mode);
            });
        });
    });
});

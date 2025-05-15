import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameInformationComponent } from './game-information.component';

describe('GameInformationComponent', () => {
    let component: GameInformationComponent;
    let fixture: ComponentFixture<GameInformationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameInformationComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameInformationComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display gameName correctly', () => {
        component.gameName = 'RPG Test';
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.title')?.textContent).toContain('RPG Test');
    });

    it('should display mapSize correctly', () => {
        component.mapSize = '15x15';
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.map-size')?.textContent).toContain('15x15');
    });

    it('should display playerCount correctly', () => {
        component.playerCount = 4;
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.players')?.textContent).toContain('4');
    });

    it('should display debugging status as "Activé" when debugging is true', () => {
        component.debugging = true;
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.debugging')?.textContent).toContain('Activé');
    });

    it('should display debugging status as "Désactivé" when debugging is false', () => {
        component.debugging = false;
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.debugging')?.textContent).toContain('Désactivé');
    });

    it('should apply "active" class when debugging is true', () => {
        component.debugging = true;
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.debugging')?.classList).toContain('active');
    });

    it('should not apply "active" class when debugging is false', () => {
        component.debugging = false;
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.debugging')?.classList).not.toContain('active');
    });
});

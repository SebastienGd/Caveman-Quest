import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';
import { ColorService } from '@app/services/color.service';

describe('ButtonComponent', () => {
    let component: ButtonComponent;
    let fixture: ComponentFixture<ButtonComponent>;
    let colorService: ColorService;
    const DARKEN_AMOUNT = 20;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ButtonComponent],
            providers: [ColorService],
        }).compileComponents();

        fixture = TestBed.createComponent(ButtonComponent);
        component = fixture.componentInstance;
        colorService = TestBed.inject(ColorService);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default input values', () => {
        expect(component.color).toBe('#4d7330');
        expect(component.fullWidth).toBe(false);
        expect(component.disableElevation).toBe(false);
        expect(component.size).toBe('medium');
        expect(component.hoverEffect).toBe('translate');
    });

    it('should toggle hover state correctly with the onHover method', () => {
        component.onHover(true);
        expect(component.isHovering).toBe(true);
        component.onHover(false);
        expect(component.isHovering).toBe(false);
    });

    it('should apply correct classes based on inputs', () => {
        component.fullWidth = true;
        component.disableElevation = true;
        component.size = 'large';
        fixture.detectChanges();

        const buttonElement: HTMLElement = fixture.nativeElement.querySelector('button');

        expect(buttonElement.classList).toContain('full-width');
        expect(buttonElement.classList).toContain('disable-elevation');
        expect(buttonElement.classList).toContain('btn-large');
    });

    it('should darken color on hover when hoverEffect is "changeColor"', () => {
        spyOn(colorService, 'darkenColor').and.returnValue('#123456');

        component.color = '#ff0000';
        component.hoverEffect = 'changeColor';
        component.onHover(true);
        fixture.detectChanges();

        const buttonElement: HTMLElement = fixture.nativeElement.querySelector('button');
        expect(colorService.darkenColor).toHaveBeenCalledWith('#ff0000', DARKEN_AMOUNT);
        expect(buttonElement.style.backgroundColor).toBe('rgb(18, 52, 86)');
    });

    it('should apply "translate-hover-effect" class when hoverEffect is "translate"', () => {
        component.hoverEffect = 'translate';
        fixture.detectChanges();

        const buttonElement: HTMLElement = fixture.nativeElement.querySelector('button');
        expect(buttonElement.classList).toContain('translate-hover-effect');
    });
});

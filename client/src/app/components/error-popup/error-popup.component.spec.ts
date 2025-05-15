import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ErrorPopupComponent } from './error-popup.component';

describe('ErrorPopupComponent', () => {
    let component: ErrorPopupComponent;
    let fixture: ComponentFixture<ErrorPopupComponent>;
    const NB_ERRORS = 3;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ErrorPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ErrorPopupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should display error messages when provided', () => {
        component.errors = ['Error 1', 'Error 2', 'Error 3'];
        fixture.detectChanges();

        const errorElements = fixture.nativeElement.querySelectorAll('li');
        expect(errorElements.length).toBe(NB_ERRORS);
        expect(errorElements[0].textContent).toContain('Error 1');
        expect(errorElements[1].textContent).toContain('Error 2');
        expect(errorElements[2].textContent).toContain('Error 3');
    });

    it('should not render popup when errors array is empty', () => {
        component.errors = [];
        fixture.detectChanges();

        const popupElement = fixture.nativeElement.querySelector('.popup-overlay');
        expect(popupElement).toBeNull();
    });

    it('should emit popupClosed event when close button is clicked', () => {
        spyOn(component.popupClose, 'emit');

        component.errors = ['Some error'];
        fixture.detectChanges();

        const closeButton = fixture.debugElement.query(By.css('app-button'));
        closeButton.triggerEventHandler('click', null);

        expect(component.popupClose.emit).toHaveBeenCalled();
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescriptionPopupComponent } from './description-popup.component';

describe('DescriptionPopupComponent', () => {
    let component: DescriptionPopupComponent;
    let fixture: ComponentFixture<DescriptionPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DescriptionPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DescriptionPopupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

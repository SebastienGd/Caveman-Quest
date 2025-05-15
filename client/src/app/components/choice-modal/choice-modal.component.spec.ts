import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoiceModalComponent } from './choice-modal.component';

describe('ChoiceModalComponent', () => {
    let component: ChoiceModalComponent;
    let fixture: ComponentFixture<ChoiceModalComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChoiceModalComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ChoiceModalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

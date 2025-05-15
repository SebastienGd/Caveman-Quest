import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { CreateGamePageComponent } from './create-game-page.component';

describe('CreateGamePageComponent', () => {
    let component: CreateGamePageComponent;
    let fixture: ComponentFixture<CreateGamePageComponent>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        await TestBed.configureTestingModule({
            imports: [CreateGamePageComponent],
            providers: [
                provideHttpClient(),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: of({ id: '123', size: '10', mode: 'Capture the Flag' }),
                    },
                },
                {
                    provide: Router,
                    useValue: mockRouter,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateGamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should navigate to home page when back button clicked', () => {
        component.handleBackClick();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
    });
});

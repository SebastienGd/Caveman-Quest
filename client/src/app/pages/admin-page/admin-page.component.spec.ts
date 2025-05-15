import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { AdminPageComponent } from './admin-page.component';
import SpyObj = jasmine.SpyObj;

@Component({
    selector: 'app-map-panel',
    template: '',
})
class MockMapPanelComponent {}

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let routerSpy: SpyObj<Router>;

    beforeEach(() => {
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            imports: [AdminPageComponent, MockMapPanelComponent],
            providers: [
                { provide: Router, useValue: routerSpy },
                { provide: ServerFetchService, useValue: {} },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should navigate to "/game-mode" when goToCreateGame is called', () => {
        component.goToCreateGame();
        fixture.detectChanges();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['game-mode']);
    });

    it('should navigate to "home" when goToHome is called', () => {
        component.goToHome();
        fixture.detectChanges();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['home']);
    });

    it('should create a MapPanelComponent', () => {
        const mapPanel = fixture.nativeElement.querySelector('app-map-panel');
        expect(mapPanel).toBeTruthy();
    });
});

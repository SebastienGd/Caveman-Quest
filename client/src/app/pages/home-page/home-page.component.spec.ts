import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { HomePageComponent } from './home-page.component';

const routes: Routes = [];

describe('HomePageComponent', () => {
    let component: HomePageComponent;
    let fixture: ComponentFixture<HomePageComponent>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HomePageComponent],
            providers: [provideRouter(routes)],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(HomePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it("should have as title 'La Guerre des Âges'", () => {
        expect(component.title).toEqual('La Guerre des Âges');
    });

    it("should have as team number 'Équipe #205'", () => {
        expect(component.teamNumber).toEqual('Équipe #205');
    });

    it('should have correct team members', () => {
        expect(component.teamMembers).toEqual([
            'Sarah Ait-Ali-Yahia',
            'Simon Asmar',
            'Jordan Filion',
            'Sébastien Girard',
            'Rami Medjdoubi',
            'Cerine Ouchene',
        ]);
    });
});

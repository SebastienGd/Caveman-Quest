import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { GameMode, Map } from '@common/interfaces/map';
import { of, throwError } from 'rxjs';
import { MapCardComponent } from './map-card.component';

@Component({
    selector: 'app-map',
    template: '',
})
class MockMapComponent {
    @Input() map!: Map;
}

describe('MapCardComponent', () => {
    let component: MapCardComponent;
    let fixture: ComponentFixture<MapCardComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockServerFetchService: jasmine.SpyObj<ServerFetchService>;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockServerFetchService = jasmine.createSpyObj('ServerFetchService', ['setMapVisibility', 'deleteMap']);

        mockServerFetchService.setMapVisibility.and.returnValue(of(undefined));
        mockServerFetchService.deleteMap.and.returnValue(of(undefined));

        await TestBed.configureTestingModule({
            imports: [MapCardComponent, MockMapComponent],
            providers: [{ provide: Router, useValue: mockRouter }, { provide: ServerFetchService, useValue: mockServerFetchService }, DatePipe],
        }).compileComponents();

        fixture = TestBed.createComponent(MapCardComponent);
        component = fixture.componentInstance;

        component.map = {
            _id: '123',
            name: 'Test Map',
            description: 'A sample map for testing',
            mode: GameMode.Ctf,
            size: 10,
            tiles: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            visibility: true,
        };

        fixture.autoDetectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle visibility and call the service', () => {
        const initialVisibility = component.map.visibility;
        component.toggleVisibility();

        expect(mockServerFetchService.setMapVisibility).toHaveBeenCalledWith(component.map._id, !initialVisibility);
        expect(component.map.visibility).toBe(!initialVisibility);
    });

    it('should navigate to edit-game when editMap is called', () => {
        component.editMap();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['edit-game'], { queryParams: { id: component.map._id } });
    });

    it('should show delete popup when toggleDeletePopup is called', () => {
        component.toggleDeletePopup();
        expect(component.showDeleteConfirmation).toBeTrue();
    });

    it('should call deleteMap and display error popup when confirmDelete is called on a deleted map', () => {
        spyOn(component.mapDeleted, 'emit');
        mockServerFetchService.deleteMap.and.returnValue(throwError(() => new HttpErrorResponse({ statusText: 'Not Found' })));
        component.confirmDelete();

        expect(mockServerFetchService.deleteMap).toHaveBeenCalledWith(component.map._id);
        expect(component.errorDeletedPopup).toBeTrue();
    });

    it('should call deleteMap and emit mapDeleted event when confirmDelete is called', () => {
        spyOn(component.mapDeleted, 'emit');
        component.confirmDelete();

        expect(mockServerFetchService.deleteMap).toHaveBeenCalledWith(component.map._id);
        expect(component.mapDeleted.emit).toHaveBeenCalled();
        expect(component.showDeleteConfirmation).toBeFalse();
    });
    it('should hide delete popup when cancelDelete is called', () => {
        component.toggleDeletePopup();
        component.cancelDelete();
        expect(component.showDeleteConfirmation).toBeFalse();
    });

    it('should change isHovered on mouse enter/leave', () => {
        expect(component.isHovered).toBeFalse();
        component.isHovered = true;
        expect(component.isHovered).toBeTrue();

        component.isHovered = false;
        expect(component.isHovered).toBeFalse();
    });

    it('should format date correctly', () => {
        const testDate = '2024-02-10T12:00:00Z';
        const expectedDate = new DatePipe('en-US').transform(testDate, 'MM/dd/yy, HH:mm') || '';
        expect(component.formatDate(testDate)).toEqual(expectedDate);

        spyOn(component['datePipe'], 'transform').and.returnValue(null);
        expect(component.formatDate('invalid-date')).toBe('');
    });
});

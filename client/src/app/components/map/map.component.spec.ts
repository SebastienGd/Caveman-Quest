import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameMode, TileBase, TileType } from '@common/interfaces/map';
import { MapComponent } from './map.component';

describe('MapComponent', () => {
    let component: MapComponent;
    let fixture: ComponentFixture<MapComponent>;
    let tile: TileBase;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MapComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(MapComponent);
        component = fixture.componentInstance;
        tile = { type: TileType.Base };

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

        spyOn(component.tileRightClick, 'emit');
        spyOn(component.tileLeftClick, 'emit');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should emit tileRightClick when triggered', () => {
        const event = new MouseEvent('mousedown', { buttons: 2 });

        component.tileClick(event, tile);

        expect(component.tileRightClick.emit).toHaveBeenCalledWith(tile);
    });

    it('should emit tileLeftClick when triggered', () => {
        const event = new MouseEvent('mousedown', { buttons: 1 });

        component.tileClick(event, tile);

        expect(component.tileLeftClick.emit).toHaveBeenCalledWith(tile);
    });
});

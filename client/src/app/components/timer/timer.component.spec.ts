import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerData } from '@common/interfaces/player';
import { Color } from 'src/utils/constants/color-constants';
import { TimerComponent } from './timer.component';

describe('TimerComponent', () => {
    let component: TimerComponent;
    let fixture: ComponentFixture<TimerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimerComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimerComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return Green when playerData includes ACTIVE', () => {
        component.playerData = [PlayerData.Active];
        expect(component.color).toBe(Color.Green);
    });

    it('should return Red when playerData includes COMBAT', () => {
        component.playerData = [PlayerData.Combat];
        expect(component.color).toBe(Color.Red);
    });

    it('should return Gray when playerData does not include ACTIVE or COMBAT', () => {
        component.playerData = [PlayerData.Transition];
        expect(component.color).toBe(Color.Gray);
    });
});

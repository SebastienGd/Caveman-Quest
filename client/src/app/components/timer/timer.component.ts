import { Component, Input } from '@angular/core';
import { PlayerData } from '@common/interfaces/player';
import { Color } from 'src/utils/constants/color-constants';

@Component({
    selector: 'app-timer',
    templateUrl: './timer.component.html',
    styleUrls: ['./timer.component.scss'],
})
export class TimerComponent {
    @Input() time: number = 0;
    @Input() playerData: PlayerData[] = [PlayerData.Transition];

    get color(): string {
        if (this.playerData.includes(PlayerData.Combat)) {
            return Color.Red;
        } else if (this.playerData.includes(PlayerData.Active)) {
            return Color.Green;
        }
        return Color.Gray;
    }
}

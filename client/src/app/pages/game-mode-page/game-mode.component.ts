import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { WebRoute } from '@common/constants/web-routes';

@Component({
    selector: 'app-game-mode',
    imports: [ButtonComponent],
    templateUrl: './game-mode.component.html',
    styleUrls: ['./game-mode.component.scss'],
    standalone: true,
})
export class GameModeComponent {
    constructor(private router: Router) {}

    handleBackClick() {
        this.router.navigate([WebRoute.Admin]);
    }

    handleGameModeClick(chosenMode: string) {
        this.router.navigate([WebRoute.GameSize], { queryParams: { mode: chosenMode } });
    }
}

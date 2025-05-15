import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { MapPanelComponent } from '@app/components/map-panel/map-panel.component';
import { WebRoute } from '@common/constants/web-routes';

@Component({
    selector: 'app-create-game-page',
    imports: [MapPanelComponent, ButtonComponent],
    templateUrl: './create-game-page.component.html',
    styleUrl: './create-game-page.component.scss',
})
export class CreateGamePageComponent {
    constructor(private router: Router) {}

    handleBackClick() {
        this.router.navigate([WebRoute.Home]);
    }
}

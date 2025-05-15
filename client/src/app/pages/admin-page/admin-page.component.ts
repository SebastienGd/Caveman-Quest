import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { MapPanelComponent } from '@app/components/map-panel/map-panel.component';
import { WebRoute } from '@common/constants/web-routes';

@Component({
    selector: 'app-admin-page',
    imports: [MapPanelComponent, ButtonComponent],
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
    constructor(private router: Router) {}

    goToCreateGame() {
        this.router.navigate([WebRoute.GameMode]);
    }

    goToHome() {
        this.router.navigate([WebRoute.Home]);
    }
}

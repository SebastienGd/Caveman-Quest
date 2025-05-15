import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { WebRoute } from '@common/constants/web-routes';
import { GameMode } from '@common/interfaces/map';

@Component({
    selector: 'app-game-size-page',
    imports: [ButtonComponent],
    templateUrl: './game-size-page.component.html',
    styleUrl: './game-size-page.component.scss',
})
export class GameSizePageComponent implements OnInit {
    private mode: GameMode;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
    ) {}

    ngOnInit() {
        this.route.queryParams.subscribe((params) => {
            this.mode = params['mode'];
        });
    }

    handleBackClick() {
        this.router.navigate([WebRoute.GameMode]);
    }

    handleMapSizeClick(chosenSize: number) {
        this.router.navigate([WebRoute.EditGame], { queryParams: { size: chosenSize, mode: this.mode } });
    }
}

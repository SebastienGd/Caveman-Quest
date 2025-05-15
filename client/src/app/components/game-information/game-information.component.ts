import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-game-information',
    templateUrl: './game-information.component.html',
    styleUrl: './game-information.component.scss',
})
export class GameInformationComponent {
    @Input() gameName!: string;
    @Input() mapSize!: string;
    @Input() playerCount!: number;
    @Input() debugging!: boolean;

    get debugStatus(): string {
        return this.debugging ? 'Activé' : 'Désactivé';
    }
}

import { Component, Input } from '@angular/core';
import { DescriptionPopupComponent } from '@app/components/description-popup/description-popup.component';
import { Player } from '@common/interfaces/player';
import { TYPE_TO_DESCRIPTION } from 'src/utils/constants/description-constants';

@Component({
    selector: 'app-player-information',
    imports: [DescriptionPopupComponent],
    templateUrl: './player-information.component.html',
    styleUrl: './player-information.component.scss',
})
export class PlayerInformationComponent {
    @Input() player: Player;

    typeToDescription = TYPE_TO_DESCRIPTION; // to use in the html
}

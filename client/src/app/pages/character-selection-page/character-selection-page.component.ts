import { NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { ChoiceModalComponent } from '@app/components/choice-modal/choice-modal.component';
import { DescriptionPopupComponent } from '@app/components/description-popup/description-popup.component';
import { CharacterService } from '@app/services/character.service';
import { WaitingRoomService } from '@app/services/waiting-room.service';
import { WebRoute } from '@common/constants/web-routes';
import { AttributeName, Dice } from '@common/interfaces/player';
import { Subject, takeUntil } from 'rxjs';
import { AVATARS } from '@common/constants/avatars';
import { TYPE_TO_DESCRIPTION } from 'src/utils/constants/description-constants';

type Tab = 'profile' | 'bonus';

@Component({
    selector: 'app-character-selection-page',
    templateUrl: './character-selection-page.component.html',
    styleUrls: ['./character-selection-page.component.scss'],
    imports: [FormsModule, NgClass, ButtonComponent, DescriptionPopupComponent, ChoiceModalComponent],
})
export class CharacterSelectionPageComponent implements OnInit, OnDestroy {
    typeToDescription = TYPE_TO_DESCRIPTION; // to use in the html
    avatars = AVATARS; // to use in the html
    attributeNames = Object.values(AttributeName);
    dice = Dice;

    showNameError: boolean;
    showAttributeError: boolean;
    showDiceError: boolean;
    showAvatarError: boolean;

    selectedTab = 'profile';
    isPlusVisible = true;
    private ngUnsubscribe = new Subject<void>();

    constructor(
        private router: Router,
        public characterService: CharacterService,
        public waitingRoomService: WaitingRoomService,
        private route: ActivatedRoute,
    ) {}

    ngOnInit() {
        this.showNameError = false;
        this.showAttributeError = false;
        this.showDiceError = false;
        this.showAvatarError = false;
        this.waitingRoomService.resetRoomStatus();
        this.route.queryParams.pipe(takeUntil(this.ngUnsubscribe)).subscribe((params) => {
            this.characterService.resetCharacterRoom(params['id']);
        });
    }

    selectTab(tab: Tab): void {
        this.selectedTab = tab;
    }

    updateAttributesUI(attributeName: AttributeName.Health | AttributeName.Speed, value: number) {
        this.characterService.updateAttributeBonus(attributeName, value);
        this.isPlusVisible = value < 0;
    }

    isAvatarChosen(avatar: string) {
        return this.waitingRoomService.waitingRoom && Object.values(this.waitingRoomService.waitingRoom.selectedAvatars).includes(avatar);
    }

    handleContinueClick() {
        const attributesAreValid = this.characterService.areAttributesBonusValid();
        const diceAreValid = this.characterService.areAttributesDiceValid();
        if (!this.characterService.selectedAvatar) {
            this.showAvatarError = true;
            this.selectTab('profile');
            return;
        } else if (!this.characterService.name.trim()) {
            this.showNameError = true;
            this.selectTab('profile');
        } else if (!attributesAreValid) {
            this.showAttributeError = this.selectedTab === 'bonus';
            this.selectTab('bonus');
        } else if (!diceAreValid) {
            this.showDiceError = this.selectedTab === 'bonus';
            this.selectTab('bonus');
        } else {
            this.characterService.joinWaitingRoom();
        }
    }

    handleBackClick(): void {
        this.characterService.quit();
        this.router.navigate([WebRoute.CreateGame]);
    }

    handleHomeButton() {
        this.router.navigate([WebRoute.Home]);
        this.characterService.quit();
    }

    handleRetry() {
        this.characterService.joinWaitingRoom();
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
        this.ngUnsubscribe.unsubscribe();
    }
}

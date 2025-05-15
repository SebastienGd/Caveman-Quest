import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-description-popup',
    templateUrl: './description-popup.component.html',
    styleUrls: ['./description-popup.component.scss'],
    imports: [CommonModule],
})
export class DescriptionPopupComponent {
    @Input() direction: 'north' | 'south' | 'east' | 'west' = 'north';
    @Input() content: string;
    isVisible: boolean = false;
}

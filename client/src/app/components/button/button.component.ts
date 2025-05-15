import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ColorService } from '@app/services/color.service';

@Component({
    selector: 'app-button',
    imports: [CommonModule],
    templateUrl: './button.component.html',
    styleUrl: './button.component.scss',
})
export class ButtonComponent {
    @Input() color: string = '#4d7330';
    @Input() fullWidth?: boolean = false;
    @Input() disableElevation?: boolean = false;
    @Input() size: 'small' | 'medium' | 'large' = 'medium';
    @Input() hoverEffect?: 'translate' | 'changeColor' = 'translate';
    @Input() isDisabled?: boolean = false;
    isHovering = false;

    constructor(public colorService: ColorService) {}

    onHover(state: boolean): void {
        this.isHovering = state;
    }
}

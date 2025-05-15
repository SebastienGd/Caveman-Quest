import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '@app/components/button/button.component';

@Component({
    selector: 'app-choice-modal',
    imports: [ButtonComponent],
    templateUrl: './choice-modal.component.html',
    styleUrl: './choice-modal.component.scss',
})
export class ChoiceModalComponent {
    @Input() message: string = '';
    @Input() firstOption: string = '';
    @Input() secondOption: string = '';
    @Output() firstAction = new EventEmitter();
    @Output() secondAction = new EventEmitter();
}

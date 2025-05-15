import { animate, group, query, style, transition, trigger } from '@angular/animations';

export const routeAnimation = trigger('routeAnimations', [
    transition('* <=> *', [
        query(
            ':enter, :leave',
            [
                style({
                    position: 'absolute',
                    width: '100%',
                    top: 0,
                    left: 0,
                }),
            ],
            { optional: true },
        ),

        group([
            query(':leave', [style({ opacity: 1 }), animate('400ms ease-in-out', style({ opacity: 0 }))], { optional: true }),
            query(':enter', [style({ opacity: 0 }), animate('100ms 100ms ease-in-out', style({ opacity: 1 }))], { optional: true }),
        ]),
    ]),
]);

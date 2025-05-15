import { TestBed } from '@angular/core/testing';

import { colorConstants } from 'src/utils/constants/color-constants';
import { ColorService } from './color.service';

describe('ColorService', () => {
    let service: ColorService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ColorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should darken color correctly without a pound sign', () => {
        const darkenedColor = service.darkenColor('ffffff', colorConstants.darkenAmount);
        expect(darkenedColor).toBe('ebebeb');
    });

    it('should darken color correctly with a pound sign', () => {
        const darkenedColor = service.darkenColor('#ffffff', colorConstants.darkenAmount);
        expect(darkenedColor).toBe('#ebebeb');
    });

    it('should not darken below 0', () => {
        const darkenedColor = service.darkenColor('000000', colorConstants.darkenAmount);
        expect(darkenedColor).toBe('000000');
    });

    it('should handle darkening for red, green, and blue separately', () => {
        const darkenedRed = service.darkenColor('ff0000', colorConstants.darkenAmount);
        expect(darkenedRed).toBe('eb0000');

        const darkenedGreen = service.darkenColor('00ff00', colorConstants.darkenAmount);
        expect(darkenedGreen).toBe('00eb00');

        const darkenedBlue = service.darkenColor('0000ff', colorConstants.darkenAmount);
        expect(darkenedBlue).toBe('0000eb');
    });

    it('should return the same color if the amount is 0', () => {
        const color = 'ff0000';
        const darkenedColor = service.darkenColor(color, 0);
        expect(darkenedColor).toBe(color);
    });
});

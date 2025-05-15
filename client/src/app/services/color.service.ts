import { Injectable } from '@angular/core';
import { colorConstants } from 'src/utils/constants/color-constants';

@Injectable({
    providedIn: 'root',
})
export class ColorService {
    darkenColor(color: string, amount: number): string {
        let usePound = false;

        if (color[0] === '#') {
            color = color.slice(1);
            usePound = true;
        }

        let r = parseInt(color.substring(0, colorConstants.twoHexDigits), colorConstants.hexBase);
        let g = parseInt(color.substring(colorConstants.twoHexDigits, 2 * colorConstants.twoHexDigits), colorConstants.hexBase);
        let b = parseInt(color.substring(2 * colorConstants.twoHexDigits, colorConstants.colorHexLength), colorConstants.hexBase);

        r = Math.max(colorConstants.minColorValue, r - amount);
        g = Math.max(colorConstants.minColorValue, g - amount);
        b = Math.max(colorConstants.minColorValue, b - amount);

        const darkenedColor =
            (usePound ? '#' : '') +
            r.toString(colorConstants.hexBase).padStart(colorConstants.twoHexDigits, '0') +
            g.toString(colorConstants.hexBase).padStart(colorConstants.twoHexDigits, '0') +
            b.toString(colorConstants.hexBase).padStart(colorConstants.twoHexDigits, '0');

        return darkenedColor;
    }
}

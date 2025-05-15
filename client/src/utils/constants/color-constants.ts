export const colorConstants = {
    hexBase: 16,
    colorHexLength: 6,
    minColorValue: 0,
    colorAmount: 20,
    twoHexDigits: 2,
    darkenAmount: 20,
} as const;
export enum Color {
    Red = 'red',
    Green = 'green',
    Gray = 'gray',
}

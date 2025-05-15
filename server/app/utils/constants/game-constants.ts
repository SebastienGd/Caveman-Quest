export const COMBAT_CONSTANTS = {
    dice4Value: 4,
    dice6Value: 6,
    victoryToWin: 3,
    combatRoundDuration: 5,
    shortCombatRoundDuration: 3,
    threeTenths: 0.3,
    penalty: -2,
    diceRoll4: 3,
    diceRoll6: 5,
} as const;
export enum GameConstants {
    TimerTickMs = 1000,
    RoundDuration = 30,
    TransitionDurationMs = 3000,
    TransitionDurationSeconds = 3,
    MoveDurationMs = 150,
    Percent = 100,
    Second = 1000,
}

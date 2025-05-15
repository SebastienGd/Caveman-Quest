export enum CombatEvent {
    SuccessfulAttack = 'successfulAttack',
    UnsuccessfulAttack = 'unsuccessfulAttack',
    SuccessfulEvade = 'successfulEvade',
    CombatEnd = 'combatEnd',
    CombatStart = 'combatStart',
    ChangeTurn = 'changeTurn',
    AttackResult = 'attackResult',
    EvadeResult = 'evadeResult',
    ProcessingCombatEnd = 'processingCombatEnd',
}

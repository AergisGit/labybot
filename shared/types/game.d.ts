
export interface TriggerDef {
    name: string;         // Nom du trigger
    type: TriggerType;    // Type : "Zone" ou "Coord"
    x1: number;          // Première coordonnée X
    y1: number;          // Première coordonnée Y
    x2?: number;         // Deuxième coordonnée X (optionnel pour Zone)
    y2?: number;         // Deuxième coordonnée Y (optionnel pour Zone)
    actions?: ActionType[];  // Action à effectuer
    effect?: string;     // Effet associé (optionnel)
    message?: string;    // Message affiché (optionnel)
    link?: string;       // Lien supplémentaire (optionnel)
}

export interface GameConf {
    game: string;
    gameName?: string;

    // State of the game
    gameRunning?: boolean;

    // For games like the laby, with triggers on a map
    triggerData?: TriggerDef;

    // For the casino
    casino?: any;
}


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

export interface GameInfosData {
  game: string;
  gameName: string;

  room?: API_Chatroom_Data;
  botDescription?: string[];

  map?: string;
  maps?: [{ name: string, map: string }]; // Pour les jeux avec plusieurs maps
  botPosition?: CoordObject;

  triggersData?: TriggerDef[];

  mongo_db?: string;
  casino?: CasinoConfig;
}

/**
 * Each record in the gamesList is a type of game
 *  and the value is an array of configured game names for that type of game.
 */
export type GamesList = Record<string, string[]>;
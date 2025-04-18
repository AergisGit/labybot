// Liste des événements à écouter depuis GameManager
export const GAME_EVENTS = [
    'serverInfo',
    'botInfos',
    'gamesList',
    // Ajoutez d'autres événements ici
] as const;

export type GameEvent = typeof GAME_EVENTS[number];
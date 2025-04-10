const BASE_URL = '/api';

// Fonction générique pour les requêtes fetch
const fetchAPI = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Erreur HTTP : ${response.status}`);
    }
    return response.json();
};

// Récupérer le statut du bot
export const fetchBotStatus = async () => {
    return fetchAPI(`${BASE_URL}/bot/0/status`);
};

// Démarrer le bot
export const startBot = async () => {
    return fetchAPI(`${BASE_URL}/bot/0/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: 0 }),
    });
};

// Arrêter le bot
export const stopBot = async () => {
    return fetchAPI(`${BASE_URL}/bot/0/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: 0 }),
    });
};

// Démarrer le jeu
export const startGame = async () => {
    return fetchAPI(`${BASE_URL}/game/0/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: 0 }),
    });
};

// Arrêter le jeu
export const stopGame = async () => {
    return fetchAPI(`${BASE_URL}/game/0/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: 0 }),
    });
};

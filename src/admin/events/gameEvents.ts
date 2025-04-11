import { Socket } from 'socket.io';
import { GameManager } from '../../core/gameManager';

export const registerGameEvents = (socket: Socket, gameManager: GameManager) => {
    socket.on('getGameConfig', () => {
        const data = gameManager.getGameConfig(0); // Exemple avec botId = 0
        socket.emit('gameConfig', data);
    });

    socket.on('startGame', async ({ botId }: { botId: number }) => {
        await gameManager.startGame(botId);
        socket.emit('gameStarted', { botId });
    });

    socket.on('stopGame', async ({ botId }: { botId: number }) => {
        await gameManager.stopGame(botId);
        socket.emit('gameStopped', { botId });
    });
};
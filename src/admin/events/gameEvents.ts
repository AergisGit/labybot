import { Socket } from 'socket.io';
import { GameManager } from '../../managers/gameManager';

export const registerGameEvents = (socket: Socket, gameManager: GameManager) => {
    socket.on('getGameInfos', () => {
        const data = gameManager.getGameInfos(0); // Exemple avec botId = 0
        socket.emit('getGameInfos', data);
    });

    socket.on('startGame', async ({ botId, game, gameName }: { botId: number, game?: string, gameName?: string }) => {
        await gameManager.startGame(botId, game, gameName);
        socket.emit('gameStarted', { botId });
    });

    socket.on('stopGame', async ({ botId }: { botId: number }) => {
        await gameManager.stopGame(botId);
        socket.emit('gameStopped', { botId });
    });
};
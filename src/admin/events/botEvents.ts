import { Socket } from 'socket.io';
import { GameManager } from '../../managers/gameManager';
import { logger } from '../../utils/logger';

export const registerBotEvents = (socket: Socket, gameManager: GameManager) => {
    socket.on('startBot', async ({ botId }: { botId: number }) => {
        logger.log(`Received startBot event for botId: ${botId}`);
        try {
            const result = await gameManager.startBot(botId);
            socket.emit('botStarted', { botId, result });
        } catch (error) {
            const result = false;
            logger.error(`Error starting bot ${botId}:`, error);
            socket.emit('botStarted', { botId, result, message: `Failed to start bot ${botId}` });
        }
    });

    socket.on('stopBot', async ({ botId }: { botId: number }) => {
        const result = await gameManager.stopBot(botId);
        socket.emit('botStopped', { botId, result });
    });

    socket.on('getBotInfos', () => {
        const botInfos = gameManager.getBotInfos(0); // Exemple avec botId = 0
        socket.emit('botInfos', botInfos);
    });
    
};

import { Socket } from 'socket.io';
import { GameManager } from '../../core/gameManager';

export const registerBotEvents = (socket: Socket, gameManager: GameManager) => {
    socket.on('getBotInfos', () => {
        const botInfos = gameManager.getBotStatus(0); // Exemple avec botId = 0
        socket.emit('botInfos', botInfos);
    });

    socket.on('startBot', async ({ botId }: { botId: number }) => {
        console.log(`Received startBot event for botId: ${botId}`);
        try {
            await gameManager.startBot(botId);
            socket.emit('botStarted', { botId });
        } catch (error) {
            console.error(`Error starting bot ${botId}:`, error);
            socket.emit('error', { message: `Failed to start bot ${botId}` });
        }
    });

    socket.on('stopBot', async ({ botId }: { botId: number }) => {
        await gameManager.stopBot(botId);
        socket.emit('botStopped', { botId });
    });
};

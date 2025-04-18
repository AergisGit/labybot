import { Socket } from 'socket.io';
import { GameManager } from '../../managers/gameManager';
import { GameInfosData } from "@shared/types/game";

export const registerGameEvents = (socket: Socket, gameManager: GameManager) => {

    socket.on('startGame', async ({ botId, game, gameName }: { botId: number, game: string, gameName: string }) => {
        const result = await gameManager.startGame(botId, game, gameName);
        socket.emit('gameStarted', { botId, result });
    });

    socket.on('stopGame', async ({ botId }: { botId: number }) => {
        const result = await gameManager.stopGame(botId);
        socket.emit('gameStopped', { botId, result });
    });

    socket.on('getGameInfos', ({ botId }: { botId: number }) => {
        const data = gameManager.getGameInfos(botId);
        socket.emit('gameInfos', data);
    });
    
    socket.on('getGamesList', () => {
        const data = gameManager.getGamesList();
        socket.emit('gamesList', data);
    });

    socket.on('changeBotGame', async ({botId, game, gameName} : {botId: number, game: string, gameName: string}) => {
        const result = await gameManager.changeBotGame(botId, game, gameName);
        socket.emit('gamesList', gameManager.getGamesList());
        socket.emit('gameStarted', { botId, result });
    });

    socket.on('updateGameInfos', (newGameInfos: GameInfosData) => {
        const result:boolean = gameManager.updateGameInfos(newGameInfos);
        socket.emit('updateGameInfos', result);

    });

};
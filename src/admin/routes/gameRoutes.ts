import { Router } from 'express';
import { GameManager } from '../../managers/gameManager';

export const gameRoutes = (gameManager: GameManager) => {
    const router = Router();

    router.get('/:botId/data', (req, res) => {
        const botId = parseInt(req.params.botId);
        if (isNaN(botId)) {
            res.status(400).send("Invalid botId");
            return;
        }
        res.json(gameManager.getGameData(botId));
    });

    router.post('/:botId/start', async (req, res) => {
        const botId = parseInt(req.params.botId);
        if (isNaN(botId)) {
            res.status(400).send("Invalid botId");
            return;
        }
        await gameManager.startGame(botId);
        res.status(200).send(`Game started on bot ${botId}`);
    });

    router.post('/:botId/stop', async (req, res) => {
        const botId = parseInt(req.params.botId);
        if (isNaN(botId)) {
            res.status(400).send("Invalid botId");
            return;
        }
        await gameManager.stopGame(botId);
        res.status(200).send(`Game stopped on bot ${botId}`);
    });

    return router;
};
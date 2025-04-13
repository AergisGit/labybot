import { Router } from 'express';
import { GameManager } from '../../managers/gameManager';

export const botRoutes = (gameManager: GameManager) => {
    const router = Router();

    router.get('/:botId/infos', (req, res) => {
        const botId = parseInt(req.params.botId);
        if (isNaN(botId)) {
            res.status(400).send("Invalid botId");
            return;
        }
        res.json(gameManager.getBotInfos(botId));
    });

    router.post('/:botId/start', async (req, res) => {
        const botId = parseInt(req.params.botId);
        if (isNaN(botId)) {
            res.status(400).send("Invalid botId");
            return;
        }
        await gameManager.startBot(botId);
        res.status(200).send(`Bot ${botId} started`);
    });

    router.post('/:botId/stop', async (req, res) => {
        const botId = parseInt(req.params.botId);
        if (isNaN(botId)) {
            res.status(400).send("Invalid botId");
            return;
        }
        await gameManager.stopBot(botId)
        res.status(200).send(`Bot ${botId} stopped`);
    });

    return router;
};
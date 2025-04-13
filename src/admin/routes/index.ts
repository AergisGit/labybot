import { Router } from 'express';
import { botRoutes } from './botRoutes';
import { gameRoutes } from './gameRoutes';
import { GameManager } from '../../managers/gameManager';

export const apiRoutes = (gameManager: GameManager) => {
    const router = Router();

    router.use('/bot', botRoutes(gameManager));
    router.use('/game', gameRoutes(gameManager));

    return router;
};
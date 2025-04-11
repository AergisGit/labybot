import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { GameManager } from '../core/gameManager';
import { registerBotEvents } from './events/botEvents';
import { registerGameEvents } from './events/gameEvents';
import { Logger } from "../api";

export const setupSocketServer = (httpServer: HttpServer, gameManager: GameManager) => {
    const log = new Logger("SOCK", "debug", true, "cyan");

    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            //origin: ['http://localhost:3000', 'http://localhost:3001'], // URL for Front-end
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        log.info(`Client connected: ${socket.id}`);
        //log.debug('New connection attempt', {id: socket.id,handshake: socket.handshake});

        // Init des données à la connexion :
        // Émettre des données après la connexion
        socket.emit('botInfos', gameManager.getBotStatus(0));

        // Events for the bot and game
        registerBotEvents(socket, gameManager);
        registerGameEvents(socket, gameManager);

        // Ajouter l'écouteur serverInfo pour chaque socket
        gameManager.on('serverInfo', (info) => {
            socket.emit('serverInfo', info);
        });

        socket.on('disconnect', () => {
            log.info(`Client disconnected: ${socket.id}`);
        });

        socket.on("error", (err) => {
            console.error("Socket error:", err);
        });

        // Gestionnaire "fourre-tout" pour capturer tous les événements non gérés
        socket.onAny((event, ...args) => {
            log.debug(`Unhandled event received: ${event}`, args);
        });

    });

    /*
    gameManager.on('serverInfo', (info) => {
        io.emit('serverInfo', info); // Émettre à tous les clients connectés
    });
    */

    return io;
};
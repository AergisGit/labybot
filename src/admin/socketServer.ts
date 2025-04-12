import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { GameManager } from '../core/gameManager';
import { registerBotEvents } from './events/botEvents';
import { registerGameEvents } from './events/gameEvents';
import { GAME_EVENTS, GameEvent } from './events/gameManagerEvents';
import { Logger } from "../logger";

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

        // Init des données à la connexion, par un envoi immédiat :
        socket.emit('botInfos', gameManager.getBotInfos(0));

        // Events for the game manager
        // Create Map to stock listeners
        const listeners = new Map<GameEvent, (data: any) => void>();

        // Automatically register all events from GAME_EVENTS
        GAME_EVENTS.forEach((eventName) => {
            const listener = (data: any) => {
                socket.emit(eventName, data);
                //log.debug(`Emitted ${eventName} event to client ${socket.id}`);
            };
            
            log.info(`Registering listener for ${eventName}`);   
            listeners.set(eventName, listener);
            gameManager.on(eventName, listener);
        });

        // Events for the bot and game
        registerBotEvents(socket, gameManager);
        registerGameEvents(socket, gameManager);

       socket.on('disconnect', () => {
            // Clean all listeners
            listeners.forEach((listener, eventName) => {
                gameManager.off(eventName, listener);
            });
            listeners.clear();
            
            log.info(`Client disconnected: ${socket.id}`);
        });

        socket.on("error", (err) => {
            console.error("Socket error:", err);
        });

        // Debug log for all events
        socket.onAny((event, ...args) => {
            log.debug(`Unhandled event received: ${event}`, args);
        });

    });

    return io;
};
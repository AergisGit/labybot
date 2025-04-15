import { BotManager, SERVER_URL } from './botManager';
import { ConfigFile, getDefaultConfig } from './config/config';
import { Logger } from '../utils/logger';
import { BotInfos } from "@shared/types/bot";
import { API_Connector } from '../apiConnector'
import { Dare } from "../games/dare";
import { PetSpa } from "../games/petspa";
import { Home } from "../games/home";
import { Laby } from "../games/laby";
import { Casino } from "../games/casino";
import { EventEmitter } from 'stream';
import { GameInfosData, GameInfos } from './config/gameInfos';

export class GameManager extends EventEmitter {
    private gameInstances: Map<number, { game: string, gameName?: string, instance: any, isRunning: boolean, gameInfos: GameInfosData }>; // Gère les jeux actifs et leurs bots
    private botInstances: Map<number, BotManager>; // Gère plusieurs bots via un ID
    private isRunning: Map<number, boolean>; // Suivi de l'état de chaque bot
    private GameInfos: GameInfos;
    private config: ConfigFile;
    public log: Logger;


    constructor() {
        super(); // init the EventEmitter part
        this.setMaxListeners(50); // Augment the limit of listeners to 50
        this.gameInstances = new Map();
        this.botInstances = new Map();
        this.isRunning = new Map();
        this.log = new Logger('GAME', 'debug', true, 'yellow');
        this.log.info("GameManager constructed.");
    }

    public async initialize(): Promise<void> {
        // Chargement de la configuration depuis le fichier de configuration
        this.config = await getDefaultConfig();  // Charge la config du fichier
        this.GameInfos = new GameInfos(this.config.game, this.config.gameName);
        this.GameInfos.init();
        this.log.info("Config initialized: ", this.getConfig());
    }

    // Emitters
    private sendServerInfo(info: any) {
        this.emit('serverInfo', info);
    }

    private sendBotInfos(botId: number = 0) {
        this.emit('botInfos', this.getBotInfos(botId));
    }

    // Notes : 
    // - By making a GameInstance class to be extended for each game,
    //   We simply might send the events from there to the game
    //    when the corresponding functions are implemented.
    // - To be cleaned : Except for serverInfos, on every update,
    //    the whole botInfos is sent to the client
    //
    // Listeners
    private setupBotListeners(botId: number): void {
        const botInstance = this.botInstances.get(botId);
        if (botInstance) {
            const connector = botInstance.getConnector();
            // Connection related events
            //connector.on('connect', () => { this.sendBotInfos(botId); });
            //connector.on('disconnect', () => { this.sendBotInfos(botId); });

            // Get the connector and listen for serverInfo events
            connector.on('serverInfo', (info) => { this.sendServerInfo(info); });

            // Room related events
            connector.on('RoomJoin', () => { this.sendBotInfos(botId); });
            connector.on('RoomCreate', () => { this.sendBotInfos(botId); });

            // Chat part
            // Plus d'infos de base pour le message reçu du serveur avant d'être émit pa le connector : BC_Server_ChatRoomMessage
            //connector.on('Message', (sender, message) => { });
            //connector.on('Beep', (payload: TBeepType) => { });

            // Character updates
            connector.on('CharacterEntered', (char) => { this.sendBotInfos(botId); });
            connector.on('CharacterLeft', (sourceMemberNumber, character, leaveMessage, intentional) => { this.sendBotInfos(botId); });
            connector.on('PoseChange', (character) => { this.sendBotInfos(botId); });

            // Some on : connector.wrappedSock.emit() (private)
            // That seems to come from the bot's own actions.
            // The botInfos should also be sent when the bot acts.
            // - ChatRoomChat
            // - ChatRoomAdmin
            // - AccountBeep
            // - AccountQuery
            // - AccountLogin
            // - AccountUpdate
            // - ChatRoomJoin
            // - ChatRoomCreate
            // - ChatRoomLeave
            // - ChatRoomSearch
            // - ChatRoomCharacterItemUpdate
            // - ChatRoomCharacterUpdate
            // - ChatRoomCharacterPoseUpdate
            // - ChatRoomAllowItem
            // - ChatRoomCharacterMapDataUpdate

            if (connector.chatRoom) {
                // apperance updates
                connector.chatRoom.on('ItemAdd', (source, item) => { this.sendBotInfos(botId); });
                connector.chatRoom.on('ItemRemove', (source, items) => { this.sendBotInfos(botId); });
                connector.chatRoom.on('ItemChange', (source, newItem, oldItem) => { this.sendBotInfos(botId); });

                // Map updates
                if (connector.chatRoom.map) {
                    connector.chatRoom.map.on('MapUpdate', () => { this.sendBotInfos(botId); });
                }
            }
        }
    }

    private stopBotListeners(botId: number): void {
        // Cleanup listeners when stopping
        const botInstance = this.botInstances.get(botId);
        if (botInstance) {
            const connector = botInstance.getConnector();
            connector.removeAllListeners();
            if (connector.chatRoom) {
                connector.chatRoom.removeAllListeners();
                if (connector.chatRoom.map) {
                    connector.chatRoom.map.removeAllListeners();
                }
            }
        }
    }


    // Basic bots commands
    public async startBot(botId: number = 0): Promise<boolean> {
        if (this.isRunning.get(botId)) return;

        const botInstance = new BotManager(this.config);
        try {
            await botInstance.startBot();
            this.botInstances.set(botId, botInstance);
            this.isRunning.set(botId, true);
            this.log.info(`Bot ${botId} started successfully.`);

            await this.startGame(botId, this.config.game, this.config.gameName); // Start the game if needed
            this.setupBotListeners(botId); // Setup listeners for the bot instance

            return true;
        } catch (error) {
            this.log.error("Failed to start bot:", error);
            return false;
        }
    }


    public async stopBot(botId: number = 0) {
        if (!this.isRunning.get(botId)) return;

        this.stopGame(botId); // stop the game if any
        this.stopBotListeners(botId) // cleanup listeners before stopping the bot

        // stop the bot and do some cleanup
        const botInstance = this.botInstances.get(botId);
        await botInstance.stopBot();
        this.botInstances.delete(botId);

        // update the infos now that the bot is stopped
        this.isRunning.set(botId, false);
        this.sendBotInfos(botId);

        this.log.info(`Bot ${botId} stopped.`);
    }


    // send most of the bot infos to the client
    public getBotInfos(botId: number = 0): BotInfos | undefined {
        const botInstance = this.botInstances.get(botId);
        let botInfos: BotInfos = undefined;

        if (botInstance !== undefined) {
            const gameStatus = this.getGameStatus(botId);
            const roomInfos = this.getRoomInfos();
            const botDetails = botInstance.getBotDetails();
            const isRunning = this.isRunning.get(botId) || false;
            botInfos = {
                connected: isRunning || false,
                botId: botId,
                botName: botDetails?.botName || null,
                botNumber: botDetails?.botNumber || null,
                gameRunning: gameStatus?.gameRunning || false,
                game: gameStatus?.game || null,
                gameName: gameStatus?.gameName || null,
                playerCount: roomInfos?.playerCount || 0,
                roomMap: roomInfos?.roomMap || undefined,
                roomData: roomInfos?.roomData || undefined
            };
        }
        return botInfos;
    }

    public getGameStatus(botId: number = 0) {
        const gameInstance = this.gameInstances.get(botId);
        return {
            game: gameInstance?.game,
            gameName: gameInstance?.gameName,
            gameRunning: gameInstance?.isRunning
        };
    }

    public getRoomInfos(botId: number = 0) {
        const botInstance = this.botInstances.get(botId);
        if (botInstance !== undefined) {
            return botInstance.getRoomInfos();
        }
    }

    // Config
    public getBotConfig(botId: number = 0) {
        let user;
        if (botId === 0) {
            user = this.config.user;
        } else if (botId === 1) {
            user = this.config.user2;
        }

        return {
            user: user,
            env: this.config.env,
            game: this.config.game,
        };
    }

    public async getGameInfos(botId: number = 0): Promise<GameInfosData | undefined> {
        const gameInstance = this.gameInstances.get(botId);
        if (!gameInstance) {
            this.log.warn(`No game is running on bot ${botId}.`);
            return undefined;
        }
        return gameInstance.gameInfos;
    }

    public updateGameInfos(newConfig: Partial<ConfigFile>, botId: number = 0) {
        this.config = { ...this.config, ...newConfig };
        this.log.info(`Updated config for bot ${botId}:`, this.getConfig());
    }

    private getConfig(botId: number = 0): ConfigFile {
        // TODO separate game config from bot config at some point,
        // We'll keep only parts of this newConfig we think should be updated.
        //  and have the bot being able to change game live

        // Hide passwords before retunring the config
        const configCleaned: ConfigFile = { ...this.config };
        configCleaned.password = configCleaned.password ? "***" : configCleaned.password;
        configCleaned.password2 = configCleaned.password2 ? "***" : configCleaned.password2;

        return configCleaned;
    }


    // Games

    public async startGame(botId: number = 0, game?: string, gameName?: string): Promise<boolean> {
        try {
            const botInstance = this.botInstances.get(botId);
            if (!botInstance) {
                throw new Error(`Game ${game} cannot start, bot ${botId} is not connected.`);
            }

            let gameInstance: any;
            const connector = botInstance.getConnector();
            const gameInfos = this.GameInfos.getGameInfos();

            if (this.gameInstances.has(botId)) {
                const gameInstance = this.gameInstances.get(botId)
                if (gameInstance.isRunning) {
                    this.log.warn(`A game is already running on bot ${botId}. Stopping it first.`);
                    if (!await this.stopGame(botId)) {
                        throw new Error(`The game on bot ${botId} wasn't set to be stopped. Stop the bot to stop the game.`);
                    }
                }
                // maybe we are starting with a different game and game name
                game = game || gameInstance.game;
                gameName = gameName || gameInstance.gameName || "default";
            } else {
                // Set gameInstance infos so that even  if the game can't launch, we still now what game we're at
                this.gameInstances.set(botId,
                    { game: game, gameName: gameName, instance: undefined, isRunning: false, gameInfos: gameInfos }
                );
            }


            switch (game) {

                case "dare":
                    gameInstance = new Dare(connector);
                    break;

                case "casino":
                    let db: any;
                    try {
                        this.log.info("Connecting to the database...");
                        this.log.debug("mongo_uri:", this.config.mongo_uri);
                        this.log.debug("mongo_db: ", gameInfos.mongo_db);
                        await botInstance.connectToDatabase(gameInfos.mongo_db);
                        db = botInstance.getDB();
                    } catch (e) {
                        throw new Error("Can't launch the casino, Failed to connect to the database:", e);
                    }
                    gameInstance = new Casino(connector, db, gameInfos.casino);
                    await gameInstance.init();
                    break;

                case "petspa":
                    gameInstance = new PetSpa(connector);
                    await gameInstance.init();
                    break;

                case "home":
                    gameInstance = new Home(connector, this.config.superusers);
                    await gameInstance.init();
                    break;

                case "laby":
                    gameInstance = new Laby(connector, gameInfos, this.config.superusers);
                    await gameInstance.init();
                    break;

                default:
                    throw new Error(`Unknown game : ${game}`);
            }

            this.gameInstances.set(botId,
                { game: game, gameName: gameName, instance: gameInstance, isRunning: true, gameInfos: gameInfos }
            );

            this.sendBotInfos(botId);

            this.log.info(`Game ${game} started on bot ${botId}.`);

            return true;
        } catch (e) {
            this.log.error(e);
            return false;
        }
    }

    public async stopGame(botId: number = 0): Promise<boolean> {
        const gameInstance = this.gameInstances.get(botId);
        if (!gameInstance.isRunning) {
            this.log.warn(`No game is running on bot ${botId}.`);
            return true;
        }

        const { game } = gameInstance;
        const { gameName } = gameInstance;
        const { instance } = gameInstance;
        const { gameInfos } = gameInstance;

        if (typeof instance.stop === "function") {
            
            // Stop the game
            await instance.stop();
            // If a db is connected, stop it too
            const botInstance = this.botInstances.get(botId)
            if ( botInstance.getDB() !== undefined ) {
                await botInstance.disconnectFromDatabase();
            }
            
            this.gameInstances.set(botId,
                { game: game, gameName: gameName, instance: undefined, isRunning: false, gameInfos: gameInfos }
            );
            
            this.sendBotInfos(botId);

            this.log.info(`Game ${gameInstance.game} stopped on bot ${botId}.`);
            return true;
        } else {
            this.log.warn(`This game ${gameInstance.game} on bot ${botId} wasn't set to be stopped. Stop the bot to stop the game.`);
            return false;
        }
    }
}

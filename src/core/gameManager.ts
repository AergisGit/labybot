import { BotManager, SERVER_URL } from './botManager';
import { ConfigFile, getDefaultConfig } from '../config';
import { Logger } from '../logger';
import { BotInfos } from "@shared/types/bot";
import { API_Connector } from '../apiConnector'
import { Dare } from "../games/dare";
import { PetSpa } from "../games/petspa";
import { Home } from "../games/home";
import { Laby } from "../games/laby";
import { Casino } from "../games/casino";
import { EventEmitter } from 'stream';

export class GameManager extends EventEmitter {
    private gameInstances: Map<number, { instance: any, isRunning: boolean, config: ConfigFile }>; // Gère les jeux actifs et leurs bots
    private botInstances: Map<number, BotManager>; // Gère plusieurs bots via un ID
    private isRunning: Map<number, boolean>; // Suivi de l'état de chaque bot
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
        this.log.info("Config initialized: ", this.getConfig());

        await this.startBot(0); // par défaut un seul bot
        //await this.startGame(0, this.config);

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
            connector.on('serverInfo', (info) => {this.sendServerInfo(info);});

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

            await this.startGame(botId, this.config);
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
        const gameInfos = this.gameInstances.get(botId);
        return {
            game: gameInfos?.config?.game,
            gameName: gameInfos?.config?.gameName,
            gameRunning: gameInfos?.isRunning
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
        const config = this.gameInstances.get(botId)?.config;
        return {
            user: config?.user,
            env: config?.env,
            game: config?.game,
        };
    }

    public getGameConfig(botId: number = 0) {
        const config = this.gameInstances.get(botId)?.config;
        return {
            game: config?.game,
            gameName: config?.gameName,
            superusers: config?.superusers,
            room: config?.room
        };
    }

    public updateGameConfig(newConfig: Partial<ConfigFile>, botId: number = 0) {
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

    public async startGame(botId: number = 0, gameConfig?: ConfigFile): Promise<boolean> {
        try {
            const botInstance = this.botInstances.get(botId);
            if (!botInstance) {
                this.log.error(`Game ${gameConfig.game} cannot start, bot ${botId} is not connected.`);
                throw new Error(`Bot ${botId} is not connected.`);
            }

            if (this.gameInstances.has(botId)) {
                const gameInfos = this.gameInstances.get(botId)
                if (gameInfos.isRunning) {
                    this.log.warn(`A game is already running on bot ${botId}. Stopping it first.`);
                    await this.stopGame(botId);
                }
                else {
                    gameConfig = gameInfos.config;
                    if (gameConfig === undefined) {
                        throw new Error(`Game ${gameConfig.game} cannot start on bot ${botId}, no config provided.`);
                    }
                }
            }

            let gameInstance;
            let connector = botInstance.getConnector();
            let db = botInstance.getDB();
            switch (gameConfig.game) {
                
                case "dare":
                    gameInstance = new Dare(connector);
                    break;

                case "casino":
                    gameInstance = new Casino(connector, db, gameConfig.casino);
                    break;

                case "petspa":
                    gameInstance = new PetSpa(connector);
                    await gameInstance.init();
                    break;

                case "home":
                    gameInstance = new Home(connector, gameConfig.superusers);
                    await gameInstance.init();
                    break;

                case "laby":
                    gameInstance = new Laby(connector, gameConfig.superusers, gameConfig.gameName);
                    await gameInstance.init();
                    break;

                default:
                    throw new Error(`Unknown game : ${gameConfig.game}`);
            }

            this.gameInstances.set(botId, { instance: gameInstance, isRunning: true, config: gameConfig });

            this.sendBotInfos(botId);

            this.log.info(`Game ${gameConfig.game} started on bot ${botId}.`);

            return true;
        } catch (e) {
            this.log.error(e);
            return false;
        }
    }


    public async stopGame(botId: number = 0): Promise<boolean> {
        const gameInfos = this.gameInstances.get(botId);
        if (!gameInfos) {
            this.log.warn(`No game is running on bot ${botId}.`);
            return true;
        }

        const { instance } = gameInfos;
        const { config } = gameInfos
        if (typeof instance.stop === "function") {
            instance.stop();
            this.gameInstances.set(botId, { instance: instance, isRunning: false, config: config });

            this.sendBotInfos(botId);

            this.log.info(`Game ${config.gameName} stopped on bot ${botId}.`);
            return true;
        } else {
            this.log.warn(`This game ${config.gameName} on bot ${botId} wasn't set to be stopped. Stop the bot to stop the game.`);
            return false;
        }
    }


    async restartGame(botId: number = 0) {
        const game = this.gameInstances.get(botId);
        await this.stopGame(botId);
        await this.startGame(botId, game.config);
    }

}

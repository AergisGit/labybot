import { BotManager } from './botManager';
import { ConfigFile, getDefaultConfig } from './config/config';
import { Logger } from '../utils/logger';
import { BotInfos } from "@shared/types/bot";
import { GameInfosData } from "@shared/types/game";
import { API_Connector, RoomDefinition } from '../apiConnector'
import { API_Chatroom, ChatRoomAccessVisibility } from "../apiChatroom";
import { API_Chatroom_Data } from "@shared/types/bc";
import { Dare } from "../games/dare";
import { PetSpa } from "../games/petspa";
import { Home } from "../games/home";
import { Laby } from "../games/laby";
import { Casino } from "../games/casino";
import { EventEmitter } from 'stream';
import { GameInfos } from './config/gameInfos';

export class GameManager extends EventEmitter {
    private gameInstances: Map<number, { game: string, gameName?: string, instance: any, isRunning: boolean, gameInfos: GameInfosData }>; // Gère les jeux actifs et leurs bots
    private botInstances: Map<number, BotManager>; // Gère plusieurs bots via un ID
    private isRunning: Map<number, boolean>; // Suivi de l'état de chaque bot
    private GameInfos: GameInfos;
    private config: ConfigFile;
    public log: Logger;


    constructor() {
        super(); // init the EventEmitter part
        //this.setMaxListeners(20);
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

    private sendGamesList() {
        try {
            this.emit('gamesList', this.getGamesList());
        }
        catch (e) {
            this.log.error("Failed to send games list: ", e);
        }
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
    public async startBot(botId: number = 0, game?: string, gameName?: string): Promise<boolean> {
        if (this.isRunning.get(botId)) return;

        this.log.debug(`Starting bot ${botId}...`);
        this.log.debug(`With game: ${game} and gameName: ${gameName}`);
        this.log.debug(`Default config game: ${this.config.game} and gameName : ${this.config.gameName}`);

        game = game || this.config.game;
        gameName = gameName || this.config.gameName;

        const botInstance = new BotManager(this.config);
        try {
            await botInstance.startBot();
            this.botInstances.set(botId, botInstance);
            this.isRunning.set(botId, true);
            this.sendBotInfos(botId);
            this.log.info(`Bot ${botId} started successfully.`);

            await this.startGame(botId, game, gameName); // Start the game
            this.setupBotListeners(botId); // Setup listeners for the bot instance

            this.sendGamesList();

            return true;
        } catch (error) {
            this.log.error("Failed to start bot: ", error);
            return false;
        }
    }


    public async stopBot(botId: number = 0) {
        if (!this.isRunning.get(botId)) return;

        await this.stopGame(botId); // stop the game if any
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

    public getGameInfos(botId: number = 0, game?: string, gameName?: string): GameInfosData | undefined {
        if (game !== undefined && gameName !== undefined) {
            return this.GameInfos.getGameInfos(game, gameName);
        }
        else {
            const gameInstance = this.gameInstances.get(botId);
            if (!gameInstance) {
                this.log.warn(`No game is running on bot ${botId}.`);
                return undefined;
            }
            return gameInstance.gameInfos;
        }
    }

    public getGamesList(): Record<string, string[]> {
        let gamesList: Record<string, string[]> = {};
        try {
            gamesList = this.GameInfos.getGamesList();
        }
        catch (e) {
            this.log.error("Failed to get games list: ", e);
        }
        return gamesList;
    }


    public async changeBotGame(botId: number, game: string, gameName: string): Promise<boolean> {
        // stop the game on the bot
        if (this.gameInstances.has(botId)) {
            const gameInstance = this.gameInstances.get(botId);
            if (gameInstance.isRunning) {
                await this.stopGame(botId);
            }
        }

        // start the game on the bot
        const botInstance = this.botInstances.get(botId);
        if (botInstance) {
            const connector = botInstance.getConnector();
            if (connector) {
                await this.startGame(botId, game, gameName);
                this.log.info(`Game ${game} started on bot ${botId}.`);
                return true;
            } else {
                this.log.warn(`No connector found for bot ${botId}.`);
                return false;
            }
        }
        return false;
    }

    // Update the game config on the bot and in the gameInfos file
    public updateGameInfos(newConfig: Partial<GameInfosData>, botId: number = 0): boolean {
        try {
            if (this.gameInstances.has(botId)) {
                const updatedConfig: GameInfosData = { ...this.gameInstances.get(botId).gameInfos, ...newConfig };
                this.gameInstances.get(botId).gameInfos = updatedConfig;
                //this.GameInfos.saveGameInfos(updatedConfig);
                this.log.info(`Updated or created config for game, coming from ${botId}:`, this.getConfig());
                this.sendGamesList();
                this.log.info(`Updated gamesList`);
                return true;
            }
        } catch (e) {
            this.log.error("Failed to update game infos: ", e);
        }
        return false
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

    public updateBotConfig(newConfig: Partial<ConfigFile>, botId: number = 0) {
        this.config = { ...this.config, ...newConfig };
        // Need to save in config.json ? => tbd later
        //this.config.saveConfig(this.config);
        this.log.info(`Updated config for bot ${botId}:`, this.getConfig());
    }

    // Games

    public async startGame(botId: number = 0, game: string, gameName: string): Promise<boolean> {
        try {
            this.log.info(`Game ${game}:${gameName} starting on bot ${botId}.`);

            const botInstance = this.botInstances.get(botId);
            if (!botInstance) {
                throw new Error(`Cannot start game, bot ${botId} is not connected.`);
            }

            let gameInstance: any;
            const connector = botInstance.getConnector();
            let gameInfos: GameInfosData;// = this.GameInfos.getGameInfos();

            if (this.gameInstances.has(botId)) {
                const gameInstance = this.gameInstances.get(botId)
                if (gameInstance.isRunning) {
                    this.log.warn(`A game is already running on bot ${botId}. Stopping it first.`);
                    if (!await this.stopGame(botId)) {
                        throw new Error(`The game on bot ${botId} wasn't set to be stopped. Stop the bot to stop the game.`);
                    }
                }
                // maybe we are starting with a different game and game name
                if (gameInstance.game !== game || gameInstance.gameName !== gameName) {
                    gameInfos = this.GameInfos.loadGameInfos(game, gameName);
                } else {
                    gameInfos = gameInstance.gameInfos;
                }
            }

            if (gameInfos === undefined) {
                gameInfos = this.GameInfos.loadGameInfos(game, gameName);
            }
            //this.log.debug("GameInfos loaded: ", JSON.stringify(gameInfos, null, 2));

            this.log.debug(`Updating gameInstances.`);
            // Set gameInstance infos so that even  if the game can't launch, we still now what game we're at
            this.gameInstances.set(botId,
                { game: game, gameName: gameName, instance: undefined, isRunning: false, gameInfos: gameInfos }
            );


            // Getting into the game's room, and updating it
            /*
            this.log.debug(`Preparing roomInfos {gameInfos.room.Name}...`);
            const roomInfos: API_Chatroom_Data = {
                Name: gameInfos.room.Name,
                Description: gameInfos.room.Description,
                Background: gameInfos.room.Background,
                Access: gameInfos.room.Access,
                Visibility: gameInfos.room.Visibility,
                Space: gameInfos.room.Space,
                Admin: gameInfos.room.Admin,
                Ban: gameInfos.room.Ban,
                Limit: gameInfos.room.Limit,
                BlockCategory: gameInfos.room.BlockCategory,
                Game: gameInfos.room.Game,
                Language: gameInfos.room.Language,
            };
            this.log.debug("Updating room with roomInfos: ");
            connector.updateRoom(roomInfos);
            */

            this.log.debug(`Choosing game to start.`);
            switch (game) {

                case "dare":
                    gameInstance = new Dare(connector, gameInfos);
                    await gameInstance.init();
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
                    gameInstance = new Casino(connector, db, gameInfos);
                    await gameInstance.init();
                    break;

                case "petspa":
                    gameInstance = new PetSpa(connector, gameInfos);
                    await gameInstance.init();
                    break;

                case "home":
                    this.log.debug(`Switch: Cosntruct Game ${game}:${gameName} starting on bot ${botId}.`);
                    gameInstance = new Home(connector, gameInfos, this.config.superusers);
                    this.log.debug(`Switch: Init Game ${game}:${gameName} starting on bot ${botId}.`);
                    await gameInstance.init();
                    break;

                case "laby":
                    gameInstance = new Laby(connector, gameInfos, this.config.superusers);
                    await gameInstance.init();
                    break;

                default:
                    throw new Error(`Unknown game : ${game}`);
            }
            this.log.debug(`Updating gameInstance with started game.`);
            this.gameInstances.set(botId,
                { game: game, gameName: gameName, instance: gameInstance, isRunning: true, gameInfos: gameInfos }
            );

            this.log.info(`Game ${game}:${gameName} started on bot ${botId}.`);

            return true;
        } catch (e) {
            this.log.error("Failed to start game: ", e);
            return false;
        } finally {
            this.sendBotInfos(botId);
            this.sendGamesList();
        }
    }

    public async stopGame(botId: number = 0): Promise<boolean> {
        const botInstance = this.botInstances.get(botId)
        if (botInstance === undefined) {
            this.log.warn(`No bot instance found for bot ${botId}.`);
            return false;
        }

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
            if (botInstance.getDB() !== undefined) {
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

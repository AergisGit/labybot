import { BotManager, SERVER_URL } from './botManager';
import { ConfigFile, getDefaultConfig } from '../config';
import { Logger } from '../api';
import { BotInfos } from "@shared/types/bot";
import { API_Connector } from '../apiConnector'
import { KidnappersGameRoom } from "../hub/logic/kidnappersGameRoom";
import { RoleplaychallengeGameRoom } from "../hub/logic/roleplaychallengeGameRoom";
import { MaidsPartyNightSinglePlayerAdventure } from "../hub/logic/maidsPartyNightSinglePlayerAdventure";
import { Dare } from "../games/dare";
import { PetSpa } from "../games/petspa";
import { Home } from "../games/home";
import { Laby } from "../games/laby";
import { Casino } from "../games/casino";
import { EventEmitter } from 'stream';

export class GameManager extends EventEmitter {
    private games: Map<number, { instance: any, isRunning: boolean, config: ConfigFile }>; // Gère les jeux actifs et leurs bots
    private botInstances: Map<number, BotManager>; // Gère plusieurs bots via un ID
    private isRunning: Map<number, boolean>; // Suivi de l'état de chaque bot
    private config: ConfigFile;
    public log: Logger;

    constructor() {
        super(); // init the EventEmitter part
        this.setMaxListeners(50); // Augment the limit of listeners to 50
        this.games = new Map();
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
        await this.startGame(0, this.config);

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
            this.sendBotInfosChange(botId);

            // remonter le on server info
            //const conn = botInstance.getConnector();
            //conn.on('serverInfo', (info) => {
            //    this.onServerInfo(info);
            //});

            return true;
        } catch (error) {
            this.log.error("Failed to start bot:", error);
            return false;
        }
    }

    onServerInfo(info: any) {
        //this.log.debug("Received server info in GameManager:", info);
        this.emit('serverInfo', info);
    }

    sendBotInfosChange(botInfos: any) {
        this.emit('botInfos', this.getBotStatus(botInfos));
    }

    async stopBot(botId: number = 0) {
        if (!this.isRunning.get(botId)) return;

        const botInstance = this.botInstances.get(botId);
        await botInstance.stopBot();
        this.botInstances.delete(botId);
        this.isRunning.set(botId, false);
        this.sendBotInfosChange(botId);

        this.log.info(`Bot ${botId} stopped.`);
    }

    async restartBot(botId: number = 0) {
        await this.stopBot(botId);
        await this.startBot(botId);
        //const config = this.games.get(botId).config;
        //await this.startGame(0, this.config);
    }

    // TODO split this in two
    //  the first one for status
    //  the second to return a BotInfos structure
    getBotStatus(botId: number = 0) {
        const botInstance = this.botInstances.get(botId);
        const gameStatus = this.getGameStatus(botId);
        const roomInfos = botInstance?.getRoomInfos();
        const isRunning = this.isRunning.get(botId) || false;

        return {
            botName: roomInfos?.botName || null,
            botNumber: roomInfos?.botNumber || null,
            connected: isRunning,
            gameRunning: gameStatus?.isRunning || false,
            game: gameStatus?.game || null,
            gameName: gameStatus?.gameName || null,
            playerCount: roomInfos?.playerCount || 0,
            roomMap: roomInfos?.roomMap || undefined,
            roomData: roomInfos?.roomData || undefined
        };
    }

    getRoomInfos(botId: number = 0) {
        const botInstance = this.botInstances.get(botId);
        if (botInstance !== undefined) {
            return botInstance.getRoomInfos();
        }
    }

    public getGameStatus(botId: number = 0) {
        const gameInfos = this.games.get(botId);
        return {
            isRunning: gameInfos?.isRunning,
            game: gameInfos?.config?.game,
            gameName: gameInfos?.config?.gameName
        };
    }

    // Config
    getBotConfig(botId: number = 0) {
        const config = this.games.get(botId)?.config;
        return {
            user: config?.user,
            env: config?.env,
            game: config?.game,
        };
    }

    getGameConfig(botId: number = 0) {
        const config = this.games.get(botId)?.config;
        return {
            game: config?.game,
            gameName: config?.gameName,
            superusers: config?.superusers,
            room: config?.room
        };
    }

    updateGameConfig(newConfig: Partial<ConfigFile>, botId: number = 0) {
        // The logic will be kept in the botManager, not in the front end

        this.config = { ...this.config, ...newConfig };
        this.log.info(`Updated config for bot ${botId}:`, this.getConfig());
    }

    private getConfig(botId: number = 0): ConfigFile {
        // TODO separate game from bot config at some point,
        // We'll keep only parts of this newConfig we think should be updated.
        //  and have the bot being able to change game live

        // Hide passwords before giving the config
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

            if (this.games.has(botId)) {
                const gameInfos = this.games.get(botId)
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

                case "kidnappers":
                    gameInstance = new KidnappersGameRoom(connector, gameConfig);
                    break;

                case "roleplay":
                    gameInstance = new RoleplaychallengeGameRoom(connector, gameConfig);
                    break;

                case "maidspartynight":
                    if (!gameConfig.user2 || !gameConfig.password2) {
                        throw new Error(`Need user2 and password2 for Maid's Party Night`);
                    }
                    // Would it be worth it to use a bot[1] for this ?
                    let serverUrl = this.config.url ?? SERVER_URL[this.config.env];
                    const connector2 = new API_Connector(
                        serverUrl,
                        gameConfig.user2,
                        gameConfig.password2,
                        gameConfig.env,
                    );
                    gameInstance = new MaidsPartyNightSinglePlayerAdventure(connector, connector2);
                    break;

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

            this.games.set(botId, { instance: gameInstance, isRunning: true, config: gameConfig });
            
            this.sendBotInfosChange(botId);

            this.log.info(`Game ${gameConfig.game} started on bot ${botId}.`);
            return true;

        } catch (e) {
            this.log.error(e);
            return false;
        }
    }


    public async stopGame(botId: number = 0): Promise<boolean> {
        const gameInfos = this.games.get(botId);
        if (!gameInfos) {
            this.log.warn(`No game is running on bot ${botId}.`);
            return true;
        }

        const { instance } = gameInfos;
        const { config } = gameInfos
        if (typeof instance.stop === "function") {
            instance.stop();
            this.games.set(botId, { instance: instance, isRunning: false, config: config });
            
            this.sendBotInfosChange(botId);
            
            this.log.info(`Game ${config.gameName} stopped on bot ${botId}.`);
            return true;
        } else {
            this.log.warn(`This game ${config.gameName} on bot ${botId} wasn't set to be stopped. Stop the bot to stop the game.`);
            return false;
        }
    }


    async restartGame(botId: number = 0) {
        const game = this.games.get(botId);
        await this.stopGame(botId);
        await this.startGame(botId, game.config);
    }

}

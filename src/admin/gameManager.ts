import { BotManager } from '../bot';
import { ConfigFile, getDefaultConfig } from '../config';
import { Logger } from '../api';

export class GameManager {
    private games: Map<string, { bots: number[] }>; // Gère les jeux actifs et leurs bots
    private botInstances: Map<number, BotManager>; // Gère plusieurs bots via un ID
    private isRunning: Map<number, boolean>; // Suivi de l'état de chaque bot
    private config: ConfigFile;
    public log: Logger;

    constructor() {
        this.botInstances = new Map();
        this.isRunning = new Map();
        this.log = new Logger('GAME', 'debug', true, 'yellow');
    }

    public async initialize(): Promise<void> {
        // Chargement de la configuration depuis le fichier de configuration
        this.config = await getDefaultConfig();  // Charge la config du fichier
        this.log.info("Config initialized: ", this.getConfig());

        await this.startBot(0); // par défaut un seul bot
    }

    // Basic bots commands

    public async startBot(botId: number = 0) {
        // TODO Ajouter la gestion d'un bot qui refuse de démarrer ou qui plante
        if (this.isRunning.get(botId)) return;

        //const botInstance = await startBot(this.config);

        const botInstance = new BotManager(this.config);
        try {
            await botInstance.startBot();
            this.log.info("Bot started successfully.");
        } catch (error) {
            this.log.error("Failed to start bot:", error);
            process.exit(1);
        }

        //const botInstance = await startBot(this.config);
        this.botInstances.set(botId, botInstance);
        this.isRunning.set(botId, true);

        this.log.info(`Bot ${botId} started.`);
    }

    async stopBot(botId: number = 0) {
        if (!this.isRunning.get(botId)) return;

        const botInstance = this.botInstances.get(botId);
        await botInstance.stopBot();
        this.botInstances.delete(botId);
        this.isRunning.set(botId, false);

        this.log.info(`Bot ${botId} stopped.`);
    }

    async restartBot(botId: number = 0) {
        await this.stopBot(botId);
        await this.startBot(botId);
    }

    getBotStatus(botId: number = 0) {
        const botInstance = this.botInstances.get(botId);

        if (!botInstance) {
            return {
                botName: null,
                connected: false,
                gameRunning: false,
                gameName: null,
                playerCount: 0,
                roomData: undefined,
                roomMap: undefined
            };
        }

        const gameStatus = botInstance.getGameStatus();
        const roomInfos = botInstance.getRoomInfos();

        const isRunning = this.isRunning.get(botId) || false;
        return {
            botName: gameStatus?.botName || null,
            botNumber: gameStatus?.botNumber || null,
            connected: isRunning,
            gameRunning: gameStatus?.isRunning || false,
            game: gameStatus?.game || null,
            gameName: gameStatus?.gameName || null,
            playerCount: roomInfos?.playerCount || 0,
            roomData: roomInfos?.roomData || undefined,
            roomMap: roomInfos?.roomMap || undefined
        };
    }

    getBotData(botId: number = 0) {
        const botInstance = this.botInstances.get(botId);
        if (botInstance !== undefined) {

        }
    }

    // Config

    getBotConfig(botId: number = 0) {
        return {
            user: this.config.user || undefined,
            env: this.config.env || undefined,
            game: this.config.game || undefined
        };
    }

    getGameConfig(botId: number = 0) {
        return {
            game: this.config.game || undefined,
            gameName: this.config.gameName || undefined,
            superusers: this.config.superusers || undefined,
            room: this.config.room || undefined
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

    public async startGame(botId: number = 0): Promise<boolean> {
        try {
            const botInstance = this.botInstances.get(botId);
            await botInstance.startGame();
            return true;
        }
        catch (e) {
            this.log.error(`Error trying to start game on bot ${botId}: `, e);
            return false;
        }
    }

    public async stopGame(botId: number = 0): Promise<boolean> {
        try {
            const botInstance = this.botInstances.get(botId);
            await botInstance.stopGame();
            return true;
        }
        catch (e) {
            this.log.error(`Error trying to stop game on bot ${botId}: `, e);
            return false;
        }
    }

    async restartGame(botId: number = 0) {
        await this.startGame(botId);
        await this.stopGame(botId);
    }

}

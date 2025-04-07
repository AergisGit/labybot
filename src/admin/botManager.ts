import { startBot } from '../bot';
import { ConfigFile, getDefaultConfig } from '../config';
import { Logger } from '../api';

export class BotManager {
    private botInstance: any;
    private isRunning: boolean;
    private config: ConfigFile;
    public log: Logger;

    constructor() {
        this.botInstance = null;
        this.isRunning = false;
        this.log = new Logger('MBOT', 'debug', true, 'yellow');
    }
    
    public async initialize(): Promise<void> {
    // Chargement de la configuration depuis le fichier de configuration
        this.config = await getDefaultConfig();  // Charge la config du fichier
        this.log.debug("Config initialized: ", this.getBotConfig());

        this.startBot()
        this.log.info("Bot started.");

    }


    public async startBot(botId: number = 0) {
        if (this.isRunning) return;
        this.botInstance = await startBot(this.config);
        this.isRunning = true;

        /*this.botInstance.apiConnector.on("LoginError", (errorMessage) => {
            this.log.error("Login failed with error:", errorMessage);
            // Gérer l'erreur ici (par exemple, notifier l'utilisateur ou redémarrer le bot)
        });*/
    }

    async stopBot(botId: number = 0) {
        if (!this.isRunning) return;

        // Tu peux ajouter une méthode stop propre dans ton API_Connector ou game
        this.botInstance.connector?.disconnect?.(); 
        this.botInstance = null;
        this.isRunning = false;
    }

    async restart(botId: number = 0) {
        await this.stopBot(botId);
        await this.startBot(botId);
    }

    updateBotConfig(newConfig: Partial<ConfigFile>, botId: number = 0) {
        this.config = { ...this.config, ...newConfig };
        console.log("New bot config :", this.getBotConfig());
    }

    getBotConfig(botId: number = 0) {
        const configCleaned = { ...this.config };
        configCleaned.password = configCleaned.password ? "***" : configCleaned.password;
        configCleaned.password2 = configCleaned.password ? "***" : configCleaned.password;
        
        return configCleaned;
    }

    getBotStatus(botId: number = 0) {
        return {
            running: this.isRunning,
            config: this.getBotConfig(botId)
        };
    }
}

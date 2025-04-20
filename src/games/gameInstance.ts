import { API_Connector } from "../apiConnector";
import { CommandParser } from "../commandParser";
import { Logger } from "../utils/logger";
import { GameInfosData } from "@shared/types/game";

export abstract class GameInstance {
    protected conn: API_Connector;
    protected log: Logger;
    protected commandParser: CommandParser;
    protected gameInfos: GameInfosData

    constructor(conn: API_Connector, gameInfos: GameInfosData) {
        this.conn = conn;
        try {
            this.log = new Logger(gameInfos.game.toUpperCase(), "debug", true, "blue");
            this.log.info(`New game instance for: ${gameInfos.game} - ${gameInfos.gameName}`);
        } catch (e) { console.error("error - Init log:", e); }
        this.commandParser = new CommandParser(conn);
        this.gameInfos = gameInfos;

        // Écoute des événements communs
        this.conn.on("RoomCreate", this.onRoomCreate);
        this.conn.on("RoomJoin", this.onRoomJoin);
    }

    // Méthode d'initialisation commune
    public async init(): Promise<void> {
        this.log.info(`Initializing game: ${this.gameInfos.game}`);
    }

    public async updateGameInfos(gameInfos?: GameInfosData): Promise<void> {
        this.gameInfos = gameInfos || this.gameInfos;
        this.setupRoom();
        this.setupCharacter();
    }

    // Méthode d'arrêt commune
    public async stop(): Promise<void> {
        this.log.info(`Stopping game: ${this.gameInfos.game}`);
        this.conn.off("RoomCreate", this.onRoomCreate);
        this.conn.off("RoomJoin", this.onRoomJoin);
        this.commandParser.stop();

        // Call specific game tasks
        await this.cleanupGameSpecific();
    }
    
    // Protected methos for specific stopping task
    protected async cleanupGameSpecific(): Promise<void> {}

    // Méthodes à surcharger par les jeux spécifiques
    protected abstract setupRoom(): Promise<void>;
    protected abstract setupCharacter(): Promise<void>;

    // Gestion des événements communs
    protected onRoomCreate = async () => {
        this.log.info("Room created, setting up...");
        await this.setupRoom();
        await this.setupCharacter();
    };

    protected onRoomJoin = async () => {
        this.log.info("Bot joined the room, setting up character...");
        await this.setupCharacter();
    };


}
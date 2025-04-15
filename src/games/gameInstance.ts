import { API_Connector, CoordObject } from "../apiConnector";
import { CommandParser } from "../commandParser";
import { Logger } from "../utils/logger";
import { GameInfosData } from "../managers/config/gameInfos";

export abstract class GameInstance {
    protected conn: API_Connector;
    protected log: Logger;
    protected commandParser: CommandParser;

    constructor(conn: API_Connector, protected gameInfos: GameInfosData) {
        this.conn = conn;
        this.log = new Logger(gameInfos.game.toUpperCase(), "debug", true, "blue");
        this.commandParser = new CommandParser(conn);

        // Écoute des événements communs
        this.conn.on("RoomCreate", this.onRoomCreate);
        this.conn.on("RoomJoin", this.onRoomJoin);
    }

    // Méthode d'initialisation commune
    public async init(): Promise<void> {
        this.log.info(`Initializing game: ${this.gameInfos.game}`);
        await this.setupRoom();
        await this.setupCharacter();
    }

    // Méthode d'arrêt commune
    public async stop(): Promise<void> {
        this.log.info(`Stopping game: ${this.gameInfos.game}`);
        this.conn.off("RoomCreate", this.onRoomCreate);
        this.conn.off("RoomJoin", this.onRoomJoin);
        this.commandParser.clear();
    }

    // Méthodes à surcharger par les jeux spécifiques
    protected abstract setupRoom(): Promise<void>;
    protected abstract setupCharacter(): Promise<void>;

    // Gestion des événements communs
    private onRoomCreate = async () => {
        this.log.info("Room created, setting up...");
        await this.setupRoom();
        await this.setupCharacter();
    };

    private onRoomJoin = async () => {
        this.log.info("Bot joined the room, setting up character...");
        await this.setupCharacter();
    };

    // Méthode utilitaire pour enregistrer des commandes
    protected registerCommand(command: string, handler: (...args: any[]) => void): void {
        this.commandParser.register(command, handler);
    }
}
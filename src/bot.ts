/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { decompressFromBase64, compressToBase64 } from "lz-string";
import { Logger } from './api';
import { KidnappersGameRoom } from "./hub/logic/kidnappersGameRoom";
import { API_Connector } from "./apiConnector";
import { API_Chatroom_Data } from "./apiChatroom";
import { RoleplaychallengeGameRoom } from "./hub/logic/roleplaychallengeGameRoom";
import { Dare } from "./games/dare";
import { ConfigFile, getDefaultConfig } from "./config";
import { Db, MongoClient } from "mongodb";
import { PetSpa } from "./games/petspa";
import { Home } from "./games/home";
import { Laby } from "./games/laby";
import { MaidsPartyNightSinglePlayerAdventure } from "./hub/logic/maidsPartyNightSinglePlayerAdventure";
import { Casino } from "./games/casino";

const SERVER_URL = {
    live: "https://bondage-club-server.herokuapp.com/",
    test: "https://bondage-club-server-test.herokuapp.com/",
};

export class BotManager {
    private config: ConfigFile;
    private connector?: API_Connector;
    private mongoClient?: MongoClient
    private db?: Db;
    private gameInstance?: any;
    public log: Logger;

    constructor(private configOverride?: ConfigFile) {

        this.log = new Logger('BOTM', 'debug', true, 'red');
    }

    public async startBot(): Promise<void> {
        this.config = this.configOverride || await getDefaultConfig();
        const serverUrl = this.config.url ?? SERVER_URL[this.config.env];

        if (!serverUrl) {
            this.log.log("env must be live or test");
            throw new Error("Invalid environment configuration");
        }

        if (this.config.mongo_uri && this.config.mongo_db) {
            this.mongoClient = new MongoClient(this.config.mongo_uri, {
                ssl: true,
                tls: true,
            });
            this.log.log("Connecting to mongo...");
            await this.mongoClient.connect();
            this.log.log("...connected!");
            this.db = this.mongoClient.db(this.config.mongo_db);
            await this.db.command({ ping: 1 });
            this.log.log("...ping successful!");
        }

        this.connector = new API_Connector(
            serverUrl,
            this.config.user,
            this.config.password,
            this.config.env,
        );
        await this.connector.joinOrCreateRoom(this.config.room);

        await this.startGame();
    }

    public async startGame(): Promise<void> {
        if (this.gameInstance !== undefined) {
            this.log.error("Game was already started.");
            throw new Error("Game was already started.");
        }
        switch (this.config.game) {
            case undefined:
                break;
            case "kidnappers":
                this.log.log("Starting game: Kidnappers");
                this.gameInstance = new KidnappersGameRoom(this.connector, this.config);
                this.connector.accountUpdate({ Nickname: "Kidnappers Bot" });
                this.connector.setBotDescription(KidnappersGameRoom.description);
                this.connector.startBot(this.gameInstance);
                break;
            case "roleplay":
                this.log.log("Starting game: Roleplay challenge");
                this.gameInstance = new RoleplaychallengeGameRoom(this.connector, this.config);
                this.connector.setBotDescription(RoleplaychallengeGameRoom.description);
                this.connector.startBot(this.gameInstance);
                break;
            case "maidspartynight":
                this.log.log("Starting game: Maid's Party Night");
                if (!this.config.user2 || !this.config.password2) {
                    this.log.error("Need user2 and password2 for Maid's Party Night");
                    throw new Error("Missing user2 and password2 for Maid's Party Night");
                }
                const connector2 = new API_Connector(
                    this.config.url ?? SERVER_URL[this.config.env],
                    this.config.user2,
                    this.config.password2,
                    this.config.env,
                );
                this.gameInstance = new MaidsPartyNightSinglePlayerAdventure(this.connector, connector2);
                this.connector.startBot(this.gameInstance);
                break;
            case "dare":
                this.log.log("Starting game: Dare");
                this.connector.accountUpdate({ Nickname: "Dare Bot" });
                this.gameInstance = new Dare(this.connector);
                this.connector.setBotDescription(Dare.description);
                break;
            case "petspa":
                this.log.log("Starting game: Pet Spa");
                this.gameInstance = new PetSpa(this.connector);
                await this.gameInstance.init();
                this.connector.setBotDescription(PetSpa.description);
                break;
            case "home":
                this.log.log("Starting game: Home");
                this.gameInstance = new Home(this.connector, this.config.superusers);
                await this.gameInstance.init();
                this.connector.setBotDescription(Home.description);
                break;
            case "laby":
                this.log.log("Starting game: Labyrinthe");
                this.gameInstance = new Laby(this.connector, this.config.superusers, this.config.gameName);
                await this.gameInstance.init();
                break;
            case "casino":
                this.log.log("Starting game: Casino");
                this.gameInstance = new Casino(this.connector, this.db, this.config.casino);
                break;
            default:
                this.log.error("No such game");
                throw new Error("Invalid game configuration");
        }
    }

    public async stopGame(): Promise<boolean> {
        // Stop the game but keep the bot connected to the server

        let stopped = false;
        // Stop the current game instance
        if (this.gameInstance && typeof this.gameInstance.stop === "function") {
            this.log.log("Stopping the current game instance...");
            this.gameInstance.stop();
            this.gameInstance = undefined;
            stopped = true;
        } else {
            this.log.warn("This game wasn't set to be stopped. Stop the bot before reset.");
        }
        return stopped;
    }

    public async stopBot(): Promise<void> {
        this.log.info("Stopping bot...");

        // Stop the current game instance
        try {
            await this.stopGame();
        }
        catch (e) {
            this.log.warn(`Error trying to stop game before stopping Bot`);
        }
        this.gameInstance = undefined;

        // Disconnect from the server
        if (this.connector) {
            this.log.info("Disconnecting from the server...");
            this.connector.disconnect();
            this.connector = undefined;
        }

        // Close the database connection
        if (this.mongoClient) {
            this.log.info("Closing the database connection...");
            await this.mongoClient.close();
            this.mongoClient = undefined;
            this.db = undefined;
        }

        this.log.info("Bot stopped successfully.");

    }

    public getGameStatus() {
        let isgameRunning: boolean = Boolean(this.gameInstance);
        let game: string = this.config.game;
        let gameName: string = this.config.gameName;

        return {
            botName: this.connector?.Player.Name,
            botNumber: this.connector?.Player.MemberNumber,
            isRunning: isgameRunning || false,
            game: game || null,
            gameName: gameName || null,
        };

    }
    public getRoomInfos() {
        let playerCount: number = this.connector?.chatRoom?.charactersCount;
        let roomData: API_Chatroom_Data = JSON.parse(JSON.stringify(this.connector?.chatRoom?.roomData));
        let roomMap: string = compressToBase64(JSON.stringify(this.connector?.chatRoom?.roomData?.MapData));
        
        return {
            playerCount: playerCount || 0,
            roomData: roomData || undefined,
            roomMap: roomMap || undefined
        };
    }


    public updateConfig(config: ConfigFile): void {
        this.config = config;
    }
}

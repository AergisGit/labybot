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

import { compressToBase64 } from "lz-string";
import { Logger } from '../utils/logger';
import { API_Connector } from "../apiConnector";
import { API_Chatroom_Data } from "../apiChatroom";
import { ConfigFile } from "./config/config";
import { Db, MongoClient } from "mongodb";


export const SERVER_URL = {
    live: "https://bondage-club-server.herokuapp.com/",
    test: "https://bondage-club-server-test.herokuapp.com/",
};

export class BotManager {
    private config: ConfigFile;
    private connector?: API_Connector;
    private mongoClient?: MongoClient
    private db?: Db;
    public log: Logger;

    constructor(config: ConfigFile) {
        this.log = new Logger('BOTM', 'debug', true, 'red');
        this.config = config;
    }

    public async startBot(): Promise<void> {
        const serverUrl = this.config.url ?? SERVER_URL[this.config.env];

        if (!serverUrl) {
            this.log.log("env must be live or test");
            throw new Error("Invalid environment configuration");
        }

        this.connector = new API_Connector(
            serverUrl,
            this.config.user,
            this.config.password,
            this.config.env,
        );
        await this.connector.joinOrCreateRoom(this.config.room);
        this.log.info("Bot connected successfully.");
        //await this.startGame();
    }

    public async stopBot(): Promise<void> {
        this.log.info("Stopping bot...");

        // Disconnect from the server
        if (this.connector) {
            this.log.info("Disconnecting from the server...");
            this.connector.disconnect();
            this.connector = undefined;
        }

        await this.disconnectFromDatabase();

        this.log.info("Bot stopped successfully.");

    }


    public getConnector(): API_Connector {
        return this.connector;
    }

    public getDB(): Db {
        return this.db;
    }

    public async connectToDatabase(mongo_db: string): Promise<void> {
        try {
            if (this.config.mongo_uri && mongo_db && !this.db) {
                this.mongoClient = new MongoClient(this.config.mongo_uri, {
                    ssl: false,
                    tls: false,
                });
                this.log.log("Connecting to mongo... On Url: ", this.config.mongo_uri);
                await this.mongoClient.connect();
                this.log.log("...connected! Accessing database: ", mongo_db);
                this.db = this.mongoClient.db(mongo_db);
                await this.db.command({ ping: 1 });
                this.log.log("...ping successful!");
            } else {
                this.log.log("MongoDB connection not needed or already connected.");
                this.log.debug("uri:", this.config.mongo_uri, "db: ", mongo_db, "db: ", this.db);
            }
        } catch (e) {
            this.log.error("Error connecting to MongoDB:", e);
        }
    }

    public async disconnectFromDatabase(): Promise<void> {
        if (!this.mongoClient) {
            this.log.info("No active MongoDB connection to close.");
            return;
        }

        try {
            this.log.info("Closing the database connection...");
            await this.mongoClient.close();
        } catch (e) {
            this.log.error("Error while closing the database connection:", e);
        } finally {
            // Nettoyer les références même en cas d'erreur
            this.mongoClient = undefined;
            this.db = undefined;
        }

    }

    public getRoomInfos() {
        let playerCount: number = this.connector?.chatRoom?.charactersCount;
        let roomMap: string = this.connector?.chatRoom?.roomData?.MapData
            ? compressToBase64(JSON.stringify(this.connector.chatRoom.roomData.MapData))
            : undefined;
        let roomData: API_Chatroom_Data = this.connector?.chatRoom?.roomData
            ? JSON.parse(JSON.stringify(this.connector.chatRoom.roomData))
            : undefined;

        return {
            playerCount: playerCount || 0,
            roomMap: roomMap || undefined,
            roomData: roomData || undefined
        };
    }

    public getBotDetails() {
        let botName: string = this.connector?.Player?.Name;
        let botNumber: number = this.connector?.Player?.MemberNumber;
        return {
            botName: botName || null,
            botNumber: botNumber || null,
        }
    }

    public updateConfig(config: ConfigFile): void {
        this.config = config;
    }
}

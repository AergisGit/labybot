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
import { Logger } from '../api';
import { API_Connector } from "../apiConnector";
import { API_Chatroom_Data } from "../apiChatroom";
import { ConfigFile } from "../config";
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

        // Close the database connection
        if (this.mongoClient) {
            this.log.info("Closing the database connection...");
            await this.mongoClient.close();
            this.mongoClient = undefined;
            this.db = undefined;
        }

        this.log.info("Bot stopped successfully.");

    }

    public getConnector(): API_Connector {
        return this.connector;
    }
    
    public getDB(): Db {
        return this.db;
    }

    public getRoomInfos() {
        let playerCount: number = this.connector?.chatRoom?.charactersCount;
        let roomMap: string = compressToBase64(JSON.stringify(this.connector?.chatRoom?.roomData?.MapData));
        let roomData: API_Chatroom_Data = JSON.parse(JSON.stringify(this.connector?.chatRoom?.roomData));
        
        return {
            playerCount: playerCount || 0,
            roomMap: roomMap || undefined,
            roomData: roomData || undefined
        };
    }

    public getBotDetails() {
        let botName: string = this.connector?.Player?.Name;
        let botNumber: number= this.connector?.Player?.MemberNumber;
        return {
            botName: botName || null,
            botNumber: botNumber || null,
        }
    }

    public updateConfig(config: ConfigFile): void {
        this.config = config;
    }
}

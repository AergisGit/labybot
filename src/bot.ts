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

import { logger } from './api';
import { KidnappersGameRoom } from "./hub/logic/kidnappersGameRoom";
import { API_Connector } from "./apiConnector";
import { RoleplaychallengeGameRoom } from "./hub/logic/roleplaychallengeGameRoom";
import { Dare } from "./games/dare";
import { readFile } from "fs/promises";
import { ConfigFile } from "./config";
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

export interface RopeyBot {
    connector: API_Connector;
    config: ConfigFile;
    db?: Db;
    game: string;
}

export async function startBot(): Promise<RopeyBot> {
    process.on("SIGINT", () => {
        logger.log("SIGINT received, exiting");
        process.exit(0);
    });

    process.on("SIGTERM", () => {
        logger.log("SIGTERM received, exiting");
        process.exit(0);
    });

    const cfgFile = process.argv[2] ?? "./config.json";

    const configString = await readFile(cfgFile, "utf-8");
    const config = JSON.parse(configString) as ConfigFile;

    const serverUrl = config.url ?? SERVER_URL[config.env];

    if (!serverUrl) {
        logger.log("env must be live or test");
        process.exit(1);
    }

    let db;
    if (config.mongo_uri && config.mongo_db) {
        const mongoClient = new MongoClient(config.mongo_uri, {
            ssl: true,
            tls: true,
        });
        logger.log("Connecting to mongo...");
        await mongoClient.connect();
        logger.log("...connected!");
        db = mongoClient.db(config.mongo_db);
        await db.command({ ping: 1 });
        logger.log("...ping successful!");
    }

    const connector = new API_Connector(
        serverUrl,
        config.user,
        config.password,
        config.env,
    );
    await connector.joinOrCreateRoom(config.room);

    switch (config.game) {
        case undefined:
            break;
        case "kidnappers":
            logger.log("Starting game: Kidnappers");
            const kidnappersGame = new KidnappersGameRoom(connector, config);
            connector.accountUpdate({ Nickname: "Kidnappers Bot" });
            connector.setBotDescription(KidnappersGameRoom.description);
            connector.startBot(kidnappersGame);
            break;
        case "roleplay":
            logger.log("Starting game: Roleplay challenge");
            const roleplayGame = new RoleplaychallengeGameRoom(
                connector,
                config,
            );
            connector.setBotDescription(RoleplaychallengeGameRoom.description);
            connector.startBot(roleplayGame);
            break;
        case "maidspartynight":
            logger.log("Starting game: Maid's Party Night");
            if (!config.user2 || !config.password2) {
                logger.log("Need user2 and password2 for Maid's Party Night");
                process.exit(1);
            }
            const connector2 = new API_Connector(
                serverUrl,
                config.user2,
                config.password2,
                config.env,
            );
            const maidsPartyNightGame = new MaidsPartyNightSinglePlayerAdventure(connector, connector2);
            connector.startBot(maidsPartyNightGame);
            break;
        case "dare":
            logger.log("Starting game: dare");
            connector.accountUpdate({ Nickname: "Dare Bot" });
            new Dare(connector);
            connector.setBotDescription(Dare.description);
            break;
        case "petspa":
            logger.log("Starting game: Pet Spa");
            const petSpaGame = new PetSpa(connector);
            await petSpaGame.init();
            connector.setBotDescription(PetSpa.description);
            break;
        case "home":
            logger.log("Starting game: Home");
            const homeGame = new Home(connector, config.superusers);
            await homeGame.init();
            connector.setBotDescription(Home.description);
            break;
        case "laby":
            logger.log("Starting game: Labyrinthe");
            const labyGame = new Laby(connector, config.superusers, config.gameName);
            await labyGame.init();
            break;
        case "casino":
            logger.log("Starting game: Casino");
            new Casino(connector, db, config.casino);
            break;
        default:
            logger.log("No such game");
            process.exit(1);
    }

    return {
        connector,
        config,
        db,
        game: config.game,
    };
}

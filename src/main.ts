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

import { Logger, logger } from './utils/logger';
//import { startBot } from "./bot";
import { GameManager } from './managers/gameManager'
import { AdminServer } from './admin/adminServer';


async function main() {
    const log = new Logger("MAIN", "debug", true, 'red' );

    
    log.info(" ▄█        ▄████████ ▀█████████▄  ▄██   ▄       ▀█████████▄   ▄██████▄      ███    ");
    log.info("███       ███    ███   ███    ███ ███   ██▄       ███    ███ ███    ███ ▀█████████▄");
    log.info("███       ███    ███   ███    ███ ███▄▄▄███       ███    ███ ███    ███    ▀███▀▀██");
    log.info("███       ███    ███  ▄███▄▄▄██▀  ▀▀▀▀▀▀███      ▄███▄▄▄██▀  ███    ███     ███   ▀");
    log.info("███     ▀███████████ ▀▀███▀▀▀██▄  ▄██   ███     ▀▀███▀▀▀██▄  ███    ███     ███    ");
    log.info("███       ███    ███   ███    ██▄ ███   ███       ███    ██▄ ███    ███     ███    ");
    log.info("███▌    ▄ ███    ███   ███    ███ ███   ███       ███    ███ ███    ███     ███    ");
    log.info("█████▄▄██ ███    █▀  ▄█████████▀   ▀█████▀      ▄█████████▀   ▀██████▀     ▄████▀  ");
    log.info("▀");


    // Start GameManager
    log.info('Sarting GameManager...');
    const gameManager = new GameManager();
    await gameManager.initialize();
    log.info('GameManager started');

    // Start AdminServer
    log.info('Sarting AdminServer...');
    const adminServer = new AdminServer(gameManager);
    adminServer.startAdminServer();
    log.info('AdminServer started');

    // Start the default game configuration
    await gameManager.startBot(0);

    process.on("SIGINT", () => {
        log.info("SIGINT received, exiting");
        process.exit(0);
    });

    process.on("SIGTERM", () => {
        log.info("SIGTERM received, exiting");
        process.exit(0);
    });
}

main().catch((e) => {
    logger.error("Fatal error: ", e);
    process.exit(1);
});

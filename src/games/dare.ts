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

import { readFile, writeFile } from "fs/promises";
import { API_Connector } from "../apiConnector";
import { CommandParser } from "../commandParser";
import { wait } from "../utils/time";
import { API_Character } from "../apiCharacter";
import { BC_Server_ChatRoomMessage } from "../logicEvent";
import { Logger } from '../utils/logger';
import { GameInfosData } from "@shared/types/game";

export class Dare { 
    public log: Logger;
    private commandParser: CommandParser;
    private conn: API_Connector
    private gameInfos: GameInfosData;

    private allDares: string[];
    private unusedDares: string[];

    public constructor(conn: API_Connector, gameInfos: GameInfosData) {
        this.log = new Logger('DARE', 'debug', true, 'green');
        this.log.info("Dare instance created");

        this.commandParser = new CommandParser(conn);
        this.conn = conn
        this.gameInfos = gameInfos;
    }

    public async init(): Promise<void> {

        // Mise en place initiale de la salle
        try {
            this.log.info("Joining room: ", this.gameInfos.room.Name);
            await this.conn.joinOrCreateAnotherRoom(this.gameInfos.room);
        } catch (e) {
            this.log.error("Failed to join or create room: ", e);
        }

        this.commandParser.register("pick", this.onPick);
        this.commandParser.register("dare", this.onDare);

        this.loadDares();

        this.conn.accountUpdate({ Nickname: "Dare Bot" });
        this.conn.setBotDescription(this.gameInfos.botDescription.join("\n"));
    }


    public async stop(): Promise<void> {
        this.log.info(`Stopping game: ${this.gameInfos.game}`);
        this.commandParser.stop();
        
        this.conn.accountUpdate({ Nickname: "" });
        this.allDares = [];
        
        // wait any unresolved events to be finished
        await wait(2000);
    }


    private async loadDares(): Promise<void> {
        let result: string;

        try {
            result = await readFile("dares.json", "utf-8");
            this.allDares = JSON.parse(result);
        } catch (e) {
            this.allDares = [];
        }

        try {
            result = await readFile("unuseddares.json", "utf-8");
            this.unusedDares = JSON.parse(result);
        } catch (e) {
            this.unusedDares = [];
        }
    }

    private addDare(dare: string) {
        this.allDares.push(dare);
        this.unusedDares.push(dare);
        this.saveDares();
    }

    private async saveDares(): Promise<void> {
        await writeFile(`dares.json`, JSON.stringify(this.allDares));
        await writeFile(`unuseddares.json`, JSON.stringify(this.unusedDares));
    }

    private dareSummary(): string {
        return `${this.unusedDares.length} dares remain out of ${this.allDares.length} total.`;
    }

    onDare = async (
        senderCharacter: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if (args.length < 1) {
            this.conn.SendMessage("Emote", "*" + this.dareSummary());
            return;
        }

        switch (args[0]) {
            case "add":
                if (args.length < 2) {
                    this.conn.SendMessage("Emote", "*Usage: !dare add <dare>");
                    return;
                }
                this.addDare(args.slice(1).join(" "));
                this.conn.SendMessage(
                    "Emote",
                    `*Dare saved, thanks ${senderCharacter}! ${this.dareSummary()}`,
                );

                break;
            case "draw":
                if (this.unusedDares.length === 0) {
                    this.conn.SendMessage("Emote", `*No more dares left!`);
                    return;
                }
                this.conn.SendMessage(
                    "Emote",
                    `*${senderCharacter} draws a dare card...`,
                );
                await wait(2000);

                const n = Math.floor(Math.random() * this.unusedDares.length);
                const dare = this.unusedDares[n];
                this.unusedDares.splice(n, 1);
                this.saveDares();
                this.conn.SendMessage(
                    "Emote",
                    `*${senderCharacter} draws: ${dare}\n${this.dareSummary()}`,
                );
                break;
            case "reset":
                this.unusedDares = Array.from(this.allDares);
                this.saveDares();
                this.conn.SendMessage("Emote", "*" + this.dareSummary());
                break;
            default:
                this.conn.SendMessage(
                    "Emote",
                    "*Usage: !dare <add|draw|reset>",
                );
                return;
        }
    };

    onPick = async (
        senderCharacter: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        this.conn.SendMessage("Emote", `*${senderCharacter} randomly selects a room member...`);
        await wait(2000);

        const possibleMembers = this.conn.chatRoom.characters.filter((m) => ![senderCharacter.MemberNumber, this.conn.Player.MemberNumber].includes(m.MemberNumber));
        const n = Math.floor(Math.random() * possibleMembers.length);
        const target = possibleMembers[n];
        this.conn.SendMessage("Emote", `*${target} has been selected!`);
    }
}

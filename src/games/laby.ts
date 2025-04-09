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

// Les imports ci-dessous servent à ce que le code sur cette page puissent utiliser du contenu d'autres fichiers du projet
//
import { decompressFromBase64, compressToBase64 } from "lz-string";
import { API_Connector, CoordObject } from "../apiConnector";
import { API_Character } from "../apiCharacter";
import { AssetGet, BC_AppearanceItem, API_AppearanceItem } from "../item";
import { CommandParser } from "../commandParser";
import { BC_Server_ChatRoomMessage } from "../logicEvent";
import { formatDuration, wait} from "../util/time";

import { Logger } from '../api';
import { perf } from '../util/perf';
import { TriggerDef, TriggerManager } from "./utils/triggerManager";
import { ResourceData, ResourceLoader } from "./utils/gameResources";
import { triggersData as triggersData_LabyYumi1, BOT_POSITION as BOT_POSITION_labyYumi1, MAP as MAP_labyYumi1, BOT_DESCRIPTION } from './laby/data/labyYumi1';
import * as fs from 'fs'; // for the winners and challengers list

// Carte
const MAP = MAP_labyYumi1;
// Coordonnées du bot
const BOT_POSITION = BOT_POSITION_labyYumi1;
// Triggers
const triggersData = triggersData_LabyYumi1;

const SAVEFILE_PATH = "/bot/save/";
const SAVEFILE_NAME = "save_labyYumi1.json";

// functions helper

function replacePlaceholdersWithVariables(message: string, variables: { [key: string]: string }): string {
    return message.replace(/\[([^\]]+)\]/g, (match, p1) => {
        // Remplacer par la valeur correspondante ou garder le texte original si aucune correspondance
        return variables[p1] || match;
    });
}

function isBCAppearanceItem(obj: any): obj is BC_AppearanceItem {
    return obj && typeof obj.Group === "string" && typeof obj.Name === "string";
}

const bondageItemGroups = ['ItemAddon', 'ItemArms', 'ItemBoots', 'ItemBreast', 'ItemButt', 'ItemDevices', 'ItemEars', 
    'ItemFeet', 'ItemHands', 'ItemHead', 'ItemHood', 'ItemLegs', 'ItemMisc', 'ItemMouth', 'ItemMouth2', 
    'ItemMouth3', 'ItemNeck', 'ItemNeckAccessories', 'ItemNeckRestraints', 'ItemNipples', 'ItemNipplesPiercings', 
    'ItemNose', 'ItemPelvis', 'ItemTorso', 'ItemTorso2', 'ItemVulva', 'ItemVulvaPiercings', 'ItemHandheld'];


export class Laby {
    // gestion automatisée des triggers depuis une definition
    private triggerManager: TriggerManager;
    public log: Logger;
    // variable contenant la description du bot pour sa bio
    public botDescription = [
        "Welcome to the Enchanted Labyrinth!",
        "\nYou are about to enter a place protected by powerful magical forces.",
        "\nHere are a few things to know:",
        "This maze is made up of several areas, and a mysterious path will give you some clues, but be careful not to fall into its traps. You could find yourself completely tied up for between 5 and 15 minutes. You'll also have choices to make; we advise you to make the right one, otherwise, a nasty consequence awaits you.",
        "\n\nCommands:\n",
        "/bot fame - Gives you the time spent by our best challengers!",
        "/bot who - Who is challenging this labyrinth?",
        "/bot time - How long you've been in the Labyrinth",
        "\nThe current layout is designed by Yumi (189644).",
        "This bot runs on a customized version of Ropeybot.",
        "Code at https://github.com/FriendsOfBC/ropeybot",
    ].join("\n");

    // liste des gens entrés dans le labyrinthe)
    private listChallenger = new Map<number, number>();
    private listVictory = new Map<string, number>();

    private commandParser: CommandParser;

    public constructor(private conn: API_Connector, private superusers: number[], private gameName: string) {
        
        this.log = new Logger('LABY', 'debug', true, 'green');
        this.commandParser = new CommandParser(this.conn);

        // Déclancheurs via commandes texte, reçues apres "/bot "
        this.commandParser.register("fame", this.onCommandWhoWon);
        this.commandParser.register("who", this.onCommandResidents);
        this.commandParser.register("time", this.onCommandTime);
        this.commandParser.register("free", this.onCommandFree);
        this.commandParser.register("updateroom", this.onCommandUpdateRoom);
        this.commandParser.register("reset", this.onCommandReset);
        this.commandParser.register("debug", this.onCommandDebug);

        // Mise à jour de la description du bot
        
        this.conn.setBotDescription(this.botDescription);

        
        // Chargement des ressources pour le labyrinthe
        const resourceLoader = new ResourceLoader('laby');

        // Charger une ressource spécifique
        const resourceData:ResourceData = resourceLoader.loadResource(gameName);
        if (resourceData) { // le temps du debug
            this.log.debug('ResourceData - map: ', resourceData.map);
            this.log.debug('ResourceData - botPosition: ', resourceData.botPosition);
        }

        // Déclancheur sur reception d'un message peut importe son contenu
        //conn.on("Message", this.onMessage);
        
        // triggers sur évenements provenant de API_Connector
        this.conn.on("RoomCreate", this.onChatRoomCreated);
        this.conn.on("RoomJoin", this.onChatRoomJoined);

        // Déclancheurs via arrivée d'un personnage sur des coordonnées ou régions
        this.triggerManager = new TriggerManager(this.conn);

        // Add triggers to the map using the TriggerManager
        this.triggerManager.addTriggersFromData(triggersData, this.onWalkTriggerActivated.bind(this));  // Pass callback


        // Debug trigger mit manuellement :
        //this.conn.chatRoom.map.addTileTrigger({"X":8,"Y":27}, this.onCharacterEnterTrolley);

    }

    // Cette fonction d'initalisation est appelée après la constructeur
    public async init(): Promise<void> {
        // Mise en place initiale de la salle
        await this.setupRoom();

        // Actions qu'on souhaite que le personnage du bot fasse en entrant dans la pièce
        await this.setupCharacter();

        this.loadDataFromFile();
    }


    public stop(): boolean {
        this.log.info("Stopping Laby game...");
    
        // Désenregistrer les listeners dans conn
        this.conn.off("RoomCreate", this.onChatRoomCreated);
        this.conn.off("RoomJoin", this.onChatRoomJoined);
    
        // Nettoyer les triggers dans triggerManager
        this.triggerManager.clearAllTriggers();
        
        // Nettoyer les triggers placés en dur :
        //this.conn.chatRoom.map.removeTileTrigger(8,27, this.onCharacterEnterTrolley);

        // Désenregistrer les commandes dans commandParser
        this.commandParser.unregister("fame");
        this.commandParser.unregister("who");
        this.commandParser.unregister("time");
        this.commandParser.unregister("free");
        this.commandParser.unregister("updateroom");
        this.commandParser.unregister("reset");
        this.commandParser.unregister("debug");

        this.log.info("Laby game stopped.");
        return true;
    }


    private onChatRoomCreated = async () => {
        await this.setupRoom();
        await this.setupCharacter();
    };

    private onChatRoomJoined = async () => {
        await this.setupCharacter();
    };

    private setupRoom = async () => {
        try {
            this.conn.chatRoom.map.setMapFromString(MAP);
        } catch (e) {
            this.log.error("Map data not loaded", e);
        }
    };

    private setupCharacter = async () => {
        this.conn.moveOnMap(BOT_POSITION.X, BOT_POSITION.Y);
        this.conn.Player.SetActivePose(["Kneel"]);
    };


    // Callback function to be invoked when a trigger is activated
    private onWalkTriggerActivated = async (character: API_Character, triggerData: TriggerDef) => {
        
        const id = perf.start("onWalkTriggerActivated");
        

        this.log.info(`Trigger: ${triggerData.name} - Actions: ${triggerData.actions}`);
        for (const action of triggerData.actions) {
            switch (action) {
                case "Whisper":
                    if (triggerData.message) {
                        character.Tell("Whisper", `(${triggerData.message})`);
                    }
                    break;
        
                case "Message":
                    if( !Boolean(triggerData.effect === "VICTORY") ) {
                        if (triggerData.message) {
                            const displayName = character.NickName && character.NickName.trim() !== "" ? character.NickName : character.Name;
                            let variables = { "Nom": `${displayName}` };
                            let messageModifié = replacePlaceholdersWithVariables(triggerData.message, variables);
                            this.conn.SendMessage("Chat", messageModifié);
                        }
                    }
                    break;
        
                case "Effect":
                    switch (triggerData.effect) {
                        case "ENTER":
                            // Enregistrer le nouveau joueur qui entre
                            this.newChallenger(character);

                            break;
                        case "VICTORY":
                            // Prendre en compte la victoire
                            const duration = formatDuration(this.playerVictory(character));
                            if (triggerData.message) {
                                const displayName = character.NickName && character.NickName.trim() !== "" ? character.NickName : character.Name;
                                let variables = { "Name": `${displayName}`, "Duration": `${duration}`};
                                let messageModifié = replacePlaceholdersWithVariables(triggerData.message, variables);
                                this.conn.SendMessage("Chat", messageModifié);
                            }
                            break;
                    }
                    break;

                case "Door":
                    // This code will change the object on effect coord, with the new name, or with blank

                    if(triggerData.effect) {
                        // Séparer la chaîne en deux parties : l'action et les coordonnées
                        const [effectAction, coords, nameObject] = triggerData.effect.split(";");
                        // Extraire les coordonnées en enlevant les crochets et en les séparant par la virgule
                        const [x, y] = coords.slice(1, -1).split(",").map(Number);
                        // Créer un objet de type CoordObject
                        const coordObject: CoordObject = { X: x, Y: y };
                        
                        if(effectAction === "Hide"){
                            this.conn.chatRoom.map.setObject(
                                coordObject,
                                "Blank",
                            );
                        } else if(effectAction === "Set"){
                            this.conn.chatRoom.map.setObject(
                                coordObject,
                                nameObject
                            );
                        }
                    }
                    break;

                case "Tile":
                    // This code will change the tile on effect coord, with the new name set

                    if(triggerData.effect) {
                        // Séparer la chaîne en deux parties : l'action et les coordonnées
                        const [effectAction, coords, nameObject, typeObject] = triggerData.effect.split(";");
                        // Extraire les coordonnées en enlevant les crochets et en les séparant par la virgule
                        const [x, y] = coords.slice(1, -1).split(",").map(Number);
                        // Créer un objet de type CoordObject
                        const coordObject: CoordObject = { X: x, Y: y };
                        
                        if(effectAction === "Set"){
                            this.conn.chatRoom.map.setTile(
                                coordObject,
                                nameObject,
                                typeObject
                            );
                        }
                    }
                    break;
        
                case "Bond":
                    // Traitement spécifique pour "Bond"

                    if (triggerData.link) {
                        //this.log.debug(`Link: ${triggerData.link}`);
                        const linkData = JSON.parse(decompressFromBase64(triggerData.link));
                        
                        let doLock = false;
                        let minutesLocked = 5;
                        if(triggerData.effect) {
                            const regex = /^(\d+)m$/;
                            const match = triggerData.effect.match(regex);
                            if (match) {
                                doLock=true;
                                minutesLocked = parseInt(match[1], 10);
                            }
                        }

                        if (Array.isArray(linkData)) {
                            // Initialisation
                            
                            // Tri des items avant la boucle
                            const idPerfTri = perf.start("sortedLinkData");
                            const sortedLinkData = this.sortByPriority(linkData);
                            perf.end("sortedLinkData", idPerfTri);

                            // Boucle sur les éléments triés
                            for (const bondageItemData of sortedLinkData) {
                                if (isBCAppearanceItem(bondageItemData)) {
                                    this.log.debug(`Using item: ${bondageItemData.Name} in group ${bondageItemData.Group}`);
                                    
                                    const bondageItem = character.Appearance.AddItem(bondageItemData);
                                    bondageItem.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
                                        Password: "YUMILABY",
                                        Hint: "Eight letters, where are you?",
                                        RemoveItem: true,
                                        RemoveTimer: Date.now() + minutesLocked * 60 * 1000,
                                        ShowTimer: true,
                                        LockSet: true,
                                    });

                                    await wait(100);
                                } else {
                                    this.log.error("Invalid item format!");
                                }
                            }
                        }
                    }
                    break;
        
                default:
                    this.log.warn(`Unknown action: ${action}`);
                    // Traitement par défaut si l'action n'est pas reconnue
                    break;
            }
        };

        perf.end("onWalkTriggerActivated", id);
    }
    

    private async freeCharacter(character: API_Character): Promise<void> {
        this.log.info("!free - Remove bondage items");
        for( const ItemGroup of bondageItemGroups ) {
            character.Appearance.RemoveItem(ItemGroup);
            await wait(100);
        }
    }
   
    
    private newChallenger(character: API_Character): void {
        // Ajouter au tableau des entrées avec la date d'entrée
        // S'il existe déjà, remplacer les données
        this.listChallenger.set(character.MemberNumber, Date.now());
        this.saveDataToFile();
    }

    private playerVictory(character: API_Character): number {
        // Ajouter au tableau des victoires
        //   voir si c'est le meilleurs score du joueur, sinon ne pas l'ajouter

        this.freeCharacter(character);

        const characterDescription = character.Name + " (" + character.MemberNumber + ")";
        let entryTime = this.listChallenger.get(character.MemberNumber);

        let exitTime = Date.now()
        // Not in the list ? Something happened ! Put arbitrary time (24h) and tell them we're sorry about that
        if (entryTime === undefined) {
            entryTime = exitTime - 72000000;
        }
        const duration = exitTime - entryTime;

        // Ajouter la victoire au tableau
        let lastDurationTime = this.listVictory.get(characterDescription);
                
        if (lastDurationTime !== undefined) {
            if (lastDurationTime <= duration ) {
                // whisper good but you aready did better 
                character.Tell("Whisper", `(Congratulations, here's your time: ${formatDuration(duration)}! You didn't beat your record, which was ${formatDuration(lastDurationTime)}.)`);
            }
            else {
                // best score, gg
                this.listVictory.set(characterDescription, duration);
                character.Tell("Whisper", `(Congratulations, here's your time: ${formatDuration(duration)}! You beat your previous record, which was ${formatDuration(lastDurationTime)}.)`);
            }
        } else {
            // gg for you victory
            this.listVictory.set(characterDescription, duration);
            character.Tell("Whisper", `(Congratulations on getting through this maze! Here's your time: ${formatDuration(duration)}!)`);
        }
        
        //  Enlever au tableau des entrées
        this.listChallenger.delete(character.MemberNumber);

        this.saveDataToFile();

        return duration;
    }

    /**
     * Trie les items en fonction de l'ordre de priorité défini
     * @param items - Liste des items à trier
     * @returns Liste triée des items
     */
    private sortByPriority(items: API_AppearanceItem[]): API_AppearanceItem[] {
        
        const priorityOrder = ['ItemDevices','ItemNeck','ItemAddon','ItemNeckRestraints','ItemArms','ItemNose','ItemHands','ItemFeet','ItemLegs','ItemBoots', 
             'ItemMouth','ItemMouth2','ItemMouth3','ItemHood','ItemHead','ItemNeckAccessories','ItemNipples','ItemNipplesPiercings','ItemBreast', 
             'ItemTorso','ItemTorso2','ItemVulva','ItemVulvaPiercings','ItemButt','ItemPelvis','ItemHandheld','ItemMisc'];

        return items.sort((a, b) => {
            const isValidA = isBCAppearanceItem(a);
            const isValidB = isBCAppearanceItem(b);
    
            if (!isValidA && !isValidB) return 0; // Si les deux sont invalides, garder l'ordre
            if (!isValidA) return 1; // Placer les éléments invalides après
            if (!isValidB) return -1; // Placer les éléments invalides après
    
            // Obtenir l'index du groupe dans priorityOrder
            const priorityA = a.Group ? priorityOrder.indexOf(a.Group) : Infinity;
            const priorityB = b.Group ? priorityOrder.indexOf(b.Group) : Infinity;
    
            // Si le groupe est trouvé dans priorityOrder, on trie par ordre de priorité
            if (priorityA !== -1 && priorityB !== -1) {
                return priorityA - priorityB; // Tri basé sur la priorité des groupes
            }
    
            // Placer les groupes non prioritaires à la fin (Infinity)
            if (priorityA !== -1) return -1; // Si a est dans priorityOrder, il passe avant
            if (priorityB !== -1) return 1;  // Si b est dans priorityOrder, il passe avant
    
            // Si aucun groupe n'est dans priorityOrder, on garde l'ordre d'origine
            return 0;
        });
    }
    
    // sauvegarde et chargement des scores
    //
    private saveDataToFile(): void {
        const filePath = SAVEFILE_PATH + SAVEFILE_NAME;
        const dirPath = SAVEFILE_PATH;

        // Ensure the directory exists
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });  // Create directories if they don't exist
            this.log.warn("Save path did not exist, directories created.");
        }

        const data = {
            listChallenger: Object.fromEntries(this.listChallenger),
            listVictory: Object.fromEntries(this.listVictory),
        };
    
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        this.log.debug("Data successfully saved.");
    }

    private loadDataFromFile(): void {
        const filePath = SAVEFILE_PATH + SAVEFILE_NAME;
    
        if (!fs.existsSync(filePath)) {
            this.log.error("Save file not found.");
            return;
        }
    
        try {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const parsedData = JSON.parse(rawData);
    
            // Convert stored object back into Maps
            this.listChallenger = new Map(Object.entries(parsedData.listChallenger).map(([key, value]) => [Number(key), Number(value)]));
            this.listVictory = new Map(Object.entries(parsedData.listVictory).map(([key, value]) => [key, Number(value)]));
    
            this.log.debug("Save file successfully loaded");
        } catch (error) {
            this.log.error("Save file error while trying to load data:", error);
        }
    }


    // Réponses aux messages "/bot commande"

    private onCommandWhoWon = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {

        if(this.listVictory.size > 0){
        const bestWinnersTable = [...this.listVictory.entries()]
            .sort((a, b) => a[1] - b[1]) // Trier par durée (du plus court au plus long)
            .slice(0, 10); // on garde les 10 meilleurs

        // Transformer les données pour affichage
        const bestWinners = bestWinnersTable.map(([player, duration], index) => 
            `${index + 1}. ${player} - ${formatDuration(duration)}`
        ).join("\n");

        this.conn.reply(msg, `\n*** Labyrinth Hall of Fame ***\n${bestWinners})`);

        } else {
            this.conn.reply(msg, "\n*** Labyrinth Hall of Fame ***\n  => It could be you! <= \n\nNo one triumphed of this labyrinth yet.)");
        }
    };

    private onCommandResidents = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        const residents = this.conn.chatRoom.characters.filter((c) =>
            this.listChallenger.has(c.MemberNumber),
        );

        const residentsList = residents
            .map(
                (c) =>
                    `${c} - ${formatDuration(Date.now() - this.listChallenger.get(c.MemberNumber))} spent`,
            )
            .join("\n");
        if (residentsList.length === 0) {
            this.conn.reply(
                msg,
                "No one is challenging this labyrinth right now.)",
            );
        } else {
            this.conn.reply(msg, `Current Labyrinth challengers:\n${residentsList})`);
        }
    };


    private onCommandTime = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        const entryTime = this.listChallenger.get(sender.MemberNumber);
        // Not in the list ? Something happened ! Put arbitrary time (24h) and tell them we're sorry about that
        if (entryTime === undefined) {
            this.conn.reply(msg, `You're not listed as being in the Labyrinth yet.)`);
        } else {
            const duration = Date.now() - entryTime;
            this.conn.reply(msg, `It been ${formatDuration(duration)} since you entered the Labyrinth.)`);
        }
    };


    // commandes pour super user seulement
    //
    private onCommandFree = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if(this.superusers.includes(sender.MemberNumber) || this.conn.chatRoom.Admin.includes(sender.MemberNumber)){ 
            this.freeCharacter(sender);
        }
    };


    private onCommandUpdateRoom = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if(this.superusers.includes(sender.MemberNumber)){ 
            await this.setupRoom();
        }
    };

    
    private onCommandReset = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if(this.superusers.includes(sender.MemberNumber)){
            await this.setupRoom();
        }
    };   
    

    private onCommandDebug = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if(this.superusers.includes(sender.MemberNumber) && args.length > 0){
            switch(args[0]) {
                case "items": // Debug pour voir les items portés
                    const character = this.conn._chatRoom.getCharacter(sender.MemberNumber);
                    const bondageDevice = character.Appearance.InventoryGet("ItemDevices");
                    if(Boolean(bondageDevice)) {this.log.debug(`!debug items - Device properties = ${JSON.stringify(bondageDevice.getData().Property, null, 2)}`);}
                    const bondageArms = character.Appearance.InventoryGet("ItemArms");
                    if(Boolean(bondageArms)) {this.log.debug(`!debug items - Arms properties = ${JSON.stringify(bondageArms.getData().Property, null, 2)}`);}
                    const bondageHands = character.Appearance.InventoryGet("ItemHands");
                    if(Boolean(bondageHands)) {this.log.debug(`!debug items - Hands properties = ${JSON.stringify(bondageHands.getData().Property, null, 2)}`);}
                    break;

                case "link": // Debug pour reconstruire une chaine compressée en base64 avec seulement les items de bondage
                    const linkString="NobwRAcghgtgpmAXGAEgBgJwDY1gDRgDiATgPYCuADkqnAJYDmAFgC75gDCpANqcUsAC6AXzzho8GgGUYUbt3YkK1ZACFSAEwCeAVUqU4/Al179kAdSZ0WCAgAUyB4iy1JwAFS0GASnADGfBpuYC4GQYhowlFikLAIyIpkVDQAgsQwAM4AMnAAZmzGPHw0ACJ5UOTcbKLicTSJyqnpGd6MrOwmxchluRVVYDWxkgkESsnIKFAAdhrZeQWcRWZgPX3VMRLxYA3jqNOzrcwLncurleu1w2AycgqjSSpg6tpZpADuhh1LpeXnAxt1CZQOjEABiZCmLAATDtHpMQeDSJCvqYaABiDCYrH/S5beHEVRQPwAawALAAjWE0fGEkkororX79QabGgAUS0cHJZDeGRh90ayA5XJ5GXpZmAjN6fwIZ36gnsjkMLmCnh8/kCwTFEQIKjQBDMkVldFyuTofnOrh1T14dMQQgIbNN/jY9oVqDoGniDo9XoAkjYYAJ3Sl5O8Un4WHQAG7WK0+lIsFjEOjk8g2YPRXHszkZACMVKFufF6KhaDLZZxQy2wvzhbAtf5i1RyDRFfLuBZgLAoMqdyIDxoAFkKCwmCX7VK1uw5Wx3Q5SE4VYgPF44L4AsRwuAFNbXUaViazRaqlb9TbSHafU7ci7gwQUJ7ve7H/7A/ewKHeG8I1HY8uEyTFM0wzN0s2rGgIDofRuDgDIAGZ6ygmC4InKc/i7K47HIDIMi0AsBV2bDcNcQoW3Q5kASuKQmDgFBPkIx4FymCgpjFMiGVnKtWW6JkFjGOE4CgIIONOPjuO7VRuBw8dGJoKSZLQrjMK2UFpM9diB0FHt1NmJTxJU9kYFIKMAimes2WM0ykX06VKOzZA/RTDImAADg4chTU0gSaADOAYFBOA4GOb5JzReCAHZXLzABWNkwBEKitg4ehuDoKYGBooliVg7zB0cwM0kyCdJXCqLYviggyuiuKEsVRdlStVd1U3bcQjXcI81Ea5grsUgMm9MAAHlo0MdxaPo4S6s/MMf0jGM4D6gaBGG0biHGuihKCERDLUW5CCgBh6z8mAR3TJgmxOFbqoq9gbtq+clWcJqwDVdcNS3YJQjgcIoSiXbrhsOBuCHcgAC8wdgg6jrkgr/LOsdENE67Ipq+LEocsARw0SooGIDgmCgDIoxcVRgf4/KwBOuxgdjTSrrC0EmeZu7Uduqq2dqjnyq5sA0TQAXBbuwWhcehrntVNcN01FcwCgJA8wIPwkHggg6CQUldQ1ghtXPaMkHPUgFe6koj3NS0DYIGjL2JHJRt3c93BTBgGEMLhyGRa0huIBgiZgd3PfPbxyHSn7vd9jJ/dY/cCHcOh4HMPhzMQPMItJeDU4ijAYrQdPXNj+O4CkdK/DgLIiZYcO/YVtOM4irOc7zq2mHedw4AAD1dZNyDgewPboFyq8jpBem4Aa+6mAemCkFh9nGUfx7AbDJ5cmfiHIF3YJHuRF+Xqe143hhYKGsdPkQBfe8/PxS9w7GtnYJ3GFd4gADU5B77UqamPxiCE8eyh/n/XupsMhQHJLBPAfopi5G4FAGweAeiwPgZZSgLg8DWzpAQKSNsVonRfpUaM8sCB4IIVAOwdBDB+HSgwTSJ1VDpjnI6Z0kYVo6AGr4KythODTDZBoV2HRCbEy4fQpMBMK5cLZC7H67AX6pmIHA6h7BQR0HkPg7ghD2B+gyHYaSUiRLXG/DOOAk85B32mq+QaxE8LmKfCdXBgYREsBSFMOQZNhJ8k0YGNRhCaYr1NtwDQRtiFeNIRg4k/jAmeP8t4qAsjuQKIyhEoJVMQnqKgFAmBcCwGwTiXAJJUSYAxI4GlFgfA5Az3jrjUpRgUnRNIcU6wUhyDzSRB5agwS6lpMmtGLQ5h6BHGKbAdptTCmkNeGtDIcT5HVIKTEkoFBwFwDZDMfJHTRlpMJBkc0XASQpgyrM0hOiK7bMESTLQHBDpwAIiMmJuTJEMF8QPTZXCSFpKOcTE5xyXAXNdk2V5hC25+CYCxMRHzvmXIOWktScDQVnJ+S81JhDYVxj6s02SNzSG9nkBcrZGV4WQp8RQ4gVCMqTNTJtPGLAGksHIZQxRayYm0uJdQjI1LWj7IZYcolJKaHIu+SUmiFCAkErIdyllj5mBSH8OQFMLgYmCuBttAgX5wzzX/PGEMQFUzpkGoQYx1g5B0CgFwNa00oE2DYnGFWxDoFILLnAe2GsoiCCAA==";
                    // Liste des groupes à garder
                    const allowedGroups = ['ItemAddon', 'ItemArms', 'ItemBoots', 'ItemBreast', 'ItemButt', 'ItemDevices', 'ItemEars', 'ItemFeet', 'ItemHands', 'ItemHead', 'ItemHood', 'ItemLegs', 'ItemMisc', 'ItemMouth', 'ItemMouth2','ItemMouth3', 'ItemNeck', 'ItemNeckAccessories', 'ItemNeckRestraints', 'ItemNipples', 'ItemNipplesPiercings', 'ItemNose', 'ItemPelvis', 'ItemTorso', 'ItemTorso2', 'ItemVulva', 'ItemVulvaPiercings', 'ItemHandheld'];
                    // Décompression des données et filtrage pour ne garder que les objets dont le Group est dans allowedGroups
                    const linkData = JSON.parse(decompressFromBase64(linkString));
                    const filteredData = linkData.filter(item => allowedGroups.includes(item.Group));
                    // Recompression en Base64 et vérif des données
                    const newLinkString = compressToBase64(JSON.stringify(filteredData));
                    const newlinkData = JSON.parse(decompressFromBase64(newLinkString));
                    this.log.debug(`!debug link - Link data: ${linkData}\n  New Link String : ${newLinkString}\n  New Link data: ${newlinkData}`);
                    break;

                case "time" : 
                    if(args.length > 1) {
                        // on ajoute du temps au timer pour test, donc on enleve au temps de début
                        try{
                            let time = this.listChallenger.get(sender.MemberNumber) - Number(args[1]);
                            this.listChallenger.set(sender.MemberNumber,time);
                            const duration = Date.now() - time;
                            this.conn.reply(msg, `It been ${formatDuration(duration)} since you entered the Labyrinth.)`);
                        } catch (e) {
                            this.log.debug("!debug time - Time error, probably NAN: ", e);
                        }
                    }
                    break;

                default:
                    break;
            }
        }
    };

    /*
    private onCharacterEnterTrolley = async (character: API_Character) => {
        
        this.log.debug("trolley - On va mettre le trolley");
        // Le bot "attache" le trolley qui est de type itemDevices (case en bas à droite sur l'itnerface) au joueur declanchant l'evenement
        const bondageDevice = character.Appearance.AddItem(AssetGet("ItemDevices", "Trolley"));
        // Le trolley est un craft spécifique avec une description et un nom
        this.log.debug("trolley - on va en faire un craft");
        bondageDevice.SetCraft({ 
            Name: `Standard Trolley`,
            Description: `A standard Trolley, used to easily transport bound slaves on wheels.`,
        });
        const bondageArms = character.Appearance.AddItem(AssetGet("ItemArms", "HighSecurityStraitJacket"));
        bondageArms.setProperty("TypeRecord", { c: 1, a : 1, s: 3 });
        //await wait(500);
        this.log.debug("trolley - on va fermer");
        // Le trolley passe en extended type "closed" avec les boucles fermées (ce sont les cases de choix qu'on voit sur l'interface)
        bondageDevice.Extended.SetType("Closed"); 
        this.log.debug("trolley - on va changer la diff");
        bondageDevice.SetDifficulty(20);
        
        //await wait(1000);
        this.log.debug("trolley - on va lock");
        // mise en place du cadenas avec un TimerPasswordPadlock de 5 minutes (l'unité de temps est en milisecondes)
        bondageDevice.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
            Password: "DEBUG",
            Hint: "Your host.",
            RemoveItem: true,
            RemoveTimer: Date.now() + 5 * 60 * 1000,
            ShowTimer: true,
            LockSet: true,
        });
        this.log.debug("trolley - apres");
    }*/

}
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
import { API_Connector, CoordObject, MessageEvent } from "../apiConnector";
import { makeDoorRegion, MapRegion, positionEquals } from "../apiMap";
import { API_Character } from "../apiCharacter";
import { AssetGet, BC_AppearanceItem, API_AppearanceItem, getAssetDef } from "../item";
import { wait } from "../hub/utils";
import { CommandParser } from "../commandParser";
import { BC_Server_ChatRoomMessage } from "../logicEvent";
import { TriggerDef, Trigger, TriggerManager } from "./laby/triggerManager";
import { triggersData as triggersData_LabyYumi1, BOT_POSITION as BOT_POSITION_labyYumi1, MAP as MAP_labyYumi1, BOT_DESCRIPTION } from './laby/data/labyYumi1';
import { formatDuration } from "../util/time";
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
        console.log(`Match: ${match}, Key: ${p1}, Replacement: ${variables[p1] || match}`); // Pour voir les valeurs dans la console
        // Remplacer par la valeur correspondante ou garder le texte original si aucune correspondance
        return variables[p1] || match;
    });
}

function isBCAppearanceItem(obj: any): obj is BC_AppearanceItem {
    return obj && typeof obj.Group === "string" && typeof obj.Name === "string";
}


export class Laby {
    // gestion automatisée des triggers depuis une definition
    private triggerManager: TriggerManager;

    // variable contenant la description du bot pour sa bio
    public botDescription = [
        "Welcome to this Labyrinth !",
        "The current layout is designed by Yumi (189644).",
        "\n\nCommands:\n",
        "/bot fame - Gives you the time spent by our best challengers!",
        "/bot who - Who is challenging this labyrinth?",
        "/bot time - How long you've been in the Labyrinth",
        "\nThis bot runs on a customized version of Ropeybot.",
        "Code at https://github.com/FriendsOfBC/ropeybot",
    ].join("\n");

    // liste des gens entrés dans le labyrinthe)
    private listChallenger = new Map<number, number>();
    private listVictory = new Map<string, number>();

    private commandParser: CommandParser;

    public constructor(private conn: API_Connector, private superusers: number[] ) {
        
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

        // Déclancheur sur reception d'un message peut importe son contenu
        //conn.on("Message", this.onMessage);
        
        // triggers sur évenements provenant de API_Connector
        this.conn.on("RoomCreate", this.onChatRoomCreated);
        this.conn.on("RoomJoin", this.onChatRoomJoined);
        this.conn.on("CharacterEntered", this.onCharacterEntered);
        this.conn.on("CharacterLeft", this.onCharacterLeft);

        // Déclancheurs via arrivée d'un personnage sur des coordonnées ou régions
        this.triggerManager = new TriggerManager(this.conn);

        // Add triggers to the map using the TriggerManager
        this.triggerManager.addTriggersFromData(triggersData, this.onWalkTriggerActivated.bind(this));  // Pass callback

    }

    // Cette fonction d'initalisation est appelée après la constructeur
    public async init(): Promise<void> {
        // Mise en place initiale de la salle
        await this.setupRoom();

        // Actions qu'on souhaite que le personnage du bot fasse en entrant dans la pièce
        await this.setupCharacter();

        this.loadDataFromFile();
    }


    private onChatRoomCreated = async () => {
        await this.setupRoom();
        await this.setupCharacter();
    };

    private onChatRoomJoined = async () => {
        await this.setupCharacter();
    };


    // Lorsqu'un autre personnage entre dans la "Room"
    private onCharacterEntered(character: API_Character) {
        console.log(`Le bot a détecté ${character.Name} qui entre !`);
    }

    private onCharacterLeft(character: API_Character) {
        // L'instance de l'objet character n'est plus dispo car supprimé de la liste du bot après sa sortie
        // par contre si on a une liste de personnage pour une raison ou une autre,
        //   on pourrait si on le souhaite update une liste par rapport aux personnage encore dans la salle
        
        //console.log(`Le bot a détecté ${character.Name} qui sort !`);
        //this.enteredTheHouse.delete(character.MemberNumber);
    }

    // Callback function to be invoked when a trigger is activated
    private onWalkTriggerActivated = async (character: API_Character, triggerData: TriggerDef) => {
        
        console.log(`Laby - ${triggerData.name} triggered! Actions: ${triggerData.actions}`);
        for (const action of triggerData.actions) {
            switch (action) {
                case "Whisper":
                    console.log("Effectuer l'action Whisper.");
                    if (triggerData.message) {
                        character.Tell("Whisper", `(${triggerData.message})`);
                    }
                    break;
        
                case "Message":
                    if( !Boolean(triggerData.effect === "VICTORY") ) {
                        console.log("Effectuer l'action Message." );
                        if (triggerData.message) {
                            const displayName = character.NickName && character.NickName.trim() !== "" ? character.NickName : character.Name;
                            let variables = { "Nom": `${displayName}` };
                            let messageModifié = replacePlaceholdersWithVariables(triggerData.message, variables);
                            this.conn.SendMessage("Chat", messageModifié);
                        }
                    }
                    break;
        
                case "Effect": 
                    console.log("Effectuer l'action Effect.");
                    switch (triggerData.effect) {
                        case "ENTER":
                            // Enregistrer le nouveau joueur qui entre
                            this.newChallenger(character);

                            break;
                        case "VICTORY":
                            // Prendre en compte la victoire
                            const duration = formatDuration(this.playerVictory(character));
                            console.log("Effectuer l'action Message." );
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
                    console.log(`Effectuer l'action Porte ${triggerData.effect}.`);

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
                    console.log(`Effectuer l'action Tile ${triggerData.effect}.`);

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
                    console.log("Effectuer l'action Bond.");

                    if (triggerData.link) {
                        //console.log(`Link: ${triggerData.link}`);
                        const linkData = JSON.parse(decompressFromBase64(triggerData.link));
                        
                        if (Array.isArray(linkData)) {
                            for (const bondageItemData of linkData) {
                                if (isBCAppearanceItem(bondageItemData)) {
                                    console.log(`Using item: ${bondageItemData.Name} in group ${bondageItemData.Group}`);

                                    await wait(250);
                                    const bondageItem = character.Appearance.AddItem(bondageItemData);

                                    if(triggerData.effect) {
                                        console.log("triggerData.effect :", triggerData.effect);
                                        const regex = /^(\d+)m$/;
                                        const match = triggerData.effect.match(regex);
                                        if (match) {
                                            const minutesLocked = parseInt(match[1], 10);
                                            console.log("Minutes:", minutesLocked);
                                            
                                            bondageItem.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
                                                Password: "LABY",
                                                Hint: "Four letters, where are you?",
                                                RemoveItem: true,
                                                RemoveTimer: Date.now() + minutesLocked * 60 * 1000,
                                                ShowTimer: true,
                                                LockSet: true,
                                            });
                                        }
                                    }

                                } else {
                                    console.error("Invalid item format!");
                                }
                            }
                        }
                    }
                    break;
        
                default:
                    console.log(`Action inconnue : ${action}`);
                    // Traitement par défaut si l'action n'est pas reconnue
                    break;
            }
        };
    }
    
    private setupRoom = async () => {
        try {
            this.conn.chatRoom.map.setMapFromString(MAP);
        } catch (e) {
            console.log("Map data not loaded", e);
        }
    };

    private setupCharacter = async () => {
        this.conn.moveOnMap(BOT_POSITION.X, BOT_POSITION.Y);
        this.conn.Player.SetActivePose(["Kneel"]);
    };

    private freeCharacter(character: API_Character): void {
        character.Appearance.RemoveItem("ItemArms");
        character.Appearance.RemoveItem("ItemHands");
        character.Appearance.RemoveItem("ItemDevices");
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
        const entryTime = this.listChallenger.get(character.MemberNumber);

        let exitTime = Date.now()
        // Not in the list ? Something happened ! Put arbitrary time (24h) and tell them we're sorry about that
        if (entryTime === undefined) {
            exitTime = exitTime + 72000000;
        }
        const duration = exitTime - entryTime;

        // Ajouter la victoire au tableau
        let lastDurationTime = this.listVictory.get(characterDescription);

        console.log(`Victory - duration : ${duration}, formatDuration(duration) : ${formatDuration(duration)} `);
                
        if (!lastDurationTime === undefined) {
            if (lastDurationTime >= duration ) {
                // whisper good but you aready did better 
                character.Tell("Whisper", `(Felicitations, voici votre temps : ${formatDuration(duration)} ! Vous n'avez pas batu votre record qui était de ${lastDurationTime})`);
            }
            else {
                // best score, gg
                this.listVictory.set(characterDescription, duration);
                character.Tell("Whisper", `(Felicitations, voici votre temps : ${formatDuration(duration)} ! Vous avez battu votre précédent record qui était de ${lastDurationTime})`);
            }
        } else {
            // gg for you victory
            this.listVictory.set(characterDescription, duration);
            character.Tell("Whisper", `(Felicitations pour avoir traversé ce labyrinthe ! Voici votre temps : ${formatDuration(duration)} !)`);
        }
        
        //  Enlever au tableau des entrées
        this.listChallenger.delete(character.MemberNumber);

        this.saveDataToFile();

        return duration;
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
            console.log(`Time - duration : ${duration}, formatDuration(duration) : ${formatDuration(duration)} `);
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
        if(this.superusers.includes(sender.MemberNumber)){ 
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
        if(this.superusers.includes(sender.MemberNumber)){ 
            /*
            // Bloc pour vérifier que le personnage est bien présent, inutile ici vu qu'il vient de faire la commande
            const char = this.conn._chatRoom.getCharacter(sender.MemberNumber);
            if (!char) {
                console.warn(`Trying to sync member number ${sender.MemberNumber} but can't find them!`);
                return;
            }*/

            // Debug pour voir les items portés
            //
            const character = this.conn._chatRoom.getCharacter(sender.MemberNumber);
            const bondageDevice = character.Appearance.InventoryGet("ItemDevices");
            if(Boolean(bondageDevice))
                console.log(`*** Debug ***\n  Device properties = ${JSON.stringify(bondageDevice.getData().Property, null, 2)}`);
            const bondageArms = character.Appearance.InventoryGet("ItemArms");
            if(Boolean(bondageArms))
                console.log(`*** Debug ***\n  Arms properties = ${JSON.stringify(bondageArms.getData().Property, null, 2)}`);
            const bondageHands = character.Appearance.InventoryGet("ItemHands");
            if(Boolean(bondageHands))
                console.log(`*** Debug ***\n  Hands properties = ${JSON.stringify(bondageHands.getData().Property, null, 2)}`);


            // Debug pour reconstruire une chaine compressée en base64 avec seulement les items de bondage
            //
            // chaine à nettoyée (trop longue pour transfert via le chat ?)
            const linkString="NobwRAcghgtgpmAXGAMlALnAHgIQPYB2AJlAOZwCyAluugM5gA0YA4gE54CuADkmAJKYYACSjEGzAMJ4ANnjZJgYAMQAmdRqYrJO3VrUb1+3XubKTO/QDEbVgGx3jugMzP9ho2YuT3Hpyf9TFVt7Ry8XNwBdZgAFDm44NnQATyRwABVkhIAlOABjeSI0sHQkAEZmAHckVWYFRAAGZhkkBoBfZgARKgAzHqo8zhkU1uYcOTyAa0UBIVFiAAs4GSLosABRPvzSxCVxvCmtCkTyIisqAnI2BjXhKiIEXdY5ADc4CVm4ETEiJZWteZEOgoOA9UrMQF0bJUUgLcFgQEAQTyeXedHkyRBYIBP2RqLo6LYyWhsNKt3ucEEX0Ua0RMjklWR6CoLxoqV2tNobCoACNOJgaW0OuBoPA+OkFjCFvg8PQtOwuLxkABlBZ4d5aaRyepKZQAVkkzisRv0ZRwZUkqgA7FpOqCoEMybF4okRogMlk4LkCmwiu6wC1Gswea0OmBun0Bo72U0wPtDhzmJsetsaRCKWmERSqTAZsqDpM6PmpnQACxaYuFyt0PVaREESYyODoLHoaE8nmEMp1htNttS/sdrtgWn0vCMvLM1lu4Cc9DcvkCjlCxgi2CPBENACcpYa8o4PD4wjgA81snkgtXkHXfAAGmg2OR94q+PgiMkAKrcBIKKTn+pgAA6pKArOngP5uh6OT5IUxQpAkfrtCua5isgz6HsgiJsDAwKgvCWoXsgdo9A6wxgMK16oWA6FKmAWE4SScJntqfDEaRpQUaKG40UePy4dif4sUR9qOuRV5cXwPHIJCjH4f+rEiWRnE3sg95QI+CDMAqGFxng74oOOiTMYR4aKRx4kqQiUBUGwVgcAQ6BlGUIZaQetGiDZdmEHJQkqHYUDOHYqgABxiShG7rMkcA8hwlR0KoUkbFFMXjh8BE6qZJGiV0ZkjmBEHslBXowb6xQMIgFRgEqsb1KWYYRv0gzDDGYwTNMiYbFsk6ZncDw9dmQiZnSDJMiybJDVyvL8o8s7IZREVRXQZTlq5L7IJFGqCYRShsdlKiIjgkhWFuNpmHq50XbauU5VlZFmKopYPQ9I7KVRyowFA9LjJwbBsHARSrTpG2qlARDjsZGXKOs6yIlYsMvRZVEbUtK2sG5fDIwlW0Zbtd37Ydx2nSoF2XTd7FXbd8JqI9NMI+FfBWEMLSA7RFBcOgCwQzMyh2DgpbOPzFPk2scTga6hVgJk0E+n64CBrUJTlPVvSNdGoxxm1mbJqmHW9TN5IPDmQ1jhOU7jR1iKTYu+tzRJyAQFQ35NnQbgs3wDtO5tYDpQplNhfNfAxJwBLJK7aNrWAQch1zwl+69G6qnAx6/uHOmiwQXAEGl8mx+T8d8O9n0yOs6kfNp7lwKDMeZXniMbt9dCc27yAN033s5zXon58gVgyJw9xl+jPd9wP1e4+Z9PrTAsoDIQiXrNPzIFAQY+5d3Vk2TgUBTM4tbNxvbBb4c2O+7Xk9gKqFyYnAsrqQDqe0cq/c+dtflWKoeof/onSlsFVp/3TAOyA0CYCwNWbs+9qwx11FaLcqhLQ+EiOvEB2B1gyE7JUFgrwvblz4FgvAbxs5CV1HzZwhpEHr0AlAOg3AqBwAgQ/Pgkg5AcwMpUIyJ8nhqDsGaM0gC7YbCbKQMQ6BjzqXQBAfIjZt6aUYfbKRMgZHQM7njceL1IhAA=";
            
            // Liste des groupes à garder
            const allowedGroups = ['ItemAddon', 'ItemArms', 'ItemBoots', 'ItemBreast', 'ItemButt', 'ItemDevices', 'ItemEars', 
                'ItemFeet', 'ItemHands', 'ItemHead', 'ItemHood', 'ItemLegs', 'ItemMisc', 'ItemMouth', 'ItemMouth2', 
                'ItemMouth3', 'ItemNeck', 'ItemNeckAccessories', 'ItemNeckRestraints', 'ItemNipples', 'ItemNipplesPiercings', 
                'ItemNose', 'ItemPelvis', 'ItemTorso', 'ItemTorso2', 'ItemVulva', 'ItemVulvaPiercings', 'ItemHandheld'];

            // Décompression des données
            const linkData = JSON.parse(decompressFromBase64(linkString));
            
            // Filtrage pour ne garder que les objets dont le Group est dans allowedGroups
            const filteredData = linkData.filter(item => allowedGroups.includes(item.Group));

            // Recompression en Base64
            const newLinkString = compressToBase64(JSON.stringify(filteredData));
            const newlinkData = JSON.parse(decompressFromBase64(newLinkString));

            // log changes
            console.log(`*** Debug ***\n  Link data: ${linkData}\n  New Link String : ${newLinkString}\n  New Link data: ${newlinkData}`);
        }
    };

    // sauvegarde et chargement des scores

    private saveDataToFile(): void {
        const filePath = SAVEFILE_PATH + SAVEFILE_NAME;
        const dirPath = SAVEFILE_PATH;

        // Ensure the directory exists
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });  // Create directories if they don't exist
            console.warn("Save path did not exist, directories created.");
        }

        const data = {
            listChallenger: Object.fromEntries(this.listChallenger),
            listVictory: Object.fromEntries(this.listVictory),
        };
    
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log("Data successfully saved.");
    }

    private loadDataFromFile(): void {
        const filePath = SAVEFILE_PATH + SAVEFILE_NAME;
    
        if (!fs.existsSync(filePath)) {
            console.warn("Save file not found.");
            return;
        }
    
        try {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const parsedData = JSON.parse(rawData);
    
            // Convert stored object back into Maps
            this.listChallenger = new Map(Object.entries(parsedData.listChallenger).map(([key, value]) => [Number(key), Number(value)]));
            this.listVictory = new Map(Object.entries(parsedData.listVictory).map(([key, value]) => [key, Number(value)]));
    
            console.log("Save file successfully loaded");
        } catch (error) {
            console.error("Save file error while trying to load data:", error);
        }
    }
}
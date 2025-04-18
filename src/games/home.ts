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
//import { logger } from "../utils/logger";
import { API_Connector, CoordObject, MessageEvent } from "../apiConnector";
import { makeDoorRegion, MapRegion, positionEquals } from "../apiMap";
import { API_Character } from "../apiCharacter";
import { AssetGet, BC_AppearanceItem, API_AppearanceItem, getAssetDef } from "../item";
import { CommandParser } from "../commandParser";
import { BC_Server_ChatRoomMessage } from "../logicEvent";
import { wait } from "../utils/time";
import { GameInstance } from "./gameInstance";
import { GameInfosData } from "@shared/types/game";
import { E } from "../bcdata/female3DCG";

// Parametrage pour la cartes

// Cartes
const MAP =
    "N4IgKgngDgpiBcICCAbA7gQwgZxAGnAEsUZdEA7Sq6m2u+6wLBBmXW32POvufe/+B/QJfAI0WPGjB7IQA85s+QBDlihTKFS2a7StVz1m1uP1DdswAvg5jYeZr96szMvWbdk4/k3bYkxMlehAGDg7QATcIjwl0MgkLFIyOjNWMChBMT/V2DU9IihSiSpcVyogq9GNJLEsoCq6vJC8psGFta29o7WgGue3r7+/oAH4YHRsfGJyYGR3uHBvrmFmZ7F2eWpjc2t6fWNzv2Dw46mk9Oz84vLq+ub27u2QDAQe+evI7fyfBAAeQAjACsYABjAAuZBAdQhkKh0JhsLh8IRiPhgBnoUKAA+hAGvQoVRSMigBBAQBwgIAEEFCgD1AABfpNCgDZAcIAGLJzFxEMAC0As5npQBD0IAmmEAVfBY0IAdI50MFDIiwpFJWFgBpAcKAJCApZFAAEwCUAODCAavgMYAr6HCvJFADToYABQA5ACXIhjeZylQkADsRQBPwAAgkpa20JQBjQN6PRiNelnYHHUrAD/A4RJdUAJCAeqqADhAIYB6+ETuX96QFCSTUMALMDQwAn4IAqYBjoXIoWwRfLFcrVer1cAEsA1huNpvNluttvtjudrsekAAXyAA=";
const MAPBatCave =
    "N4IgKgngDgpiBcICCAbA7gQwgZxAGnAEsUZdEA7SqywLBA76G6rGWHbWO3brzO//GPAcI68hIvoEvgaTNlyZE1pIAeqlWoAhWjeuWTFLXUe07Veg4zlnJJlYAXwO/ov1dZvbeUOnzmq+se1HzorNXlpIOCAYOijABN4hPjvZ0loyLlExMAL4AjUmMzE2Vy0yQKEyUpkiwyy2IryKoNS2sLK3JbWhoju+h4+/oHBoeGRkYBricmp6emAB/mZxaXlldWZhcn52amtnY2J3c39tZPTs/Xjk9Hrm9u78R7Hp+eX17f3j8+vp8AwEG//oL3IFUfAgADyACMAFYwADGABcyCAOh1AAKA6NigAPoQBX0LFADgwgDXoFHE2ro1HxABBADSSbS6fSGQVAHQgjPpgBnoLGAFvhYhzWQVACCAgDhAQAIILFAHqAAC+xbFAGyA8TlYrofJJgAWgFXK2qAIehAE0wgCr4ImxADpGvphoAMYljSaOsbADSA8UASEDWgqAAJhMnjANXwBNxsV1zppJPJJoAS4kCbrNc6ygAdhKAJ+AKbUvVGyoAxoHTKfiBI9BQpebjKcAP8DxUUdQAkIJmOoAOEBRgHr4OtlHMFA2ZeskwAswLTACfggCpgSvxcixbD9kejsfjieTgqACWAp3P5wvF0vlyvV2v1xvKyAAL5AA="


// Coordonnées en rectangle, pour former des "régions", pour interraction ulterieure

const RECEPTION_AREA: MapRegion = {
    TopLeft: { X: 15, Y: 11 },
    BottomRight: { X: 17, Y: 14 },
};

const HOME_AREA: MapRegion = {
    TopLeft: { X: 15, Y: 11 },
    BottomRight: { X: 17, Y: 14 },
};

// Coordonnées de positions ou d'objets pour interraction ulterieure

const BOT_POSITION = { X: 15, Y: 11 };

const EXHIBIT_1: CoordObject = { X: 22, Y: 13 }; // tableau dans l'entrée
const EXHIBIT_2: CoordObject = { X: 17, Y: 11 }; // tableau de classe
const EXHIBIT_3: CoordObject = { X: 15, Y: 8 }; // tableau a coté de la buanderie
const EXHIBIT_4: CoordObject = { X: 26, Y: 11 }; // cheminée

const COMMON_AREA_TO_RECEPTION_DOOR: CoordObject = { X: 21, Y: 17 };
const REDRESSING_PAD: CoordObject = { X: 23, Y: 5 }; // miroir la chambre
const DRESSING_PAD: CoordObject = { X: 28, Y: 5 }; // miroir salle de bains

// devices
const KENNEL_1: CoordObject = { X: 27, Y: 15 }; // kennel du salon à droite
const KENNEL_2: CoordObject = { X: 19, Y: 13 }; // kennel du salon à gauche
const TROLLEY_1: CoordObject = { X: 18, Y: 16 }; // Trolley a coté de la classe
const TROLLEY_2: CoordObject = { X: 17, Y: 5 }; // Trolley dans la buanderie
const CROSS_1: CoordObject = { X: 15, Y: 16 }; // St Andrew Cross a coté de la classe
const DISPLAY_FRAME_1: CoordObject = { X: 29, Y: 17 };  // display frame dans le cellier
const COFFIN_1: CoordObject = { X: 28, Y: 3 }; // coffin dans al batcave
const TRANSPORT_BOX_1: CoordObject = { X: 30, Y: 16 }; // wooden rack ?
const LOCKER_1: CoordObject = { X: 29, Y: 5 }; // wooden rack ?
const LOCKER_2: CoordObject = { X: 30, Y: 5 }; // wooden rack ?

const CHANDELIER_SECRET: CoordObject = { X: 26, Y: 5 }; // chandelier secret pour ouvrir la batcave
const CHANDELIER_SECRET_2: CoordObject = { X: 28, Y: 1 }; // chandelier secret pour ouvrir le jardin secret
const PORTE_SECRETE: CoordObject = { X: 22, Y: 2 }; // Lieu où placer/enlever la porte du jardin secret
const MUR_OUVRANT: CoordObject = { X: 23, Y: 3 }; // Lieu où enlever/placer le mur secret dans la batcave

// Liste utlisée plus tard par le bot (pour interragir via une emore avec un objet)
const CHANDELIER_MOT_SECRET = new Set([
    "push",
    "pull",
    "rub",
    "clean",
    "nettoie",
    "essuie",
    "appuie",
    "frotte",
    "tire"
]);


// Description d'un objet qu'on voudrait utiliser plus tard dans le code (ici ça vient du jeu pet spa, on ne s'en sert pas)
export const PET_EARS: BC_AppearanceItem = {
    Name: "HarnessCatMask",
    Group: "ItemHood",
    Color: ["#202020", "#FF00FF", "#ADADAD"],
    Property: {
        TypeRecord: {
            typed: 1,
        },
        OverridePriority: {
            Base: 0,
        },
    },
};


// Ce gros bloc qui continue jusqu'au bout du fichier, c'est une "classe" qui décrit ce que va faire notre bot
//   il contient les éléments necessaires à ce que notre bot interragisse dans la salle qu'il doit gérer.
export class Home extends GameInstance {

    // variable contenant la description du bot pour sa bio
    private description = [
        "Welcome to Sophie's home!",
        "",
        "Make yourself at home gentle guest. People might speak french arround here, please don't mind them",
        "And please beware the automated traps here and there.",
        "",
        "Command:",
        "/bot free - [Admins only] Immediately removes any restraints added.",
        "",
        "This bot runs on a version of Ropeybot customized by Sophie (186990).",
        "Ropeybot code at https://github.com/FriendsOfBC/ropeybot",
    ].join("\n");

    // Variables du bot pour retenir ce qui se passe dans sa salle, relative à ce qu'on veut qu'il puisse faire
    private enteredTheHouse = new Set<number>(); // Liste des personnes étant déjà entrées dans la maison
    private secretRoomOpen: boolean; // garde l'information pour savoir si la salle secrete est ouverte ou non
    private secretGardenOpen: boolean; // garde l'information pour savoir si le jardin est ouvert ou non

    // 

    // Cette méthode privée est le constructeur de la classe.
    // Elle construit la classe avec des parametre par défaut, et des éléments déclancheurs, avant son initialisation
    public constructor(conn: API_Connector, gameInfos: GameInfosData, private superusers: number[]) {
        super(conn, gameInfos);
        //this.commandParser = new CommandParser(this.conn);

        // Déclancheurs via vommandes texte, reçues apres "/bot "
        this.commandParser.register("who", this.onCommandResidents);
        this.commandParser.register("free", this.onCommandFree);
        this.commandParser.register("updateroom", this.onCommandUpdateRoom);
        this.commandParser.register("reset", this.onCommandReset);
        this.commandParser.register("debug", this.onCommandDebug);

        // Mise à jour de la description du bot
        this.conn.setBotDescription(this.description);

        // Déclancheur sur reception d'un message peut importe son contenu
        conn.on("Message", this.onMessage);

        // triggers sur évenements provenant de API_Connector
        this.conn.on("RoomCreate", this.onChatRoomCreated);
        this.conn.on("RoomJoin", this.onChatRoomJoined);

        // Déclancheurs via arrivée d'un personnage sur des coordonnées

        // Déclancheurs pour des descriptions d'objets
        this.conn.chatRoom.map.addTileTrigger(EXHIBIT_1, this.onCharacterViewExhibit1);
        this.conn.chatRoom.map.addTileTrigger(EXHIBIT_2, this.onCharacterViewExhibit2);
        this.conn.chatRoom.map.addTileTrigger(EXHIBIT_3, this.onCharacterViewExhibit3);
        this.conn.chatRoom.map.addTileTrigger(EXHIBIT_4, this.onCharacterViewExhibit4);

        // Déclancheurs pour changer les contraintes portées
        this.conn.chatRoom.map.addTileTrigger(DRESSING_PAD, this.onCharacterEnterDressingPad);
        this.conn.chatRoom.map.addTileTrigger(REDRESSING_PAD, this.onCharacterEnterRedressingPad);

        // Déclancheurs pour appliquer les contraintes de type "devices"
        this.conn.chatRoom.map.addTileTrigger(KENNEL_1, this.onCharacterEnterKennel);
        this.conn.chatRoom.map.addTileTrigger(KENNEL_2, this.onCharacterEnterKennel);
        this.conn.chatRoom.map.addTileTrigger(TROLLEY_1, this.onCharacterEnterTrolley);
        this.conn.chatRoom.map.addTileTrigger(TROLLEY_2, this.onCharacterEnterTrolley);
        this.conn.chatRoom.map.addTileTrigger(CROSS_1, this.onCharacterEnterCross);
        this.conn.chatRoom.map.addTileTrigger(DISPLAY_FRAME_1, this.onCharacterEnterDisplayFrame);
        this.conn.chatRoom.map.addTileTrigger(COFFIN_1, this.onCharacterEnterCoffin);
        this.conn.chatRoom.map.addTileTrigger(TRANSPORT_BOX_1, this.onCharacterEnterTransportBox);
        this.conn.chatRoom.map.addTileTrigger(LOCKER_1, this.onCharacterEnterLocker);
        this.conn.chatRoom.map.addTileTrigger(LOCKER_2, this.onCharacterEnterLocker);

        // Déclancheurs pour les salles secrettes
        // chandelier secret pour ouvrir la batcave
        this.conn.chatRoom.map.addTileTrigger(CHANDELIER_SECRET, this.onCharacterViewChandler);
        // chandelier secret 2 pour ouvrir le jardin secret
        this.conn.chatRoom.map.addTileTrigger(CHANDELIER_SECRET_2, this.onCharacterViewChandler2);

        // Déclancheurs via arrivée d'un personnage sur des régions (coordonnées en rectangle)
        this.conn.chatRoom.map.addEnterRegionTrigger(RECEPTION_AREA, this.onCharacterEnterReception);
        this.conn.chatRoom.map.addEnterRegionTrigger(makeDoorRegion(COMMON_AREA_TO_RECEPTION_DOOR, true, false), this.onCharacterApproachCommonAreaToReceptionDoor);
        this.conn.chatRoom.map.addLeaveRegionTrigger(makeDoorRegion(COMMON_AREA_TO_RECEPTION_DOOR, true, false), this.onCharacterLeaveCommonAreaToReceptionDoor);

    }


    // Cette fonction d'initalisation est appelée après la constructeur
    public async init(): Promise<void> {

        // initialisation des variables
        this.secretRoomOpen = false;
        this.secretGardenOpen = false;

        // Mise en place initiale de la salle
        await this.setupRoom();

        // Actions qu'on souhaite que le personnage du bot fasse en entrant dans la pièce
        await this.setupCharacter();
    }

    // Cette fonction d'arrêt est appelée avant la destruction de la classe
    public async stop(): Promise<void> {
        await super.stop();
    }

    // Implementation of specific stopping tasks
    protected async cleanupGameSpecific(): Promise<void> {
        // Suppression des déclencheurs spécifiques à Home
        // On enlève les déclencheurs de la carte
        this.conn.chatRoom.map.removeTileTrigger(EXHIBIT_1.X, EXHIBIT_1.Y, this.onCharacterViewExhibit1);
        this.conn.chatRoom.map.removeTileTrigger(EXHIBIT_2.X, EXHIBIT_2.Y, this.onCharacterViewExhibit2);
        this.conn.chatRoom.map.removeTileTrigger(EXHIBIT_3.X, EXHIBIT_3.Y, this.onCharacterViewExhibit3);
        this.conn.chatRoom.map.removeTileTrigger(EXHIBIT_4.X, EXHIBIT_4.Y, this.onCharacterViewExhibit4);
        this.conn.chatRoom.map.removeTileTrigger(CHANDELIER_SECRET.X, CHANDELIER_SECRET.Y, this.onCharacterViewChandler);
        this.conn.chatRoom.map.removeTileTrigger(CHANDELIER_SECRET_2.X, CHANDELIER_SECRET_2.Y, this.onCharacterViewChandler2);
        this.conn.chatRoom.map.removeTileTrigger(DRESSING_PAD.X, DRESSING_PAD.Y, this.onCharacterEnterDressingPad);
        this.conn.chatRoom.map.removeTileTrigger(REDRESSING_PAD.X, REDRESSING_PAD.Y, this.onCharacterEnterRedressingPad);
        this.conn.chatRoom.map.removeTileTrigger(KENNEL_1.X, KENNEL_1.Y, this.onCharacterEnterKennel);
        this.conn.chatRoom.map.removeTileTrigger(KENNEL_2.X, KENNEL_2.Y, this.onCharacterEnterKennel);
        this.conn.chatRoom.map.removeTileTrigger(TROLLEY_1.X, TROLLEY_1.Y, this.onCharacterEnterTrolley);
        this.conn.chatRoom.map.removeTileTrigger(TROLLEY_2.X, TROLLEY_2.Y, this.onCharacterEnterTrolley);
        this.conn.chatRoom.map.removeTileTrigger(CROSS_1.X, CROSS_1.Y, this.onCharacterEnterCross);
        this.conn.chatRoom.map.removeTileTrigger(DISPLAY_FRAME_1.X, DISPLAY_FRAME_1.Y, this.onCharacterEnterDisplayFrame);
        this.conn.chatRoom.map.removeTileTrigger(COFFIN_1.X, COFFIN_1.Y, this.onCharacterEnterCoffin);
        this.conn.chatRoom.map.removeTileTrigger(TRANSPORT_BOX_1.X, TRANSPORT_BOX_1.Y, this.onCharacterEnterTransportBox);
        this.conn.chatRoom.map.removeTileTrigger(LOCKER_1.X, LOCKER_1.Y, this.onCharacterEnterLocker);
        this.conn.chatRoom.map.removeTileTrigger(LOCKER_2.X, LOCKER_2.Y, this.onCharacterEnterLocker);
        this.conn.chatRoom.map.removeEnterRegionTrigger(this.onCharacterEnterReception);
        this.conn.chatRoom.map.removeEnterRegionTrigger(this.onCharacterApproachCommonAreaToReceptionDoor);
        this.conn.chatRoom.map.removeLeaveRegionTrigger(this.onCharacterLeaveCommonAreaToReceptionDoor);

        // Clear the registered commands in the CommandParser and and stop it
        this.commandParser.stop();
    }

    private onChatRoomCreated = async () => {
        await this.setupRoom();
        await this.setupCharacter();
    };

    private onChatRoomJoined = async () => {
        await this.setupCharacter();
    };


    // Méthode privée de configuration de la Room, dont la carte.
    // Ici on ne met à jour que la MAP, mais on pourrait ouvrir, fermer, choisir le nombre de places, changer la whitelist, etc.
    protected setupRoom = async () => {
        try {
            // Chargement de la carte, en fonction de si la secretRoom doti etre ouverte ou non
            if (this.secretRoomOpen === true) {
                this.conn.chatRoom.map.setMapFromString(MAPBatCave);
            } else {
                this.conn.chatRoom.map.setMapFromString(MAP);
            }

        } catch (e) {
            this.log.warn("Map data not loaded", e);
        }
    };

    protected setupCharacter = async () => {
        this.conn.moveOnMap(BOT_POSITION.X, BOT_POSITION.Y);
        this.conn.Player.SetActivePose(["Kneel"]);
    };

    private freeCharacter(character: API_Character): void {
        character.Appearance.RemoveItem("ItemArms");
        character.Appearance.RemoveItem("ItemHands");
        character.Appearance.RemoveItem("ItemDevices");
    }

    /**
     * Attempts to cuff the target character's arms and feet.
     * - If the character is already bound with items without the "CuffedArms" or "CuffedFeet",
     *   it will not apply additional cuffs unless `replaceBonds` is `true`.
     * 
     * @param character The target character to be cuffed.
     * @param replaceBonds (Optional) If `true`, existing restraints may be replaced with new ones. Defaults to `false`.
     * @returns {Promise<boolean>} Resolves to `true` if both arms and feet are successfully cuffed, otherwise `false`.
     */
    private cuffOtherCharacter = async (character: API_Character, replaceBonds: boolean = false): Promise<boolean> => {

        let ArmsHaveCuffedEffect = false;
        let FeetHaveCuffedEffect = false;

        // Arms : Check if bound, and if has effect "CuffedArms"
        let itemOnArms = character.Appearance.InventoryGet("ItemArms");
        const ArmsAreFree = !Boolean(itemOnArms); // no ItemArms applied
        if (!ArmsAreFree) {
            ArmsHaveCuffedEffect = getAssetDef({ Name: itemOnArms.Name, Group: "ItemArms" }).Effect.includes("CuffedArms");
        }

        // Feet : Check if bound, and if has effect "CuffedArms"
        let itemOnFeet = character.Appearance.InventoryGet("ItemFeet");
        const FeetAreFree = !Boolean(itemOnFeet); // no ItemFeet applied
        if (!FeetAreFree) {
            FeetHaveCuffedEffect = getAssetDef({ Name: itemOnFeet.Name, Group: "ItemFeet" }).Effect.includes("CuffedFeet");
        }

        // Unless replaceBonds is true, dont apply bound if we can't have the cuffed effect on feet
        if (replaceBonds || (ArmsAreFree && (FeetHaveCuffedEffect || FeetAreFree))) {
            const newCuffs = character.Appearance.AddItem(AssetGet("ItemArms", "LeatherCuffs"));
            ArmsHaveCuffedEffect = Boolean(newCuffs); // on a appliqué un objet qui a l'effet recherché, pas besoin de vérifier
            if (ArmsHaveCuffedEffect) {
                newCuffs.SetColor(['#2E2E2E', 'Default']);
            }
        }
        if (replaceBonds || (ArmsHaveCuffedEffect && FeetAreFree)) {
            const newAnkleCuffs = character.Appearance.AddItem(AssetGet("ItemFeet", "LeatherAnkleCuffs"));
            FeetHaveCuffedEffect = Boolean(newAnkleCuffs);
            if (FeetHaveCuffedEffect) {
                newAnkleCuffs.SetColor(['Default', '#2E2E2E', 'Default']);
            }
        }

        return ArmsHaveCuffedEffect && FeetHaveCuffedEffect;
    }

    private onMessage = async (msg: MessageEvent) => {
        if (
            msg.message.Type === "Chat" &&
            !msg.message.Content.startsWith("(")
        ) {
            // on ne fait rien des texte de base pour le moment 

        } else if (msg.message.Type === "Emote") { // si c'est une emote !

            this.log.debug(`Est-ce qu'on emote ?`);
            // si le personnage dans son emote a "push" ou "appuie" sur la case CHANDELIER_SECRET
            // this.secretRoomOpen => tadaam

            // recup coords de  et regarde si CHANDELIER_SECRET === msg.sender.MemberNumber  coords
            const char = this.conn._chatRoom.getCharacter(msg.sender.MemberNumber);
            if (!char) {
                this.log.debug(`Trying to sync member number ${msg.sender.MemberNumber} but can't find them!`);
                return;
            }
            const charMapPos = char.MapPos;
            this.log.debug(`Est-ce qu'on emote au bon endroit ? : X = ${charMapPos.X} - Y = ${charMapPos.Y}`);
            if (positionEquals(charMapPos, CHANDELIER_SECRET)) {
                this.log.debug(`Au bon endroit : X = ${charMapPos.X} - Y = ${charMapPos.Y}`);
                // on regarde si un des CHANDELIER_MOT_SECRET a été prononcé devant le chandelier en emote 
                const words = msg.message.Content.toLowerCase().split(/^[a-z*]+/);

                for (const w of words) {
                    if (!CHANDELIER_MOT_SECRET.has(w)) {
                        if (this.secretRoomOpen === true) {
                            msg.sender.Tell("Whisper", "(This is just a door.)",);
                        } else {
                            this.secretRoomOpen = true;
                            msg.sender.Tell("Whisper", "(The chandler moves, and you can here a distinct 'click' that reminds you of a lock. But the wall then moves on the side !)",);

                            await wait(500);
                            await this.setupRoom();

                            // pousse le joueur deux cases vers le haut (Y - 2)
                            await wait(500);
                            const newCharMapPos: CoordObject = { X: charMapPos.X, Y: charMapPos.Y - 2 };

                            //char.Set(newCharMapPos);
                        }
                        return;
                    }
                }
            } else {
                this.log.debug(`Pas au bon endroit`);
            }
        }
    };

    private onCharacterViewExhibit1 = async (character: API_Character) => {
        character.Tell("Whisper", "(This is a painting of Sophie on her couch, getting her feet massaged by her slave Yumi)");
    };

    private onCharacterViewExhibit2 = async (character: API_Character) => {
        character.Tell("Whisper", "(This stern school board looks like someone could be punished right there, for giving a bad answer)");
    };

    private onCharacterViewExhibit3 = async (character: API_Character) => {
        character.Tell("Whisper", "(A nice drawing of Yumi dressed as a pet)");
    };

    private onCharacterViewExhibit4 = async (character: API_Character) => {
        character.Tell("Whisper", "(The gentle warmth of this fireplace gives you a pleasant feeling)");
    };

    private onCharacterEnterReception = async (character: API_Character) => {
        if (character.MemberNumber === 189644) { // Yumi
            character.Tell(
                "Whisper",
                "(La salle de classe te rappelle des lignes d'écritures et une règle en bois bien dure)",
            );
        }
        else if (character.MemberNumber === 186990) { // Sophie
            character.Tell(
                "Whisper",
                "(Le meilleur endroit pour discipliner une esclave récalcitrante)",
            );
        }
        else {
            character.Tell(
                "Whisper",
                "(This private class room smells like discipline.)",
            );
        }
    };

    private onCharacterApproachCommonAreaToReceptionDoor = async (
        character: API_Character,
    ) => {
        if (!this.enteredTheHouse.has(character.MemberNumber)) {
            if (character.MemberNumber === 189644) { // Yumi
                this.conn.SendMessage(
                    "Chat",
                    `Bienvenue à la maison ${character}. ` +
                    `Souviens-toi, les cages et autres contraintes sont automatisées`,
                );
            }
            else if (character.MemberNumber === 186990) { // Sophie
                this.conn.SendMessage(
                    "Chat",
                    `Bienvenue à la maison ${character}. Reposez-vous bien. ` +
                    `N'oubliez pas que les cages et autres contraintes sont automatisées !`,
                );
            }
            else {
                this.conn.SendMessage(
                    "Chat",
                    `Welcome ${character}. Be at ease, take some rest. ` +
                    `But maybe don't walk on the bondage devices.`,
                );
            }
            this.enteredTheHouse.add(character.MemberNumber);
        }
    };

    private onCharacterLeaveCommonAreaToReceptionDoor = async (
        character: API_Character,
    ) => {
        /*this.conn.chatRoom.map.setObject(
            COMMON_AREA_TO_RECEPTION_DOOR,
            "WoodClosed",
        );*/
    };


    private getHairColor = (character: API_Character) => {
        // use the hair color as the lining color
        const characterHairColor =
            character.Appearance.InventoryGet("HairFront").GetColor();
        const characterHairSingleColor =
            typeof characterHairColor === "object"
                ? characterHairColor[0]
                : characterHairColor;
        return characterHairSingleColor;
    }

    private onCharacterEnterKennel = async (character: API_Character) => {
        //await wait(500);

        // use the hair color as the lining color
        const useColor = this.getHairColor(character);

        const bondageDevice = character.Appearance.AddItem(AssetGet("ItemDevices", "Kennel"));
        bondageDevice.SetCraft({
            Name: `Sturdy Kennel`,
            Description: `A sturdy kennel, enclosed arround ${character} to ensure they won't go away.`,
        });
        bondageDevice.setProperty("TypeRecord", { d: 0, p: 1 });
        bondageDevice.SetColor(["#2E2E29", useColor, "#2E2E29", "#2E2E29"]); // ["#2E2E29", "#780E0E", "#2E2E29", "#2E2E29"]

        character.Tell(
            "Whisper",
            "(This kennel looks nice and comfy.)",
        );

        await wait(1000);
        bondageDevice.setProperty("TypeRecord", { d: 1, p: 1 });
        bondageDevice.SetDifficulty(20);

        await wait(2000);
        character.Tell(
            "Whisper",
            "(The door shuting down on you makes you feel trapped. You can hear the distinctive sound of a lock sealing the door.)",
        );
        bondageDevice.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
            Password: "SOPHIE",
            Hint: "Your host.",
            RemoveItem: true,
            RemoveTimer: Date.now() + 5 * 60 * 1000,
            ShowTimer: true,
            LockSet: true,
        });
    }


    private onCharacterEnterTrolley = async (character: API_Character) => {
        // Le bot "attache" le trolley qui est de type itemDevices (case en bas à droite sur l'itnerface) au joueur declanchant l'evenement
        const bondageDevice = character.Appearance.AddItem(AssetGet("ItemDevices", "Trolley"));
        // Le trolley est un craft spécifique avec une description et un nom
        bondageDevice.SetCraft({
            Name: `Standard Trolley`,
            Description: `A standard Trolley, used to easily transport bound slaves on wheels.`,
        });

        let bondageArms: API_AppearanceItem;
        // verif si arms libres
        if (!Boolean(character.Appearance.InventoryGet("ItemArms"))) {
            // verif si femme
            if (character.upperBodyStyle() === "female") {
                //bondageArms = character.Appearance.AddItem(AssetGet("ItemArms", "SleepSac"));

                bondageArms = character.Appearance.AddItem(AssetGet("ItemArms", "HighSecurityStraitJacket"));
                bondageArms.setProperty("TypeRecord", { c: 1, a: 1, s: 3 });
            } else {
                // sinon
                bondageArms = character.Appearance.AddItem(AssetGet("ItemArms", "HighSecurityStraitJacket"));
                bondageArms.setProperty("TypeRecord", { c: 1, a: 1, s: 3 });
            }
        }

        character.Tell("Whisper",
            "(You weirdly trip on this Trolley. The straps buckle and tighten around you, effectively securing you to the trolley.)");

        await wait(500);
        // Le trolley passe en extended type "closed" avec les boucles fermées (ce sont les cases de choix qu'on voit sur l'interface)
        bondageDevice.Extended.SetType("Closed");
        bondageDevice.SetDifficulty(20);

        await wait(2000);
        //debug
        this.log.debug(`Home - Trolley type : "${bondageDevice.Extended.Type}"`);
        // mise en place du cadenas avec un TimerPasswordPadlock de 5 minutes (l'unité de temps est en milisecondes)
        bondageDevice.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
            Password: "SOPHIE",
            Hint: "Your host.",
            RemoveItem: true,
            RemoveTimer: Date.now() + 5 * 60 * 1000,
            ShowTimer: true,
            LockSet: true,
        });
        if (Boolean(bondageArms)) {
            bondageArms.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
                Password: "SOPHIE",
                Hint: "Your host.",
                RemoveItem: true,
                RemoveTimer: Date.now() + 5 * 60 * 1000,
                ShowTimer: true,
                LockSet: true,
            });
        }

        character.Tell("Whisper",
            "(You can hear the distinctive sound of locks closing on the straps, sealing you on your trolley. )");
    }


    private onCharacterEnterCross = async (character: API_Character) => {
        // Mettre les cuffs aux bras et jambes si c'est necessaire, sans enlever d'autres devices
        let isCuffed = await this.cuffOtherCharacter(character);
        //this.log.debug(`Statut isCuffed = ${isCuffed}`);

        // X-Cross Prerequisite: ["CuffedArms", "CuffedFeet"],
        if (isCuffed) {

            //await wait(500);
            const bondageDevice = character.Appearance.AddItem(AssetGet("ItemDevices", "X-Cross"));

            character.Tell("Whisper",
                "(Your limbs are drown toward each extremities of the St Andrew cross, until they attach themselves to the device.)");


            await wait(1000);
            // mise en place du cadenas avec un TimerPasswordPadlock de 5 minutes (l'unité de temps est en milisecondes)await wait(1000);
            bondageDevice.SetDifficulty(20);
            bondageDevice.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
                Password: "SOPHIE",
                Hint: "Your host.",
                RemoveItem: true,
                RemoveTimer: Date.now() + 5 * 60 * 1000,
                ShowTimer: true,
                LockSet: true,
            });

            character.Tell("Whisper",
                "(You can hear the distinctive sound of locks closing, sealing you on your cross. )");
        } else {
            //this.log.debug(`Home - Cross : pas mit`);

            character.Tell("Whisper",
                "(You look at the St Andrew Cross, and it looks back into your soul. Menacingly.)");
        }
    }


    private onCharacterEnterDisplayFrame = async (character: API_Character) => {
        //await wait(500);

        //if(!Boolean(character.Appearance.InventoryGet("Cloth"))) {
        character.Appearance.RemoveItem("Cloth");
        //}
        //if(!Boolean(character.Appearance.InventoryGet("ClothLower"))) {
        character.Appearance.RemoveItem("ClothLower");
        //}
        //if(!Boolean(character.Appearance.InventoryGet("Shoes"))) {
        character.Appearance.RemoveItem("Shoes");
        //}

        character.Tell("Whisper",
            "(The frame opens, its metal bars shreds your cloth, before grabbing you inside of it. What the hell?)");
        //await wait(500);

        const bondageDevice = character.Appearance.AddItem(AssetGet("ItemDevices", "TheDisplayFrame"));

        await wait(500);
        bondageDevice.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
            Password: "SOPHIE",
            Hint: "Your host.",
            RemoveItem: true,
            RemoveTimer: Date.now() + 5 * 60 * 1000,
            ShowTimer: true,
            LockSet: true,
        });

        await wait(500);
        character.Tell("Whisper",
            "(Don't you feel a bit exposed? Are you blushing?)");
    }


    private onCharacterEnterCoffin = async (character: API_Character) => {
        character.Tell("Whisper",
            "(Who keeps a coffin at home? And what kind of person tries to get inside?)");
    }


    private onCharacterEnterTransportBox = async (character: API_Character) => {

        //await wait(500);
        const bondageDevice = character.Appearance.AddItem(AssetGet("ItemDevices", "TransportWoodenBox"));
        bondageDevice.SetDifficulty(20);

        character.Tell("Whisper",
            "(You bump onto the box, and get trapped inside. How clumsy can you be? Why is it closing over you?)");

        await wait(1000);
        bondageDevice.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
            Password: "SOPHIE",
            Hint: "Your host.",
            RemoveItem: true,
            RemoveTimer: Date.now() + 5 * 60 * 1000,
            ShowTimer: true,
            LockSet: true,
        });
        await wait(500);
        character.Tell("Whisper",
            "(Wait, was it the sound of a lock?)");

        bondageDevice.setProperty("Text", `Keep inside`); // voir dans le code de BC pour les objets comme ça avec du texte ?
        //this.log.debug(`TB - After properties text = ${JSON.stringify(bondageDevice.getData().Property, null, 2)}`);

    }

    private onCharacterEnterLocker = async (character: API_Character) => {

        //await wait(500);
        const bondageDevice = character.Appearance.AddItem(AssetGet("ItemDevices", "Locker"));

        character.Tell("Whisper",
            "(You get stuck in the locker. Somehow.)");
        bondageDevice.SetDifficulty(20);

        await wait(1500);
        bondageDevice.lock("TimerPasswordPadlock", this.conn.Player.MemberNumber, {
            Password: "SOPHIE",
            Hint: "Your host.",
            RemoveItem: true,
            RemoveTimer: Date.now() + 5 * 60 * 1000,
            ShowTimer: true,
            LockSet: true,
        });
        await wait(500);
        character.Tell("Whisper",
            "(Hey ! Who locked the locker?)");
    }


    private onCharacterViewChandler = async (character: API_Character) => {
        if (this.secretRoomOpen === false) {
            character.Tell(
                "Whisper",
                "(Nice chandler, a bit rusty maybe.)",
            );
        }
    };

    private onCharacterViewChandler2 = async (character: API_Character) => {
        character.Tell(
            "Whisper",
            "(You push on the chandler and 'woosh !')",
        );

        if (this.secretGardenOpen === false) {
            // On place la porte et on enleve le mur !
            // changer deux cases

            // Lieu où placer/enlever la porte du jardin secret
            this.conn.chatRoom.map.setObject(
                PORTE_SECRETE,
                "WoodClosed",
            );

            // Lieu où enlever/placer le mur secret dans la batcave
            this.conn.chatRoom.map.setTile(
                MUR_OUVRANT,
                "Stone",
            );


            this.secretGardenOpen = true;
        } else {
            // Lieu où placer/enlever la porte du jardin secret
            this.conn.chatRoom.map.setObject(
                PORTE_SECRETE,
                "Blank",
            );

            this.conn.chatRoom.map.setTile(
                MUR_OUVRANT,
                "Stone", "Wall"
            );
            this.secretGardenOpen = false;
        }
    };


    private onCharacterEnterDressingPad = async (character: API_Character) => {
        character.Tell(
            "Whisper",
            "(Nothing special happening here. For now.)",
        );

        /*
        this.conn.SendMessage(
            "Emote",
            `*A voice speaks over the tannoy: Please welcome our newest resident: ${character}!`,
        );
        */
    };


    private onCharacterEnterRedressingPad = async (
        character: API_Character,
    ) => {
        character.Tell(
            "Whisper",
            "(Mirror, mirror...)",
        );
        this.freeCharacter(character);
    };


    private onCommandResidents = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {

        const residents = this.conn.chatRoom.characters.filter((c) =>
            this.enteredTheHouse.has(c.MemberNumber),
        );

        const residentsList = residents.join("\n");
        if (residentsList.length === 0) {
            this.conn.reply(msg, "There are no residents in the home right now.)");
        } else {
            this.conn.reply(msg, `Current residents:\n${residentsList})`);
        }
    };


    private onCommandFree = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if (this.superusers.includes(sender.MemberNumber) || this.conn.chatRoom.Admin.includes(sender.MemberNumber)) {
            this.freeCharacter(sender);
        }
    };

    // commandes pour super user seulement
    //

    private onCommandUpdateRoom = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if (this.superusers.includes(sender.MemberNumber)) {
            await this.setupRoom();
        }
    };


    private onCommandReset = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if (this.superusers.includes(sender.MemberNumber)) {
            this.secretRoomOpen = false;
            this.secretGardenOpen = false;

            await this.setupRoom();

        }
    };


    private onCommandDebug = async (
        sender: API_Character,
        msg: BC_Server_ChatRoomMessage,
        args: string[],
    ) => {
        if (this.superusers.includes(sender.MemberNumber)) {
            /*
            // Bloc pour vérifier que le personnage est bien présent, inutile ici vu qu'il vient de faire la commande
            const char = this.conn._chatRoom.getCharacter(sender.MemberNumber);
            if (!char) {
                this.log.debug(`Trying to sync member number ${sender.MemberNumber} but can't find them!`);
                return;
            }*/

            const character = this.conn._chatRoom.getCharacter(sender.MemberNumber);
            const bondageDevice = character.Appearance.InventoryGet("ItemDevices");
            if (Boolean(bondageDevice))
                this.log.debug(`Device properties = ${JSON.stringify(bondageDevice.getData().Property, null, 2)}`);
            const bondageArms = character.Appearance.InventoryGet("ItemArms");
            if (Boolean(bondageArms))
                this.log.debug(`Arms properties = ${JSON.stringify(bondageArms.getData().Property, null, 2)}`);

        }
    };

}

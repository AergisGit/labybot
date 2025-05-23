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

import { io } from "socket.io-client";
import { logger } from './utils/logger';
import { API_Character, API_Character_Data, ItemPermissionLevel } from "./apiCharacter";
import { API_Chatroom, ChatRoomAccessVisibility } from "./apiChatroom";
import { API_Chatroom_Data } from "@shared/types/bc";
import { Socket } from "socket.io-client";
import { API_AppearanceItem, BC_AppearanceItem } from "./item";
import { compressToUTF16 } from "lz-string";
import { EventEmitter } from "stream";
import { BC_Server_ChatRoomMessage, TBeepType } from "./logicEvent";
import { SocketWrapper } from "./socketWrapper";
import { wait } from "./utils/time";

export enum LeaveReason {
    DISCONNECT = "ServerDisconnect",
    LEAVE = "ServerLeave",
    KICK = "ServerKick",
    BAN = "ServerBan",
}

export type TellType = "Whisper" | "Chat" | "Emote" | "Activity";

export interface RoomDefinition {
    Name: string;
    Description: string;
    Background: string;
    Private?: boolean;
    Locked?: boolean | null;
    Access: ChatRoomAccessVisibility[];
    Visibility: ChatRoomAccessVisibility[];
    Space: ServerChatRoomSpace;
    Admin: number[];
    Ban: number[];
    Limit: number;
    BlockCategory: ServerChatRoomBlockCategory[];
    Game: ServerChatRoomGame;
    Language: ServerChatRoomLanguage;
    MapData?: ServerChatRoomMapData;
    Whitelist?: number[];
}

export interface SingleItemUpdate extends BC_AppearanceItem {
    Target: number;
}

export interface SyncItemPayload {
    Source: number;
    Item: SingleItemUpdate;
}

export interface CoordObject {
    X: number;
    Y: number;
}

export interface SyncMapDataPayload {
    MemberNumber: number;
    MapData: CoordObject;
}

// What the bot advertises as its game version
const GAMEVERSION = "R114";
const LZSTRING_MAGIC = "╬";

class PromiseResolve<T> {
    public prom: Promise<T>;
    public resolve!: (x: T) => void;

    constructor() {
        this.prom = new Promise<T>((r) => {
            this.resolve = r;
        });
    }
}

interface ChatRoomAllowItem {
    MemberNumber: number;
}

interface ChatRoomAllowItemResponse extends ChatRoomAllowItem {
    AllowItem: boolean;
}

interface ReorderPlayers {
    PlayerOrder: number[];
}

interface ChatRoomAdmin {
    Action: "Update" | "MoveLeft" | "MoveRight" | "Kick";
    MemberNumber?: number;
    Publish?: boolean;
    Room?: Partial<API_Chatroom_Data>;
}

export interface MessageEvent {
    sender: API_Character;
    message: BC_Server_ChatRoomMessage;
}

interface OnlineFriendResult {
    ChatRoomName: string;
    ChatRoomSpace: string;
    MemberName: string;
    MemberNumber: number;
    Private: boolean;
    Type: string;
}

export class API_Connector extends EventEmitter {
    private sock: Socket;
    private wrappedSock: SocketWrapper;
    private _player: API_Character | undefined;
    public _chatRoom?: API_Chatroom;

    private started = false;
    private roomJoined: API_Chatroom_Data;

    private loggedIn = new PromiseResolve<void>();
    private roomSynced = new PromiseResolve<void>();

    private roomJoinPromise: PromiseResolve<string>;
    private roomCreatePromise: PromiseResolve<string>;
    private roomSearchPromise: PromiseResolve<API_Chatroom_Data[]>; // (type not quite right: has 'Creator', MemberCount, MemberLimit)
    private onlineFriendsPromise: PromiseResolve<OnlineFriendResult[]>;
    private itemAllowQueries = new Map<
        number,
        PromiseResolve<ChatRoomAllowItemResponse>
    >();

    private leaveReasons = new Map<number, LeaveReason>();

    constructor(
        private url: string,
        public username: string,
        private password: string,
        env: "live" | "test",
    ) {
        super();

        const origin =
            env === "live"
                ? "https://www.bondageprojects.elementfx.com"
                : "http://localhost:7777";

        logger.info(`Connecting to ${this.url} with origin ${origin}`);
        this.sock = io(this.url, {
            transports: ["websocket"],
            extraHeaders: {
                Origin: origin,
            },
        });
        this.wrappedSock = new SocketWrapper(this.sock);

        this.sock.on("connect", this.onSocketConnect);
        this.sock.on("connect_error", this.onSocketConnectError);
        this.sock.io.on("reconnect", this.onSocketReconnect);
        this.sock.io.on("reconnect_attempt", this.onSocketReconnectAttempt);
        this.sock.on("disconnect", this.onSocketDisconnect);
        this.sock.on("ServerInfo", this.onServerInfo);
        this.sock.on("LoginResponse", this.onLoginResponse);
        this.sock.on("ChatRoomCreateResponse", this.onChatRoomCreateResponse);
        this.sock.on("ChatRoomUpdateResponse", this.onChatRoomUpdateResponse);
        this.sock.on("ChatRoomSync", this.onChatRoomSync);
        this.sock.on("ChatRoomSyncMemberJoin", this.onChatRoomSyncMemberJoin);
        this.sock.on("ChatRoomSyncMemberLeave", this.onChatRoomSyncMemberLeave);
        this.sock.on(
            "ChatRoomSyncRoomProperties",
            this.onChatRoomSyncRoomProperties,
        );
        this.sock.on("ChatRoomSyncCharacter", this.onChatRoomSyncCharacter);
        this.sock.on(
            "ChatRoomSyncReorderPlayers",
            this.onChatRoomSyncReorderPlayers,
        );
        this.sock.on("ChatRoomSyncSingle", this.onChatRoomSyncSingle);
        this.sock.on("ChatRoomSyncExpression", this.onChatRoomSyncExpression);
        this.sock.on("ChatRoomSyncPose", this.onChatRoomSyncPose);
        this.sock.on("ChatRoomSyncArousal", this.onChatRoomSyncArousal);
        this.sock.on("ChatRoomSyncItem", this.onChatRoomSyncItem);
        this.sock.on("ChatRoomSyncMapData", this.onChatRoomSyncMapData);
        this.sock.on("ChatRoomMessage", this.onChatRoomMessage);
        this.sock.on("ChatRoomAllowItem", this.onChatRoomAllowItem);
        this.sock.on(
            "ChatRoomCharacterItemUpdate",
            this.onChatRoomCharacterItemUpdate,
        );
        this.sock.on("ChatRoomSearchResult", this.onChatRoomSearchResult);
        this.sock.on("ChatRoomSearchResponse", this.onChatRoomSearchResponse);
        this.sock.on("AccountBeep", this.onAccountBeep);
        this.sock.on("AccountQueryResult", this.onAccountQueryResult);
    }

    public isConnected(): boolean {
        return this.sock.connected;
    }

    public get Player(): API_Character {
        return this._player!;
    }

    public get chatRoom(): API_Chatroom {
        return this._chatRoom!;
    }

    public SendMessage(
        type: TellType,
        msg: string,
        target?: number,
        dict?: Record<string, any>[],
    ): void {
        if (msg.length > 1000) {
            logger.warn("Message too long, truncating");
            msg = msg.substring(0, 1000);
        }
        logger.info(`Sending ${type}`, msg);

        const payload = { Type: type, Content: msg } as Record<string, any>;
        if (target) payload.Target = target;
        if (dict) payload.Dictionary = dict;
        this.wrappedSock.emit("ChatRoomChat", payload);
    }

    public reply(orig: BC_Server_ChatRoomMessage, reply: string): void {
        const prefix = this.chatRoom.usesMaps() ? "(" : "";

        if (orig.Type === "Chat") {
            if (this.chatRoom.usesMaps()) {
                this.SendMessage("Chat", prefix + reply);
            } else {
                this.SendMessage("Emote", "*" + prefix + reply);
            }
        } else {
            this.SendMessage("Whisper", prefix + reply, orig.Sender);
        }
    }

    public ChatRoomUpdate(update: Record<string, any>): void {
        logger.debug("ChatRoomUpdate....");
        //logger.debug("Will update chat room with: ", update);
        this.chatRoom.update(update);
        //logger.debug("this.chatRoom.ToInfo(): ", this.chatRoom.ToInfo());

        const payload = {
            Action: "Update",
            MemberNumber: 0,
            Room: {
                ...this.chatRoom.ToInfo(),
                //...update,
            },
        } as ChatRoomAdmin;
        //if (payload.Room.Limit !== undefined)
        //    payload.Room.Limit = payload.Room.Limit;
        //logger.debug("Updating chat room", payload);
        this.chatRoomAdmin(payload);
    }

    public chatRoomAdmin(payload: ChatRoomAdmin) {
        this.wrappedSock.emit("ChatRoomAdmin", payload);
    }

    public AccountBeep(
        memberNumber: number,
        beepType: null,
        message: string,
    ): void {
        this.wrappedSock.emit("AccountBeep", {
            BeepType: beepType ?? "",
            MemberNumber: memberNumber,
            Message: message,
        });
    }

    public async QueryOnlineFriends(): Promise<API_Character[]> {
        if (!this.onlineFriendsPromise) {
            this.onlineFriendsPromise = new PromiseResolve<
                OnlineFriendResult[]
            >();
            this.wrappedSock.emit("AccountQuery", {
                Query: "OnlineFriends",
            });
        }

        const result = await this.onlineFriendsPromise.prom;
        return result.map((m) =>
            this._chatRoom.findMember(m.MemberNumber),
        );
    }

    private onSocketConnect = async () => {
        logger.info("Socket connected! Now logging in...");
        this.wrappedSock.emit("AccountLogin", {
            AccountName: this.username,
            Password: this.password,
        });
        if (!this.started) await this.start();
        if (this.roomJoined) await this.joinOrCreateRoom(this.roomJoined);
    };

    private onSocketConnectError = (err: Error) => {
        logger.error(`Socket connect error: ${err.message}`);
    };

    private onSocketReconnect = () => {
        logger.info("Socket reconnected");
    };

    private onSocketReconnectAttempt = () => {
        logger.info("Socket reconnect attempt");
    };

    private onSocketDisconnect = () => {
        logger.warn("Socket disconnected");
        this.loggedIn = new PromiseResolve<void>();
        this.roomSynced = new PromiseResolve<void>();
    };

    private onServerInfo = (info: any) => {
        if (info.Time) {
            const formattedTime = new Date(info.Time).toISOString().replace("T", " ").split(".")[0];
            logger.info("Server info:", { ...info, Time: formattedTime });
        } else {
            logger.info("Server info:", info);
        }
        this.emit('serverInfo', info); // Re-emit the event, I'll catch it in GameManager
    };

    private onLoginResponse = (resp: API_Character_Data) => {
        /*if (typeof resp === "string") {
            logger.error("Login failed:", resp);
            this.emit("LoginError", resp);
            return;
        }*/
        //logger.info("Got login response", resp);
        this._player = new API_Character(resp, this, undefined);
        this.loggedIn.resolve();
    };

    private onChatRoomCreateResponse = (resp: string) => {
        logger.info("Got chat room create response", resp);
        this.roomCreatePromise.resolve(resp);
    };

    private onChatRoomUpdateResponse = (resp: any) => {
        logger.info("Got chat room update response", resp);
    };

    private onChatRoomSync = (resp: API_Chatroom_Data) => {
        //logger.info("Got chat room sync", resp);
        if (!this._chatRoom) {
            this._chatRoom = new API_Chatroom(resp, this, this._player);
        } else {
            this._chatRoom.update(resp);
        }
        this.roomSynced.resolve();
        this.roomJoined = {
            Name: resp.Name,
            Description: resp.Description,
            Background: resp.Background,
            Access: resp.Access,
            Visibility: resp.Visibility,
            Space: resp.Space,
            Admin: resp.Admin,
            Ban: resp.Ban,
            Limit: resp.Limit,
            BlockCategory: resp.BlockCategory,
            Game: resp.Game,
            Language: resp.Language,
        };
    };

    private onChatRoomSyncMemberJoin = (resp: any) => {
        logger.info("Chat room member joined", resp.Character?.Name);

        this.leaveReasons.delete(resp.Character.MemberNumber);

        this._chatRoom.memberJoined(resp.Character);

        const char = this._chatRoom.getCharacter(resp.Character.MemberNumber);

        this.emit("CharacterEntered", char);
    };

    private onChatRoomSyncMemberLeave = (resp: any) => {
        logger.info(
            `chat room member left with reason ${this.leaveReasons.get(resp.SourceMemberNumber)}`,
            resp,
        );
        const leftMember = this._chatRoom.getCharacter(resp.SourceMemberNumber);
        this._chatRoom.memberLeft(resp.SourceMemberNumber);

        this.emit("CharacterLeft", {
            sourceMemberNumber: resp.SourceMemberNumber,
            character: leftMember,
            leaveMessage: null,
            intentional:
                this.leaveReasons.get(resp.SourceMemberNumber) !==
                LeaveReason.DISCONNECT,
        });
    };

    private onChatRoomSyncRoomProperties = (resp: API_Chatroom_Data) => {
        logger.info("sync room properties", resp);
        this._chatRoom.update(resp);

        // sync some data back to the definition of the room we're joined to so that, after
        // a void, we recreate the room with the same settings
        this.roomJoined.Access = resp.Access;
        this.roomJoined.Visibility = resp.Visibility;
        this.roomJoined.Ban = resp.Ban;
        this.roomJoined.Limit = resp.Limit;
        this.roomJoined.BlockCategory = resp.BlockCategory;
        this.roomJoined.Game = resp.Game;
        this.roomJoined.Name = resp.Name;
        this.roomJoined.Description = resp.Description;
        this.roomJoined.Background = resp.Background;

        // remove these if they're there. The server will have converted to new
        // Access / Visibility fields and won't accept a ChatRoomCreate with both
        // Private/Locked and Access/Visibility
        delete this.roomJoined.Private;
        delete this.roomJoined.Locked;
    };

    private onChatRoomSyncCharacter = (resp: any) => {
        //logger.info("sync character", resp);
        this._chatRoom.characterSync(
            resp.Character.MemberNumber,
            resp.Character,
            resp.SourceMemberNumber,
        );
    };

    private onChatRoomSyncReorderPlayers = (resp: ReorderPlayers) => {
        //logger.info("sync reorder players", resp);
        this._chatRoom.onReorder(resp.PlayerOrder);
    };

    private onChatRoomSyncSingle = (resp: any) => {
        //logger.info("sync single", resp);
        this._chatRoom.characterSync(
            resp.Character.MemberNumber,
            resp.Character,
            resp.SourceMemberNumber,
        );
    };

    private onChatRoomSyncExpression = (resp: any) => {
        //logger.info("sync expression", resp);
        const char = this.chatRoom.getCharacter(resp.MemberNumber);
        const item = new API_AppearanceItem(char, {
            Group: resp.Group,
            Name: resp.Name,
            Property: {
                Expression: resp.Name,
            },
        });
    };

    private onChatRoomSyncPose = (resp: any) => {
        //logger.info("got sync pose", resp);
        const char = this.chatRoom.getCharacter(resp.MemberNumber);
        char.update({
            ActivePose: resp.Pose,
        });
        this.emit("PoseChange", {
            character: char,
        });
    };

    private onChatRoomSyncArousal = (resp: any) => {
        //logger.info("Chat room sync arousal", resp);
    };

    private onChatRoomSyncItem = (update: SyncItemPayload) => {
        logger.info("Chat room sync item", update);
        this._chatRoom.characterItemUpdate(update.Item);
        //if (update.Item.Target === this._player.MemberNumber) {
        //    const payload = {
        //        AssetFamily: "Female3DCG",
        //        Appearance: this.Player.Appearance.getAppearanceData(),
        //    };
        //    this.accountUpdate(payload);
        //}
    };

    private onChatRoomSyncMapData = (update: SyncMapDataPayload) => {
        logger.info("chat room map data", update);
        this._chatRoom.mapPositionUpdate(update.MemberNumber, update.MapData);
    };

    private onChatRoomMessage = (msg: BC_Server_ChatRoomMessage) => {
        // Filter onChatRoomMessage logs :
        //  - "Status" (ex : start talking)
        //  - "Hidden" 
        //  - mod messages
        const filterModList = ["BCXMsg", "BCEMsg", "LSCGMsg", "bctMsg", "MPA", "dogsMsg", "bccMsg", "ECHO_INFO2", "MoonCEBC"];
        if (msg.Type !== "Status" && msg.Type !== "Hidden" && !filterModList.includes(msg.Content)) {
            logger.info("chat room message", msg);
        }

        const char = this._chatRoom.getCharacter(msg.Sender);

        if (
            msg.Type === "Action" &&
            Object.values(LeaveReason).includes(msg.Content as LeaveReason)
        ) {
            this.leaveReasons.set(
                char.MemberNumber,
                msg.Content as LeaveReason,
            );
        }

        this.emit("Message", {
            sender: char,
            message: msg,
        } as MessageEvent);
    };

    private onChatRoomAllowItem = (resp: ChatRoomAllowItemResponse) => {
        logger.info("ChatRoomAllowItem", resp);
        const promResolve = this.itemAllowQueries.get(resp.MemberNumber);
        if (promResolve) {
            this.itemAllowQueries.delete(resp.MemberNumber);
            promResolve.resolve(resp);
        }
    };

    private onChatRoomCharacterItemUpdate = (update: SingleItemUpdate) => {
        logger.info("Chat room character item update", update);
        this._chatRoom.characterItemUpdate(update);
        // Probably need to update the bot appearance
        //   but not like that.
        /*if (update.Target === this._player.MemberNumber) {
            const payload = {
                AssetFamily: "Female3DCG",
                Appearance: this.Player.Appearance.getAppearanceData(),
            };
            this.accountUpdate(payload);
        }*/
    };

    private onAccountBeep = (payload: TBeepType) => {
        if (payload?.Message && typeof payload.Message === "string") payload.Message = payload.Message.split("\n\n")[0];
        // new
        this.emit("Beep", { payload });
    };

    private onAccountQueryResult = (payload: Record<string, any>) => {
        if (payload.Query === "OnlineFriends") {
            this.onlineFriendsPromise.resolve(payload.Result);
        }
    };

    private onChatRoomSearchResult = (results: API_Chatroom_Data[]) => {
        logger.info("Chat room search result", results);
        if (!this.roomSearchPromise) return;
        this.roomSearchPromise.resolve(results);
    };

    private onChatRoomSearchResponse = (result: string) => {
        logger.info("Chat room search (join) response", result);
        if (!this.roomJoinPromise) return;
        this.roomJoinPromise.resolve(result);
    };

    public async ChatRoomJoin(name: string): Promise<boolean> {
        if (this.roomJoinPromise) {
            const result = await this.roomJoinPromise.prom;
            return result === "JoinedRoom";
        }

        this.roomJoinPromise = new PromiseResolve();

        try {
            this.wrappedSock.emit("ChatRoomJoin", {
                Name: name,
            });

            const joinResult = await this.roomJoinPromise.prom;
            if (joinResult !== "JoinedRoom") {
                logger.error("Failed to join room", joinResult);
                return false;
            }
        } finally {
            this.roomJoinPromise = undefined;
        }

        logger.info("Room joined");

        await this.roomSynced.prom;
        this._player.chatRoom = this._chatRoom;

        //this.roomJoinPromise = undefined;

        this.emit("RoomJoin");

        return true;
    }

    public async ChatRoomCreate(roomDef: API_Chatroom_Data): Promise<boolean> {
        if (this.roomCreatePromise) {
            const result = await this.roomCreatePromise.prom;
            return result === "ChatRoomCreated";
        }

        logger.info("creating room");
        this.roomCreatePromise = new PromiseResolve();

        try {
            this.wrappedSock.emit("ChatRoomCreate", {
                Admin: [this._player.MemberNumber],
                ...roomDef,
            });

            const createResult = await this.roomCreatePromise.prom;
            if (createResult !== "ChatRoomCreated") {
                logger.error("Failed to create room", createResult);
                return false;
            }
        } finally {
            this.roomCreatePromise = undefined;
        }

        logger.info("Room created");

        await this.roomSynced.prom;
        this._player.chatRoom = this._chatRoom;

        //this.roomCreatePromise = undefined;

        this.emit("RoomCreate");

        return true;
    }

    public async joinOrCreateRoom(roomDef: API_Chatroom_Data): Promise<void> {
        await this.loggedIn.prom;

        // after a void, we can race between creating the room and other players
        // reappearing and creating it, so we need to try both until one works
        while (true) {
            logger.info("Trying to join room...", roomDef);
            const joinResult = await this.ChatRoomJoin(roomDef.Name);
            if (joinResult) return;

            logger.error("Failed to join room, trying to create...", roomDef);
            const createResult = await this.ChatRoomCreate(roomDef);
            if (createResult) return;

            await wait(3000);
        }
    }

    public async joinOrCreateAnotherRoom(roomDef: API_Chatroom_Data): Promise<boolean> {
        await this.loggedIn.prom;
        let roomsFound: API_Chatroom_Data[] = [];

        // if we're in a room, we need to leave it first
        if (this._player.chatRoom) {
            logger.info("Already in a room, leaving the current room...");
            roomsFound = await this.ChatRoomLeave();
        } else {
            logger.info("Not in a room, looking for room: '", roomDef.Name, "'");
            roomsFound = await this.searchRooms(roomDef.Name);
        }
        // we are now hopefully in no room
        //    we should search for the room we want, to see if we create or join it.
        logger.debug("Room(s) found.");//, roomsFound);

        logger.info("Looking for our room: ", roomDef.Name);
        for (const room of roomsFound) {
            if (room.Name === roomDef.Name) {
                logger.info("Found room: ", roomDef.Name);
                logger.info("Trying to join...");
                const joinResult = await this.ChatRoomJoin(roomDef.Name);
                if (joinResult) return true;
                else {
                    logger.warn("Failed to join the room: ", roomDef.Name);
                    //return false;
                    break;
                }
            }
        }

        // if we get here, we didn't find the room, so we need to create it
        logger.warn("Didn't found room to join, trying to create: ", roomDef.Name);
        const createResult = await this.ChatRoomCreate(roomDef);
        if (createResult) return true;
        else {
            logger.error("Failed to create the room: ", roomDef.Name);
            return false;
        }
    }

    // leave the current room and search the list of rooms, as a player would
    public async ChatRoomLeave(): Promise<API_Chatroom_Data[]> {
        this.roomSynced = new PromiseResolve<void>();
        this.wrappedSock.emit("ChatRoomLeave", "");
        this.roomJoined = undefined;
        return await this.searchRooms("");
    }

    private async searchRooms(
        query: string,
        language: string = "",
        space: ServerChatRoomSpace = "X",
        game: string = "",
        fullRooms: boolean = true,
        showLocked: boolean = true
    ): Promise<API_Chatroom_Data[]> {
        if (this.roomSearchPromise) return await this.roomSearchPromise.prom;

        this.roomSearchPromise = new PromiseResolve();
        this.wrappedSock.emit("ChatRoomSearch", {
            Query: query.toUpperCase(),
            Language: language,
            Space: space,
            Game: game,
            FullRooms: fullRooms,
            ShowLocked: showLocked
        });

        return await this.roomSearchPromise.prom;
    }

    private async start(): Promise<void> {
        this.started = true;
        await this.loggedIn.prom;
        logger.info("Logged in.");

        this.accountUpdate({
            OnlineSharedSettings: {
                GameVersion: GAMEVERSION,
            },
        });
        logger.info("Connector started.");
    }

    public setItemPermission(perm: ItemPermissionLevel): void {
        this.accountUpdate({
            ItemPermission: perm,
        });
    }

    public async setBotDescription(desc: string) {
        await this.loggedIn.prom;
        //logger.debug("setBotDescription: ", desc);
        try {
            this.accountUpdate({
                Description: LZSTRING_MAGIC + compressToUTF16(desc),
            });
        } catch (e) {

            logger.error("setBotDescription: ", e);
        }
    }

    public setScriptPermissions(hide: boolean, block: boolean): void {
        this.accountUpdate({
            OnlineSharedSettings: {
                GameVersion: GAMEVERSION,
                ScriptPermissions: {
                    "Hide": {
                        "permission": hide ? 1 : 0,
                    },
                    "Block": {
                        "permission": block ? 1 : 0,
                    }
                }
            },
        });
    }

    public updateCharacterItem(update: SingleItemUpdate): void {
        logger.info("sending ChatRoomCharacterItemUpdate", update);
        this.wrappedSock.emit("ChatRoomCharacterItemUpdate", update);
    }

    public updateCharacter(update: Partial<API_Character_Data>): void {
        logger.info("sending ChatRoomCharacterUpdate", JSON.stringify(update));
        this.wrappedSock.emit("ChatRoomCharacterUpdate", update);
    }


    public updateRoom(roomDef: Partial<API_Chatroom_Data>): void {
        logger.info("sending ChatRoomAdmin", JSON.stringify(roomDef));

        try {
            this.wrappedSock.emit("ChatRoomAdmin", {
                Action: "Update",
                MemberNumber: 0,
                Room: {
                    ...roomDef,
                    //...update,
                }
            } as ChatRoomAdmin,);

            // Update API_Chatroom data localy
            if (this._chatRoom) {
                this._chatRoom.update(roomDef);
                logger.info("Local chatroom data updated: ", roomDef);
            }
        } catch (e) {
            logger.error("updateRoom: ", e);
        }
    }

    public characterPoseUpdate(pose: AssetPoseName[]): void {
        logger.info("sending pose update", pose);
        this.wrappedSock.emit("ChatRoomCharacterPoseUpdate", {
            Pose: pose,
        });
    }

    public async queryItemAllowed(memberNo: number): Promise<boolean> {
        if (!this.itemAllowQueries.has(memberNo)) {
            this.itemAllowQueries.set(memberNo, new PromiseResolve());
            this.wrappedSock.emit("ChatRoomAllowItem", {
                MemberNumber: memberNo,
            } as ChatRoomAllowItem);
        }

        const response = await this.itemAllowQueries.get(memberNo).prom;

        return response.AllowItem;
    }

    public accountUpdate(update: Partial<API_Character_Data>): void {
        const actualUpdate = { ...update };
        if (actualUpdate.Appearance === undefined) {
            actualUpdate.Appearance = this.Player.Appearance.getAppearanceData();
        }
        logger.info("Sending account update", actualUpdate);
        this.wrappedSock.emit("AccountUpdate", actualUpdate);
    }

    public moveOnMap(x: number, y: number): void {
        this.wrappedSock.emit("ChatRoomCharacterMapDataUpdate", {
            X: x,
            Y: y,
        });
    }

    public disconnect(): void {
        logger.info("Disconnecting from the server...");
        this.sock.disconnect(); // Disconnect the socket
        this._chatRoom = undefined; // Clear the chat room reference
        this._player = undefined; // Clear the player reference
        logger.info("Disconnected successfully.");
    }
}

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

import { logger } from './utils/logger';
import { API_Chatroom } from "./apiChatroom";
import { API_Connector, CoordObject, TellType } from "./apiConnector";
import { AppearanceType } from "./appearance";
import { BC_AppearanceItem } from "./item";

export const BC_PermissionLevel = [
    "Everyone, no exceptions",
    "Everyone, except blacklist",
    "Owner, Lover, whitelist & Dominants",
    "Owner, Lover and whitelist only",
    "Owner and Lover only",
    "Owner only",
];

interface PoseObject {
    Name: string;
}

interface SingleScriptPermission {
    permission: 1 | 0;
}

interface ScriptPermissionsType {
    Block: SingleScriptPermission;
    Hide: SingleScriptPermission;
}

interface ItemPermissionList {
    [groupName: string]: Record<string, string>;
}

export enum ItemPermissionLevel {
    EveryoneNoExceptions = 0,
    EveryoneExceptBlacklist = 1,
    OwnerLoverWhitelistDominants = 2,
    OwnerLoverWhitelist = 3,
    OwnerLover = 4,
    OwnerOnly = 5,
}

export interface OnlineSharedSettingsType {
    GameVersion: string;
    ScriptPermissions?: ScriptPermissionsType;
}

export interface API_Character_Data {
    ID: string;
    Name: string;
    Nickname: string;
    Description: string;
    Appearance: BC_AppearanceItem[];
    MemberNumber: number;
    ActivePose: AssetPoseName[];
    WhiteList: number[];
    OnlineSharedSettings: OnlineSharedSettingsType;
    ItemPermission: ItemPermissionLevel;
    FriendList: number[];
    MapData?: CoordObject;
    BlockItems: ItemPermissionList;
    LimitedItems: ItemPermissionList;
}

export function isNaked(character: API_Character): boolean {
    return (
        character.Appearance.InventoryGet("Cloth") === null &&
        character.Appearance.InventoryGet("ClothAccessory") === null &&
        character.Appearance.InventoryGet("ClothLower") === null &&
        character.Appearance.InventoryGet("Suit") === null &&
        character.Appearance.InventoryGet("SuitLower") === null &&
        character.Appearance.InventoryGet("Bra") === null &&
        character.Appearance.InventoryGet("Corset") === null &&
        character.Appearance.InventoryGet("Panties") === null &&
        character.Appearance.InventoryGet("Socks") === null &&
        character.Appearance.InventoryGet("Shoes") === null &&
        character.Appearance.InventoryGet("Gloves") === null
    );
}

export class API_Character {
    private _appearance: AppearanceType;

    constructor(
        private readonly data: API_Character_Data,
        public readonly connection: API_Connector,
        private _chatRoom: API_Chatroom,
    ) {
        this._appearance = new AppearanceType(this, data);
    }

    public get Name(): string {
        return this.data.Name;
    }
    public get NickName(): string {
        return this.data.Nickname;
    }
    public get Appearance(): AppearanceType {
        return this._appearance;
    }
    public get MemberNumber(): number {
        return this.data.MemberNumber;
    }
    public get Pose(): PoseObject[] {
        return this.data.ActivePose.map((p) => {
            return { Name: p };
        });
    }
    public get WhiteList(): number[] {
        return this.data.WhiteList;
    }
    public get OnlineSharedSettings(): OnlineSharedSettingsType {
        return this.data.OnlineSharedSettings;
    }
    public get ItemPermission(): ItemPermissionLevel {
        return this.data.ItemPermission;
    }
    public get ChatRoomPosition(): number {
        return 0; /* TODO */
    }

    public get chatRoom() {
        return this._chatRoom;
    }
    public set chatRoom(room: API_Chatroom) {
        this._chatRoom = room;
    }

    public get X(): number {
        return this.data.MapData?.X ?? 0;
    }
    public get Y(): number {
        return this.data.MapData?.Y ?? 0;
    }

    public get MapPos(): CoordObject {
        return this.data.MapData ?? { X: 0, Y: 0 };
    }

    public IsRoomAdmin(): boolean {
        return this.chatRoom.Admin.includes(this.MemberNumber);
    }

    public Tell(msgType: TellType, msg: string): void {
        logger.info(`Tell (${msgType}) ${this}: ${msg}`);
        this.connection.SendMessage(msgType, msg, this.data.MemberNumber);
    }

    public SetActivePose(pose: AssetPoseName[]): void {
        this.data.ActivePose = pose;
        this.connection.characterPoseUpdate(pose);
    }

    public IsItemPermissionAccessible(
        asset: BC_AppearanceItem,
        variant?: string,
    ): boolean {
        if (this.ItemPermission >= ItemPermissionLevel.OwnerLover) return false;

        // XXX support variants too
        if (this.data.BlockItems[asset.Group]?.[asset.Name]) {
            return false;
        }
        if (this.data.LimitedItems[asset.Group]?.[asset.Name] && !this.WhiteList.includes(this.connection.Player.MemberNumber)) {
            return false;
        }
        return true;
    }

    public hasPenis(): boolean {
        return this.Appearance.InventoryGet("Pussy").Name === "Penis";
    }

    public upperBodyStyle(): "male" | "female" {
        const upperBody = this.Appearance.InventoryGet("BodyUpper");
        return upperBody.Name.startsWith("Flat") ? "male" : "female";
    }

    public lowerBodyStyle(): "male" | "female" {
        const upperBody = this.Appearance.InventoryGet("Pussy");
        return upperBody.Name === "Penis" ? "male" : "female";
    }

    public async Kick(): Promise<void> {
        this.connection.chatRoomAdmin({
            Action: "Kick",
            MemberNumber: this.MemberNumber,
            Publish: true,
        });
    }

    public Ban(): void { }

    public Demote(): void { }

    public IsBot(): boolean {
        return this.data.MemberNumber === this.connection.Player.MemberNumber;
    }

    public IsLoverOf(char: API_Character): boolean {
        // TODO
        return false;
    }

    public IsOwnedBy(char: API_Character): boolean {
        // TODO
        return false;
    }

    public getCurseVersion(): unknown {
        return null;
    }

    public ProtectionAllowInteract(): boolean {
        // TODO
        return true;
    }

    public GetAllowItem(): Promise<boolean> {
        return this.connection.queryItemAllowed(this.MemberNumber);
    }

    public IsRestrained(): boolean {
        // In the real game this Freeze || Block || Prone effects
        // This isn't correct at all but rather than calculating effects,
        // this is good enough for kidnappers.
        return Boolean(this.Appearance.InventoryGet("ItemArms"));
    }

    public CanTalk(): boolean {
        // See above
        return !Boolean(
            this.Appearance.InventoryGet("ItemMouth") ||
            this.Appearance.InventoryGet("ItemMouth2") ||
            this.Appearance.InventoryGet("ItemMouth3"),
        );
    }

    public hasEffect(effect: EffectName): boolean {
        for (const item of this.Appearance.allItems()) {
            if (item.getEffects().includes(effect)) {
                return true;
            }
        }

        return false;
    }

    public SetHeightOverride(override: number | null): void {
        const emoticon = this.Appearance.InventoryGet("Emoticon");
        if (!emoticon) {
            logger.warn("No emoticon found for height override");
            return;
        }

        emoticon.SetOverrideHeight(override);
    }

    public SetInvisible(invisible: boolean): void {
        // TODO
    }

    public FriendListAdd(memberNum: number): void {
        if (this.data.FriendList.includes(memberNum)) {
            return;
        }

        this.data.FriendList.push(memberNum);
        this.connection.accountUpdate({
            FriendList: this.data.FriendList,
        });
    }

    public FriendListRemove(memberNum: number): void {
        this.data.FriendList = this.data.FriendList.filter(
            (m) => m !== memberNum,
        );
        this.connection.accountUpdate({
            FriendList: this.data.FriendList,
        });
    }

    public MoveToPos(pos: number): void {
        this._chatRoom.moveCharacterToPos(this.data.MemberNumber, pos);
    }

    public SetExpression(
        group: ExpressionGroupName,
        expr: ExpressionName,
    ): void {
        this.Appearance.SetExpression(group, expr);
    }

    public toString(): string {
        return this.NickName || this.Name;
    }

    public sendItemUpdate(data: BC_AppearanceItem): void {
        logger.debug("CHAR sendItemUpdate");

        logger.debug("groupe :", data.Group);
        logger.debug("name :", data.Name);
        logger.debug("color :", data.Color);
        logger.debug("difficulty :", data.Difficulty);
        logger.debug("craft :", data.Craft);
        logger.debug("property :", data.Property);

        // update local  apearance
        // Find the element index in the Appearance array
        const existingIndex = this.data.Appearance.findIndex(
            (item) => item.Group === data.Group
        );

        if (existingIndex !== -1) {
            // debug before
            //logger.debug(`Before update: Existing item in group ${data.Group}:`,JSON.stringify(this.data.Appearance[existingIndex], null, 2));

            // Update existing element
            this.data.Appearance[existingIndex] = {
                ...this.data.Appearance[existingIndex], // Keep existing fields
                ...data, // apply new data
                Property: {
                    ...this.data.Appearance[existingIndex].Property, // Keep existing fields
                    ...data.Property, // apply new data
                },
            };
            // debug after
            //logger.debug(`After update: Updated item in group ${data.Group}:`,JSON.stringify(this.data.Appearance[existingIndex], null, 2));
        } else {
            // debug
            //logger.debug(`No existing item in group ${data.Group}, adding new item:`,JSON.stringify(data, null, 2));
            // Add new element if none exist for this group
            this.data.Appearance.push(data);
        }

        // Rebuild local appearance
        this.rebuildAppearance();


        this.connection.updateCharacterItem({
            Target: this.MemberNumber,
            ...data,
        });
    }

    public sendAppearanceUpdate(): void {
        logger.debug("CHAR sendAppearanceUpdate");

        this.connection.updateCharacter({
            ID: this.data.ID,
            Appearance: this.data.Appearance,
        });
        this.rebuildAppearance();
    }

    public update(data: Partial<API_Character_Data>): void {
        logger.debug("CHAR update");

        // Log the current names in the Appearance array before the update
        if (this.data.Appearance) {
            logger.debug("Before update: Current Appearance Names:",this.data.Appearance.map((item) => item.Name));
        }

        // Log the updated names in the Appearance array after the update
        if (this.data.Appearance) {
        logger.debug("After update: Updated Appearance Names:",this.data.Appearance.map((item) => item.Name));
    }

        Object.assign(this.data, data);
        this.rebuildAppearance();
    }

    public rebuildAppearance(): void {
        logger.debug("CHAR rebuildAppearance");
        this._appearance = new AppearanceType(this, this.data);
    }
}

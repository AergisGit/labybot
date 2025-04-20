// Types used to comunicate with the BC server

// This should be ServerChatRoomData
export interface API_Chatroom_Data {
    Access: ChatRoomAccessVisibility[];
    Admin: number[];
    Background: string;
    Ban: number[];
    BlockCategory: ServerChatRoomBlockCategory[];
    Character?: API_Character_Data[];
    Description: string;
    Game: ServerChatRoomGame;
    Language: ServerChatRoomLanguage;
    Limit: number;
    Locked?: boolean;
    MapData?: ServerChatRoomMapData;
    Name: string;
    Private?: boolean;
    Space: ServerChatRoomSpace;
    Visibility: ChatRoomAccessVisibility[];
    Whitelist?: number[];
}

export interface BotInfos {
    connected: boolean;
    botId: number;
    botName: string;
    botNumber: number;
    game?: string;
    gameName?: string;
    gameRunning?: boolean;
    playerCount?: number;
    roomData?: {
        Name: string;
        Space: string;
        MapData: {
            Type: string;
        };
        Private: boolean;
        Locked: boolean;
        Visibility: string[];
        Access: string[];
        Admin: string[];
        Character: {
            Name: string;
            MemberNumber: number;
        }[];
        Limit: number;
    };
    roomMap?: string;
}

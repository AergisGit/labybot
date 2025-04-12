export interface BotInfos {
    connected: boolean;
    botId: number;
    botName?: string;
    botNumber?: number;
    gameRunning?: boolean;
    game?: string;
    gameName?: string;
    playerCount?: number;
    roomMap?: string;
    roomData?: API_Chatroom_Data;
}

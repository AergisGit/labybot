import { Socket } from "socket.io-client";
import { BotInfos } from "../../../shared/types/bot";
import { GameConf } from "../../../shared/types/game";

export interface SocketData {
    botInfos?: BotInfos;
    gameConf?: GameConf;
    botData?: any;
    serverInfo?: any;
}

export interface SocketContextType {
    socket: Socket | null;
    data: SocketData;
    isConnected: boolean;
    isLoading: boolean;
}
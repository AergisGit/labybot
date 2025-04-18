import { Socket } from "socket.io-client";
import { BotInfos } from "../../../shared/types/bot";
import { GameInfosData, GamesList } from "../../../shared/types/game";

export interface SocketData {
    serverInfo?: any;
    botInfos?: BotInfos;
    gameInfos?: GameInfosData;
    gamesList?: GamesList;
}

export interface SocketContextType {
    socket: Socket | null;
    data: SocketData;
    isConnected: boolean;
    isLoading: boolean;
}
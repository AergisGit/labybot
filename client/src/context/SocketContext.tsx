import React, { createContext, useContext, useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";

const SocketContext = createContext<any>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const socket = useSocket("http://localhost:3000");
    const [data, setData] = useState<any>({});
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (socket) {
            socket.on("botInfos", (payload) => {
                setData((prev: any) => ({ ...prev, botInfos: payload }));
            });

            socket.on("gameConf", (payload) => {
                setData((prev: any) => ({ ...prev, gameConf: payload }));
            });

            socket.on("botData", (payload) => {
                setData((prev: any) => ({ ...prev, botData: payload }));
            });

            socket.on("connect", () => {
                setIsConnected(true);
                console.log("WebSocket connected");
            });

            socket.on("disconnect", () => {
                setIsConnected(false);
                console.warn("WebSocket disconnected");
            });

            socket.on("connect_error", (err) => {
                console.error("Connection error:", err.message);
            });

            socket.on("connect_timeout", () => {
                console.error("Connection timeout");
            });

            // Gestionnaire "fourre-tout" pour capturer tous les événements non gérés
            socket.onAny((event, ...args) => {
                console.debug(`Unhandled event received: ${event}`, args);
            });
        }
        return () => {
            socket?.off("connect");
            socket?.off("disconnect");
            socket?.off('connect_error');
            socket?.off('connect_timeout');
            socket?.off('botInfos');
            socket?.off('gameConf');
            socket?.off('botData');
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, data, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocketContext = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error(
            "useSocketContext must be used within a SocketProvider",
        );
    }
    return context;
};

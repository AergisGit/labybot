import React, { createContext, useContext, useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";
import { SocketContextType, SocketData } from "../types/socket";

//const SocketContext = createContext<any>(null);

const SocketContext = createContext<SocketContextType>({
    socket: null,
    data: {
        serverInfo: undefined,
        botInfos: undefined,
        gameInfos: undefined,
        gamesList: undefined,
    },
    isConnected: false,
    isLoading: true,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const socket = useSocket("http://localhost:3000");
    const [isLoading, setIsLoading] = useState(true);

    // Ajout du debug initial
    useEffect(() => {
        const savedData = localStorage.getItem("socketData");
        if (savedData) {
            console.log("Initial localStorage content:", savedData);
            try {
                JSON.parse(savedData);
            } catch (e) {
                console.error("Invalid JSON in localStorage:", savedData);
                console.trace("Stack trace for invalid localStorage data");
            }
        }
    }, []);

    // Création d'une fonction wrapper pour localStorage
    /*const safeSetLocalStorage = (key: string, value: any) => {
        try {
            const stringified = JSON.stringify(value);
            console.log(`Setting localStorage[${key}]:`, stringified);
            console.trace("Stack trace for localStorage set");
            localStorage.setItem(key, stringified);
        } catch (e) {
            console.error("Failed to set localStorage:", e);
            console.error("Value that failed:", value);
        }
    };*/

    const [data, setData] = useState<SocketData>(() => {
        try {
            const savedData = localStorage.getItem("socketData");
            if (!savedData)
                return {
                    serverInfo: undefined,
                    botInfos: undefined,
                    gameInfos: undefined,
                    gamesList: undefined,
                };
            return JSON.parse(savedData);
        } catch (error) {
            console.error("Error reading from localStorage:", error);
            localStorage.removeItem("socketData");
            return {
                serverInfo: undefined,
                botInfos: undefined,
                gameInfos: undefined,
                gamesList: undefined,
            };
        }
    });
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (socket) {
            //socket.on("botInfos", (payload) => {setData((prev: any) => ({ ...prev, botInfos: payload }));});
            //socket.on("gameInfos", (payload) => {setData((prev: any) => ({ ...prev, gameInfos: payload }));});
            //socket.on("serverInfo", (payload) => {setData((prev: any) => ({ ...prev, serverInfo: payload }));});

            socket.on("botInfos", (payload) => {
                setData((prev) => {
                    const newData = { ...prev, botInfos: payload };
                    localStorage.setItem("socketData", JSON.stringify(newData));
                    setIsLoading(false);
                    return newData;
                });
            });

            socket.on("gameInfos", (payload) => {
                setData((prev) => {
                    const newData = { ...prev, gameInfos: payload };
                    localStorage.setItem("socketData", JSON.stringify(newData));
                    return newData;
                });
            });

            socket.on("serverInfo", (payload) => {
                setData((prev) => {
                    const newData = { ...prev, serverInfo: payload };
                    console.log("serverInfo", JSON.stringify(newData));
                    localStorage.setItem("socketData", JSON.stringify(newData));
                    return newData;
                });
            });

            socket.on("gamesList", (payload) => {
                setData((prev) => {
                    const newData = { ...prev, gamesList: payload };
                    console.log("gamesList", JSON.stringify(newData));
                    localStorage.setItem("socketData", JSON.stringify(newData));
                    return newData;
                });
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
            socket?.off("connect_error");
            socket?.off("connect_timeout");
            socket?.off("botInfos");
            socket?.off("serverInfo");
            socket?.off("gameInfos");
        };
    }, [socket]);

    return (
        <SocketContext.Provider
            value={{ socket, data, isConnected, isLoading }}
        >
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

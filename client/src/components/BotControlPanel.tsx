import React from "react";
import { useSocketContext } from "../context/SocketContext";

const BotControlPanel: React.FC = () => {
    const { socket, data } = useSocketContext();

    // Is bot running right now 
    const isBotRunning = data?.botInfos?.connected || false;
    const botStatus=`${data?.botInfos?.connected ? "✅" : "🛑"} ${data?.botInfos?.botName} (${data?.botInfos?.botNumber}) \n`;

    const handleStartBot = () => {
        socket?.emit("startBot", { botId: 0 });
    };

    const handleStopBot = () => {
        socket?.emit("stopBot", { botId: 0 });
    };

    return (
        <div className="header-row">
            <p id="botStatus">{botStatus}</p>
            <div className="header-content">
                {isBotRunning ? (
                    <button onClick={handleStopBot}>Arrêter le bot</button>
                ) : (
                    <button onClick={handleStartBot}>Démarrer le bot</button>
                )}
            </div>
        </div>
    );
};

export default BotControlPanel;

import React from "react";
import { useSocketContext } from "../context/SocketContext";

const GameControlPanel: React.FC = () => {
    const { socket, data } = useSocketContext();

    // Is bot running right now
    const isBotRunning = data?.botInfos?.connected || false;

    // Is game running right now
    const isGameRunning = data?.botInfos?.gameRunning || false;
    const gameStatus = `Jeu (${data?.botInfos?.game || "N/A"}) : ${data?.botInfos?.gameRunning ? "Actif" : "Inactif"}`;

    const handleStartGame = () => {
        socket?.emit("startGame", { botId: 0 });
    };

    const handleStopGame = () => {
        socket?.emit("stopGame", { botId: 0 });
    };

    return (
        <div className="header-row">
            <div className="header-content">
                <p id="gameStatus">{gameStatus}</p>
            </div>
            <div className="header-content">
                { isBotRunning ? (
                isGameRunning ? (
                    <button onClick={handleStopGame}>Arrêter le jeu</button>
                ) : ( 
                    <button onClick={handleStartGame}>Démarrer le jeu</button>
                )
            ) : null }
            </div>
        </div>
    );
};

export default GameControlPanel;

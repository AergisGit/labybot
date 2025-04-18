import React, { useState } from "react";
import { useSocketContext } from "../context/SocketContext";
import { GamesList } from "../../../shared/types/game";

const GameControlPanel: React.FC = () => {
    const { socket, data } = useSocketContext();

    const gamesList: GamesList = data?.gamesList || {};

    // Is bot running right now
    const isBotRunning = data?.botInfos?.connected || false;

    // Is game running right now
    const isGameRunning = data?.botInfos?.gameRunning || false;
    const gameStatus = `${data?.botInfos?.gameRunning ? "✅" : "🛑"} ${data?.botInfos?.game}: ${data?.botInfos?.gameName || "default"}`;

    // State for selected game and gameName
    const [selectedGame, setSelectedGame] = useState<string>(data?.botInfos?.game || "");
    const [selectedGameName, setSelectedGameName] = useState<string>(data?.botInfos?.gameName || "");


    // Handle game change
    const handleGameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGame(event.target.value);
        setSelectedGameName(""); // Reset gameName when game changes
    };

    // Handle gameName change
    const handleGameNameChange = ( event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGameName(event.target.value);
    };

    // Handle apply changes
    const handleApplyChanges = () => {
        if (selectedGame && selectedGameName) {
            //socket?.emit("getGamesList", {game: selectedGame,gameName: selectedGameName,});
            socket?.emit("changeBotGame", {botId: 0, game: selectedGame, gameName: selectedGameName});
        }
    };

    // Get list of gameNames for the selected game
    const gameNames = gamesList[selectedGame] || [];

    const handleStartGame = () => {
        socket?.emit("startGame", { botId: 0, game: data?.botInfos?.game, gameName: data?.botInfos?.gameName });
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
                {isBotRunning && (
                    <>
                        <div>
                            <label htmlFor="gameSelect">Jeu :</label>
                            <select
                                id="gameSelect"
                                value={selectedGame}
                                onChange={handleGameChange}
                            >
                                <option value="" disabled>
                                    Choisir un jeu
                                </option>
                                {Object.keys(gamesList).map((game) => (
                                    <option key={game} value={game}>
                                        {game}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="gameNameSelect">Nom du jeu :</label>
                            <select
                                id="gameNameSelect"
                                value={selectedGameName}
                                onChange={handleGameNameChange}
                                disabled={!selectedGame}
                            >
                                <option value="" disabled>
                                    Choisir un nom de jeu
                                </option>
                                {gameNames.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleApplyChanges}
                            disabled={!selectedGame || !selectedGameName}
                        >
                            Appliquer
                        </button>
                    </>
                )}
            </div>
            <div className="header-content">
                {isBotRunning ? (
                    isGameRunning ? (
                        <button onClick={handleStopGame}>Arrêter le jeu</button>
                    ) : (
                        <button onClick={handleStartGame}>
                            Démarrer le jeu
                        </button>
                    )
                ) : null}
            </div>
        </div>
    );
};

export default GameControlPanel;

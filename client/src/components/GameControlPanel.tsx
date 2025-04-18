import React, { useState, useRef, useEffect } from "react";
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
    const [selectedGame, setSelectedGame] = useState<string>(
        data?.botInfos?.game || "",
    );
    const [selectedGameName, setSelectedGameName] = useState<string>(
        data?.botInfos?.gameName || "",
    );

    // State for dropdown visibility
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);

    // Ref for detecting clicks outside the dropdown
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle game change
    const handleGameChange = (game: string) => {
        setSelectedGame(game);
        setSelectedGameName(""); // Reset gameName when game changes
    };

    // Handle gameName change
    const handleGameNameChange = (gameName: string) => {
        setSelectedGameName(gameName);
    };

    // Handle apply changes
    const handleApplyChanges = () => {
        if (selectedGame && selectedGameName) {
            socket?.emit("changeBotGame", {
                botId: 0,
                game: selectedGame,
                gameName: selectedGameName,
            });
            setIsDropdownVisible(false); // Close dropdown after applying changes
        }
    };

    // Get list of gameNames for the selected game
    const gameNames = gamesList[selectedGame] || [];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest("#gameStatus")
            ) {
                console.log("Clicked outside, closing dropdown");
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleStartGame = () => {
        socket?.emit("startGame", {
            botId: 0,
            game: data?.botInfos?.game,
            gameName: data?.botInfos?.gameName,
        });
    };

    const handleStopGame = () => {
        socket?.emit("stopGame", { botId: 0 });
    };

    return (
        <div className="header-row">
            <div className="header-content" style={{ position: "relative" }}>
                <p
                    id="gameStatus"
                    onClick={(e) => {
                        console.log("Toggling dropdown visibility:", !isDropdownVisible);
                        e.stopPropagation(); // Empêche la propagation pour éviter que le clic soit interprété comme extérieur
                        if (isDropdownVisible) {
                            setIsDropdownVisible(false); // Ferme le menu si déjà ouvert
                        } else {
                            setIsDropdownVisible(true); // Ouvre le menu si fermé
                        }
                    }}
                >
                    {gameStatus}
                </p>
                {isDropdownVisible && (
                    <div className="dropdown-menu" ref={dropdownRef}>
                        <div>
                            <p>Jeu :</p>
                            {Object.keys(gamesList).map((game) => (
                                <button
                                    key={game}
                                    className={`dropdown-item ${selectedGame === game ? "selected" : ""}`}
                                    onClick={() => handleGameChange(game)}
                                >
                                    {game}
                                </button>
                            ))}
                        </div>
                        {selectedGame && (
                            <div>
                                <p>Nom du jeu :</p>
                                {gameNames.map((name) => (
                                    <button
                                        key={name}
                                        className={`dropdown-item ${selectedGameName === name ? "selected" : ""}`}
                                        onClick={() =>
                                            handleGameNameChange(name)
                                        }
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={handleApplyChanges}
                            disabled={!selectedGame || !selectedGameName}
                            className="apply-button"
                        >
                            Appliquer
                        </button>
                    </div>
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

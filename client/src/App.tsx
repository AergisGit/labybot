import React, { useEffect, useState } from "react";
import { useSocketContext } from "./context/SocketContext";
import ErrorPage from "./components/ErrorPage";
import "./App.css";

const App: React.FC = () => {
    const { data, socket } = useSocketContext(); // Récupération des données en temps réel via le contexte
    const [botStatus, setBotStatus] = useState("Chargement...");
    const [botRoomInfos, setBotRoomInfos] = useState("Chargement...");
    const [characters, setCharacters] = useState("Chargement...");
    const [map, setMap] = useState("Chargement...");
    const [gameStatus, setGameStatus] = useState("Chargement...");
    const [botData, setBotData] = useState("No data yet.");
    const [debug, setdebug] = useState("");

    // Vérifier si le WebSocket est connecté ou si les données sont disponibles
    const hasSocket = socket?.connected;
    const hasData = data && Object.keys(data).length > 0;

    // debug
    console.log("hasSocket:", hasSocket);
    console.log("socket:", socket);

    console.log("hasData:", hasData);
    console.log("data:", data);

    // Mettre à jour les données à partir du contexte
    useEffect(() => {
        if (data.botInfos) {
            setBotStatus(
                `${data.botInfos.connected ? "En ligne" : "Hors ligne"} : ${data.botInfos.botName} (${data.botInfos.botNumber})`,
            );

            setGameStatus(
                `Jeu (${data.botInfos.gameRunning ? "Actif" : "Inactif"}) : ${data.botInfos.game || "N/A"}`,
            );
            setBotData(JSON.stringify(data.botInfos, null, 2));

            setMap("Map :\n" + data.botInfos.roomMap);
        }

        if (data.botInfos?.roomData) {
            setBotRoomInfos(
                `Salle : ${data.botInfos.roomData.Name || "N/A"}\n(Zone : ${data.botInfos.roomData.Space}, Type : ${data.botInfos.roomData.MapData.Type}) \
        \n\nPrivate : ${data.botInfos.roomData.Private || "N/A"} | Locked : ${data.botInfos.roomData.Locked}\
        \nVisibility : ${data.botInfos.roomData.Visibility.join("/")} | Access : ${data.botInfos.roomData.Access.join("/")}\
        \n\n Admins : [${data.botInfos.roomData.Admin}]`,
            );

            const charactersString = data.botInfos.roomData.Character.map(
                (character: any) =>
                    ` - ${character.Name} (${character.MemberNumber})`,
            );
            setCharacters(
                `Personnages dans la salle (${data.botInfos.playerCount}/${data.botInfos.roomData.Limit}) :\n${charactersString.join("\n")}`,
            );

        }
    }, [data]);

    // Actions pour démarrer/arrêter/redémarrer le bot
    const startBot = async () => {
        if (socket?.connected) {
            console.log("Emitting startBot event with botId: 0");
            socket.emit("startBot", { botId: 0 });
            console.log("startBot event emitted");
        } else {
            console.error("Socket is not connected");
        }
    };
    const stopBot = async () => {
        socket?.emit("stopBot", { botId: 0 });
    };

    const restartBot = async () => {
        await stopBot();
        await startBot();
    };

    // Actions pour démarrer/arrêter/redémarrer le jeu
    const startGame = async () => {
        socket?.emit("startGame", { botId: 0 });
    };

    const stopGame = async () => {
        socket?.emit("stopGame", { botId: 0 });
    };

    const restartGame = async () => {
        await stopGame();
        await startGame();
    };

    // Affichage des erreurs ou des données
    if (!hasSocket) {
        return (
            <ErrorPage
                message="Aucune connexion WebSocket. Veuillez vérifier votre connexion ou redémarrer l'application."
                onRetry={() => window.location.reload()}
            />
        );
    }

    if (!hasData) {
        return (
            <ErrorPage message="Aucune donnée disponible. Veuillez patienter pendant que nous récupérons les informations." />
        );
    }

    return (
        <div>
            <p id="debug">{debug}</p>
            <h1>Laby Bot</h1>
            <p id="botStatus">{botStatus}</p>
            <button onClick={startBot}>Démarrer</button>
            <button onClick={stopBot}>Arrêter</button>
            <button onClick={restartBot}>Redémarrer</button>
            <p id="botRoomInfos">{botRoomInfos}</p>
            <p id="characters">{characters}</p>
            <p id="map">{map}</p>

            <h2>Game</h2>
            <p id="gameStatus">{gameStatus}</p>
            <button onClick={startGame}>Démarrer</button>
            <button onClick={stopGame}>Arrêter</button>
            <button onClick={restartGame}>Redémarrer</button>

            <h1>Bot Data</h1>
            <h2>Bot room data</h2>
            <pre id="botData">{botData}</pre>
        </div>
    );
};

export default App;

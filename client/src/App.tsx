import React, { useEffect, useState } from "react";
import ReactJson from "@microlink/react-json-view";
import TextareaAutosize from "react-textarea-autosize";
import { useSocketContext } from "./context/SocketContext";
//import ErrorPage from "./components/ErrorPage";
import GameControlPanel from "./components/GameControlPanel";
import BotControlPanel from "./components/BotControlPanel";
import "./App.css";

const App: React.FC = () => {
    const { data, socket } = useSocketContext(); // Récupération des données en temps réel via le contexte
    const [botRoomInfos, setBotRoomInfos] = useState("Chargement...");
    const [characters, setCharacters] = useState("Chargement...");
    const [map, setMap] = useState("Chargement...");
    const [botData, setBotData] = useState<any>({}); // Typage explicite pour éviter les problèmes
    const [serverInfo, setServerInfo] = useState("serverInfo : Chargement...");

    // Vérifier si le WebSocket est connecté ou si les données sont disponibles
    const hasSocket = socket?.connected;
    const hasData = data && Object.keys(data).length > 0;

    const asciiLogo = `
 ▄█        ▄████████ ▀█████████▄  ▄██   ▄       ▀█████████▄   ▄██████▄      ███    
███       ███    ███   ███    ███ ███   ██▄       ███    ███ ███    ███ ▀█████████▄
███       ███    ███   ███    ███ ███▄▄▄███       ███    ███ ███    ███    ▀███▀▀██
███       ███    ███  ▄███▄▄▄██▀  ▀▀▀▀▀▀███      ▄███▄▄▄██▀  ███    ███     ███   ▀
███     ▀███████████ ▀▀███▀▀▀██▄  ▄██   ███     ▀▀███▀▀▀██▄  ███    ███     ███    
███       ███    ███   ███    ██▄ ███   ███       ███    ██▄ ███    ███     ███    
███▌    ▄ ███    ███   ███    ███ ███   ███       ███    ███ ███    ███     ███    
█████▄▄██ ███    █▀  ▄█████████▀   ▀█████▀      ▄█████████▀   ▀██████▀     ▄████▀  
▀                                                                                  `;

    // debug
    console.log("hasSocket:", hasSocket);
    console.log("socket:", socket);

    console.log("hasData:", hasData);
    console.log("data:", data);

    // Mettre à jour les données à partir du contexte
    useEffect(() => {
        if (data.botInfos) {
            //setBotData(JSON.stringify(data.botInfos, null, 2));
            setBotData(data.botInfos || {});

            setMap(`${data.botInfos.roomMap}`);
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
        if (data?.serverInfo) {
            setServerInfo(`${JSON.stringify(data?.serverInfo)}`);
        }
    }, [data]);

    /*
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
    }*/

    return (
        <div className="page">
            <header className="header">
                <pre className="ascii-logo">{asciiLogo}</pre>
            </header>
            <main className="container">
                <section className="card">
                    <div className="header-row">
                        <div className="header-content">
                            <BotControlPanel />
                        </div>
                        <div className="header-content">
                            <GameControlPanel />
                        </div>
                    </div>
                    <p id="serverInfo">{serverInfo}</p>
                    <p id="botRoomInfos">{botRoomInfos}</p>
                    <p id="characters">{characters}</p>
                </section>
                <section className="card">
                    <p>Map :</p>
                    <div className="map-container">
                        <TextareaAutosize
                            value={map}
                            readOnly
                            className="map-textarea"
                        />
                    </div>
                </section>

                <section className="card">
                    <h1>Bot room data</h1>
                    <div className="json-viewer">
                        <ReactJson
                            src={botData}
                            theme="monokai"
                            collapsed={1}
                            displayDataTypes={false}
                            enableClipboard={false}
                        />
                    </div>
                </section>
            </main>
            <footer className="footer">
                <p>© 2025 Moi-même</p>
            </footer>
        </div>
    );
};

export default App;

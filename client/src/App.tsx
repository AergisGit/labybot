import React, { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useSocketContext } from "./context/SocketContext";
//import ErrorPage from "./components/ErrorPage";
import GameControlPanel from "./components/GameControlPanel";
import BotControlPanel from "./components/BotControlPanel";
import DataDashboard from "./components/DataDashboard";
import ServerInfo from "./components/ServerInfo";
import TabMenu, { Tab } from "./components/TabMenu";
import "./App.css";

const App: React.FC = () => {
    const { data, socket } = useSocketContext(); // Récupération des données en temps réel via le contexte
    const [botRoomInfos, setBotRoomInfos] = useState("Chargement...");
    const [characters, setCharacters] = useState("Chargement...");
    const [map, setMap] = useState("Chargement...");
    const [activeTab, setActiveTab] = useState<Tab>("main");

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
        // Reset states if data is not available
        if (!data) {
            setMap("Chargement...");
            setBotRoomInfos("Chargement...");
            setCharacters("Chargement...");
            return;
        }

        // Update states only if data is available
        if (data.botInfos) {
            setMap(data.botInfos.roomMap || "Aucune carte disponible");
        } else {
            setMap("Chargement...");
        }

        if (data.botInfos?.roomData) {
            setBotRoomInfos(
                `Salle : ${data.botInfos.roomData.Name || "Unknown"}\n(Zone : ${data.botInfos.roomData.Space}, Type : ${data.botInfos.roomData.MapData?.Type}) \
        \n\nPrivate : ${data.botInfos.roomData.Private || "Unknown"} | Locked : ${data.botInfos.roomData.Locked || "Unknown"}\
        \nVisibility : ${data.botInfos.roomData.Visibility?.join("/")} | Access : ${data.botInfos.roomData.Access?.join("/")}\
        \n\n Admins : [${data.botInfos.roomData.Admin}]`,
            );

            const charactersString = data.botInfos.roomData.Character.map(
                (character: any) =>
                    ` - ${character.Name} (${character.MemberNumber})`,
            );
            setCharacters(
                `Personnages dans la salle (${data.botInfos.playerCount}/${data.botInfos.roomData.Limit}) :\n${charactersString.join("\n")}`,
            );
        } else {
            setBotRoomInfos("Chargement des informations de la salle...");
            setCharacters("Chargement des personnages...");
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

    const renderMainContent = () => (
        <>
            <section className="card">
                <div className="header-row">
                    <div className="header-content">
                        <BotControlPanel />
                    </div>
                    <div className="header-content">
                        <GameControlPanel />
                    </div>
                </div>
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
        </>
    );

    const renderDataContent = () => <DataDashboard />;

    return (
        <div className="page">
            <header className="header">
                <pre className="ascii-logo">{asciiLogo}</pre>
                <ServerInfo />
                <TabMenu activeTab={activeTab} onTabChange={setActiveTab} />
            </header>
            <main className="container">
                {activeTab === "main"
                    ? renderMainContent()
                    : renderDataContent()}
            </main>
            <footer className="footer">
                <p>© 2025 Moi-même</p>
            </footer>
        </div>
    );
};

export default App;

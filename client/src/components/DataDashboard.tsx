import React from 'react';
import ReactJson from "@microlink/react-json-view";
import { useSocketContext } from "../context/SocketContext";
import { BotInfos } from '../../../shared/types/bot';

const DataDashboard: React.FC = () => {
    const { data } = useSocketContext();
    const botInfos = data?.botInfos as BotInfos | undefined;

    // Status bar content
    const botStatus = botInfos 
        ? `${botInfos.botName} (${botInfos.botNumber}) : ${botInfos.connected ? "En ligne" : "Hors ligne"}`
        : "Non connecté";
    
    // Préparation des données pour l'affichage
    const rootData = botInfos ? {
        connected: botInfos.connected,
        botId: botInfos.botId,
        botName: botInfos.botName,
        botNumber: botInfos.botNumber,
        gameRunning: botInfos.gameRunning,
        game: botInfos.game,
        gameName: botInfos.gameName,
        playerCount: botInfos.playerCount,
    } : {};

    const roomData = botInfos?.roomData || {};
    const characters = botInfos?.roomData?.Character || [];

    return (
        <div className="data-dashboard">
            <div className="dashboard-status">
                <h2>{botStatus}</h2>
            </div>
            <div className="dashboard-grid">
                <div className="dashboard-section">
                    <h3>Bot Info</h3>
                    <ReactJson
                        src={rootData}
                        theme="bright:inverted"
                        collapsed={1}
                        displayDataTypes={false}
                        enableClipboard={false}
                        style={{
                            backgroundColor: 'var(--color-dashboard-section)',
                            color: 'var(--color-text)'
                        }}
                    />
                </div>
                <div className="dashboard-section">
                    <h3>Room Data</h3>
                    <ReactJson
                        src={roomData}
                        theme="bright:inverted"
                        collapsed={1}
                        displayDataTypes={false}
                        enableClipboard={false}
                        style={{
                            backgroundColor: 'var(--color-dashboard-section)',
                            color: 'var(--color-text)'
                        }}
                    />
                </div>
                <div className="dashboard-section">
                    <h3>Characters</h3>
                    <ReactJson
                        src={characters}
                        theme="bright:inverted"
                        collapsed={1}
                        displayDataTypes={false}
                        enableClipboard={false}
                        style={{
                            backgroundColor: 'var(--color-dashboard-section)',
                            color: 'var(--color-text)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DataDashboard;
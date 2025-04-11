import React from 'react';
import { useSocketContext } from '../context/SocketContext';
import { BotInfos } from '../../../shared/types/bot';
import { GameConf } from '../../../shared/types/game';

const Dashboard: React.FC = () => {
    const { data, isLoading, isConnected } = useSocketContext();
    const botInfos: BotInfos | undefined = data.botInfos;
    const gameConf: GameConf | undefined = data.gameConf;

    if (!isConnected) {
        return (
            <div className="error-container">
                <p>Aucune connexion WebSocket. Tentative de reconnexion...</p>
            </div>
        );
    }
    
    if(isLoading) {
        return (
            <div className="loading-container">
                <p>Chargement des données...</p>
            </div>
        );
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <div>
                <h2>Bot</h2>
                <p>Bot Name: {botInfos?.botName}</p>
            </div>
            <div>
                <h2>Game</h2>
                <p>Game Name: {gameConf?.game}</p>
            </div>
        </div>
    );
};

export default Dashboard;
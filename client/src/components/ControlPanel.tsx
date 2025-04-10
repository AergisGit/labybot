import React from 'react';
import { useSocketContext } from '../context/SocketContext';

const ControlPanel: React.FC = () => {
    const { socket, data } = useSocketContext();

    // Is game running right now
    const isGameRunning = data?.gameConf?.isRunning || false;

    const handleStartGame = () => {
        socket?.emit('startGame', { botId: 0 });
    };

    const handleStopGame = () => {
        socket?.emit('stopGame', { botId: 0 });
    };

    return (
        <div>
            <h1>Control Panel</h1>
            {isGameRunning ? (
                <button onClick={handleStopGame}>Arrêter la partie</button>
            ) : (
                <button onClick={handleStartGame}>Démarrer la partie</button>
            )}
        </div>
    );
};

export default ControlPanel;
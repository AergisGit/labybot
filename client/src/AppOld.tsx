import React, { useEffect, useState } from 'react';
import {
  fetchBotStatus,
  startBot,
  stopBot,
  startGame,
  stopGame,
} from './services/api';
import './App.css';

const App: React.FC = () => {
  const [botStatus, setBotStatus] = useState('Chargement...');
  const [botRoomInfos, setBotRoomInfos] = useState('Chargement...');
  const [characters, setCharacters] = useState('Chargement...');
  const [map, setMap] = useState('Chargement...');
  const [gameStatus, setGameStatus] = useState('Chargement...');
  const [botData, setBotData] = useState('No data yet.');

  const fetchStatus = async () => {
    try {
      const data = await fetchBotStatus();

      setBotStatus(
        `${data.connected ? 'En ligne' : 'Hors ligne'} : ${data.botName} (${data.botNumber})`
      );

      setBotRoomInfos(
        `Salle : ${data.roomData.Name || 'N/A'}\n(Zone : ${data.roomData.Space}, Type : ${data.roomData.MapData.Type}) \
        \n\nPrivate : ${data.roomData.Private || 'N/A'} | Locked : ${data.roomData.Locked}\
        \nVisibility : ${data.roomData.Visibility.join('/')} | Access : ${data.roomData.Access.join('/')}\
        \n\n Admins : [${data.roomData.Admin}]`
      );

      const charactersString = data.roomData.Character.map(
        (character: any) => ` - ${character.Name} (${character.MemberNumber})`
      );
      setCharacters(
        `Personnages dans la salle (${data.playerCount}/${data.roomData.Limit}) :\n${charactersString.join('\n')}`
      );

      setMap('Map :\n' + data.roomMap);

      setGameStatus(
        `Jeu (${data.connected ? 'Actif' : 'Inactif'}) : ${data.game || 'N/A'} [${data.gameName || ''}]`
      );

      setBotData(JSON.stringify(data.roomData, null, 2));
    } catch (error) {
      console.error(error);
      setBotStatus('Erreur lors du chargement du statut.');
    }
  };

  const restartBot = async () => {
    await stopBot();
    await startBot();
  };

  const restartGame = async () => {
    await stopGame();
    await startGame();
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
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
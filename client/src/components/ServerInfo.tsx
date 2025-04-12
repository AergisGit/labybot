import React from 'react';
import { useSocketContext } from "../context/SocketContext";
import TimeAgo from './TimeAgo';

const ServerInfo: React.FC = () => {
    const { data } = useSocketContext();
    
    const [serverTime, onlinePlayers] = React.useMemo(() => {
        if (!data?.serverInfo) return [undefined, undefined];
        return [data.serverInfo.Time, data.serverInfo.OnlinePlayers];
    }, [data?.serverInfo]);

    if (!serverTime || onlinePlayers === undefined) return null;

    return (
        <div className="server-info">
            <span className="server-info-time">
                {onlinePlayers} Online
            </span>
            <span className="server-info-time">
                <TimeAgo timestamp={serverTime} />
            </span>
        </div>
    );
};

export default ServerInfo;

// filepath: client/src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocket = (url: string): Socket | null => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        //const newSocket = io(url);
        const newSocket = io(url, {
            // Ajoutez ces options
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: true // Forcer la connexion automatique
        });

        //const newSocket = io(url, {transports: ["websocket"],extraHeaders: {Origin: origin,},});

        // debug start
        console.log('Socket created:', newSocket);

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
        });
    
        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
        // debug end

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [url]);

    return socket;
};

export default useSocket;

import React, { useState, useEffect } from 'react';

interface TimeAgoProps {
    timestamp: number;
}

const TimeAgo: React.FC<TimeAgoProps> = ({ timestamp }) => {
    const [timeAgo, setTimeAgo] = useState<string>('');

    useEffect(() => {
        const updateTimer = () => {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            setTimeAgo(`${seconds}s ago`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [timestamp]);

    return <span>{timeAgo}</span>;
};

export default TimeAgo;
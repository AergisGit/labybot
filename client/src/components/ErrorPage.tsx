import React from 'react';

interface ErrorPageProps {
    message: string;
    onRetry?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ message, onRetry }) => {
    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Erreur</h1>
            <p>{message}</p>
            {onRetry && (
                <button onClick={onRetry} style={{ marginTop: '20px' }}>
                    Réessayer
                </button>
            )}
        </div>
    );
};

export default ErrorPage;
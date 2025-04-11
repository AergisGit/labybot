import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode; // Spécifie que le composant accepte des enfants
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, info: any) {
        console.error('ErrorBoundary caught an error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return <h1>Une erreur est survenue. Veuillez réessayer.</h1>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;

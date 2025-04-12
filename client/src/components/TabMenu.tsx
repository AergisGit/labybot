import React from 'react';

export type Tab = 'main' | 'debug';

interface TabMenuProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

const TabMenu: React.FC<TabMenuProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="tab-menu">
            <button 
                className={`tab-button ${activeTab === 'main' ? 'active' : ''}`}
                onClick={() => onTabChange('main')}
            >
                Vue Principale
            </button>
            <button 
                className={`tab-button ${activeTab === 'debug' ? 'active' : ''}`}
                onClick={() => onTabChange('debug')}
            >               Data Dashboard
            </button>
        </div>
    );
};

export default TabMenu;
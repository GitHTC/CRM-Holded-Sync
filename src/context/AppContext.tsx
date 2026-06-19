import React, { createContext, useContext, useState, useEffect } from 'react';

const HOLDED_API_KEY = "e22f527fc79317f04145c6fe214040b2";
const STORAGE_KEY = 'holded_user_id';

interface AppContextType {
  holdedApiKey: string;
  holdedUserId: string | null;
  setHoldedUserId: (id: string | null) => Promise<void>;
  activeTab: 'crm' | 'projects' | 'settings';
  setActiveTab: (tab: 'crm' | 'projects' | 'settings') => void;
  activeTask: string | null;
  setActiveTask: (taskId: string | null) => void;
  startTime: number | null;
  setStartTime: (time: number | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [holdedApiKey] = useState<string>(HOLDED_API_KEY);
  const [holdedUserId, setHoldedUserIdState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'crm' | 'projects' | 'settings'>('settings');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Check extension storage first, fallback to localStorage
    const loadSettings = async () => {
      try {
        const chrome = (window as any).chrome;
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([STORAGE_KEY], (result: any) => {
            const savedId = result[STORAGE_KEY];
            if (savedId) {
              setHoldedUserIdState(savedId);
              setActiveTab('crm');
            } else {
              setActiveTab('settings');
            }
            setIsLoaded(true);
          });
        } else {
          const savedId = localStorage.getItem(STORAGE_KEY);
          if (savedId) {
            setHoldedUserIdState(savedId);
            setActiveTab('crm');
          } else {
            setActiveTab('settings');
          }
          setIsLoaded(true);
        }
      } catch (e) {
        console.error("Error loading settings", e);
        // Fallback to local
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
          setHoldedUserIdState(savedId);
          setActiveTab('crm');
        }
        setIsLoaded(true);
      }
    };
    
    loadSettings();
  }, []);

  const handleSetUserId = async (id: string | null) => {
    setHoldedUserIdState(id);
    try {
      const chrome = (window as any).chrome;
      if (chrome && chrome.storage && chrome.storage.local) {
        if (id) {
          chrome.storage.local.set({ [STORAGE_KEY]: id });
        } else {
          chrome.storage.local.remove([STORAGE_KEY]);
        }
      }
      // Always fallback to localStorage as well just in case
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving settings', e);
    }
  }

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      holdedApiKey,
      holdedUserId, setHoldedUserId: handleSetUserId,
      activeTab, setActiveTab,
      activeTask, setActiveTask,
      startTime, setStartTime
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};


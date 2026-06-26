import React, { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_HOLDED_API_KEY = "pat_6a3d3cb6ecaffe5188010904_1e032953fc5fe909a4ccf27e84ccb53620142721b4d58c0595e7cf17757f1d9e";
const STORAGE_KEY = 'holded_user_id';
const API_KEY_STORAGE_KEY = 'holded_api_key';

interface AppContextType {
  holdedApiKey: string;
  setHoldedApiKey: (key: string) => Promise<void>;
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
  const [holdedApiKey, setHoldedApiKeyState] = useState<string>(DEFAULT_HOLDED_API_KEY);
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
          chrome.storage.local.get([STORAGE_KEY, API_KEY_STORAGE_KEY], (result: any) => {
            const savedId = result[STORAGE_KEY];
            let savedKey = result[API_KEY_STORAGE_KEY];
            if (savedKey === "bdcc7b198eb537bde78341775a9e3381" || savedKey === "e22f527fc79317f04145c6fe214040b2") {
              savedKey = DEFAULT_HOLDED_API_KEY;
              chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: DEFAULT_HOLDED_API_KEY });
              localStorage.setItem(API_KEY_STORAGE_KEY, DEFAULT_HOLDED_API_KEY);
            }
            if (savedId) {
              setHoldedUserIdState(savedId);
              setActiveTab('crm');
            } else {
              setActiveTab('settings');
            }
            if (savedKey) {
              setHoldedApiKeyState(savedKey);
            }
            setIsLoaded(true);
          });
        } else {
          const savedId = localStorage.getItem(STORAGE_KEY);
          let savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
          if (savedKey === "bdcc7b198eb537bde78341775a9e3381" || savedKey === "e22f527fc79317f04145c6fe214040b2") {
            savedKey = DEFAULT_HOLDED_API_KEY;
            localStorage.setItem(API_KEY_STORAGE_KEY, DEFAULT_HOLDED_API_KEY);
          }
          if (savedId) {
            setHoldedUserIdState(savedId);
            setActiveTab('crm');
          } else {
            setActiveTab('settings');
          }
          if (savedKey) {
            setHoldedApiKeyState(savedKey);
          }
          setIsLoaded(true);
        }
      } catch (e) {
        console.error("Error loading settings", e);
        // Fallback to local
        const savedId = localStorage.getItem(STORAGE_KEY);
        let savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (savedKey === "bdcc7b198eb537bde78341775a9e3381" || savedKey === "e22f527fc79317f04145c6fe214040b2") {
          savedKey = DEFAULT_HOLDED_API_KEY;
          localStorage.setItem(API_KEY_STORAGE_KEY, DEFAULT_HOLDED_API_KEY);
        }
        if (savedId) {
          setHoldedUserIdState(savedId);
          setActiveTab('crm');
        }
        if (savedKey) {
          setHoldedApiKeyState(savedKey);
        }
        setIsLoaded(true);
      }
    };
    
    loadSettings();
  }, []);

  const handleSetApiKey = async (key: string) => {
    setHoldedApiKeyState(key);
    try {
      const chrome = (window as any).chrome;
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: key });
      }
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } catch (e) {
      console.error('Error saving API key', e);
    }
  };

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
      setHoldedApiKey: handleSetApiKey,
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


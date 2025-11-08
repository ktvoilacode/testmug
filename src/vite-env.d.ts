/// <reference types="vite/client" />

interface Window {
  electron: {
    navigate: (url: string) => Promise<{ success: boolean; error?: string }>;
    getUrl: () => Promise<string>;
    goBack: () => Promise<{ success: boolean }>;
    goForward: () => Promise<{ success: boolean }>;
    refresh: () => Promise<{ success: boolean }>;
    goHome: () => Promise<{ success: boolean }>;
    getNavigationState: () => Promise<{ canGoBack: boolean; canGoForward: boolean }>;
    onUrlChanged: (callback: (data: { url: string; canGoBack: boolean; canGoForward: boolean }) => void) => void;
    sendMessage: (message: string) => Promise<{ role: 'assistant'; content: string }>;
    toggleChat: (showChat: boolean) => Promise<{ success: boolean }>;
    startRecording: () => Promise<{ success: boolean; message: string }>;
    stopRecording: () => Promise<{ success: boolean; sessionId?: string; actions?: any[]; actionCount?: number }>;
    getSessions: () => Promise<{ success: boolean; sessions?: any[] }>;
    replaySession: (sessionId: string, speed?: string) => Promise<{ success: boolean; message?: string }>;
    onAssertionAdded: (callback: (assertion: any) => void) => void;
  };
}

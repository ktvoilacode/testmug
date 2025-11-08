/// <reference types="vite/client" />

interface Window {
  electron: {
    navigate: (url: string) => Promise<{ success: boolean; error?: string }>;
    getUrl: () => Promise<string>;
    sendMessage: (message: string) => Promise<{ role: 'assistant'; content: string }>;
    startRecording: (type: 'positive' | 'negative' | 'edge') => Promise<{ success: boolean; message: string }>;
    stopRecording: () => Promise<{ success: boolean; actions: any[] }>;
  };
}

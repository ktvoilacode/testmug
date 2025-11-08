import React, { useState, useRef, useEffect } from 'react';
import { MdChevronRight, MdChevronLeft } from 'react-icons/md';
import './App.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Welcome to Testmug! Enter a URL above and start recording your test flow.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<string | null>(null);
  const [url, setUrl] = useState('https://example.com');
  const [showChat, setShowChat] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleChat = async () => {
    const newShowChat = !showChat;
    setShowChat(newShowChat);
    try {
      await window.electron.toggleChat(newShowChat);
    } catch (error) {
      console.error('Toggle chat error:', error);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleNavigate = async () => {
    try {
      await window.electron.navigate(url);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Navigated to: ${url}`
      }]);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.toLowerCase().trim();
    setInput('');

    // Handle commands
    // Check for "open" or "load" commands
    const openMatch = userInput.match(/^(open|load|go to|navigate to)\s+(.+)$/);
    if (openMatch) {
      let targetUrl = openMatch[2].trim();

      // Add .com suffix if it's a single word without a domain extension
      if (!targetUrl.includes('.') && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl + '.com';
      }

      // Add https:// if not present
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      // Update URL state and navigate directly with the targetUrl
      setUrl(targetUrl);

      try {
        await window.electron.navigate(targetUrl);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Opening ${targetUrl}...`
        }]);
      } catch (error) {
        console.error('Navigation error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Failed to open ${targetUrl}`
        }]);
      }
      return;
    }

    // Placeholder for AI integration
    const response: Message = {
      role: 'assistant',
      content: `You said: "${input}". Try commands like "open google.com" or "load github.com"`
    };
    setMessages((prev) => [...prev, response]);
  };

  const handleStartRecording = async (type: 'positive' | 'negative' | 'edge') => {
    try {
      await window.electron.startRecording(type);
      setIsRecording(true);
      setRecordingType(type);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `🔴 Recording ${type} test case started. Perform actions in the browser.`
      }]);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await window.electron.stopRecording();
      setIsRecording(false);
      setRecordingType(null);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `✅ Recording stopped. Captured ${result.actions?.length || 0} actions.`
      }]);
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  return (
    <div className="app">
      {/* Top Address Bar */}
      <div className="top-bar">
        <div className="logo">
          <h1>Testmug</h1>
        </div>
        <div className="url-bar">
          <input
            type="text"
            className="url-input"
            placeholder="Enter URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNavigate()}
          />
          <button className="go-button" onClick={handleNavigate}>
            Go
          </button>
        </div>

        {/* Recording Controls */}
        <div className="recording-controls">
          {!isRecording ? (
            <>
              <button
                className="record-btn positive"
                onClick={() => handleStartRecording('positive')}
                title="Record positive test case"
              >
                ✓
              </button>
              <button
                className="record-btn negative"
                onClick={() => handleStartRecording('negative')}
                title="Record negative test case"
              >
                ✗
              </button>
              <button
                className="record-btn edge"
                onClick={() => handleStartRecording('edge')}
                title="Record edge case"
              >
                ⚡
              </button>
            </>
          ) : (
            <button className="record-btn stop" onClick={handleStopRecording}>
              ⬛ Stop
            </button>
          )}
        </div>

        <div className="status">
          {isRecording && (
            <span className="recording-indicator">
              🔴 {recordingType}
            </span>
          )}
        </div>

        <button
          className="chat-toggle-button"
          onClick={toggleChat}
          title={showChat ? 'Hide chat' : 'Show chat'}
        >
          {showChat ? <MdChevronRight size={20} /> : <MdChevronLeft size={20} />}
        </button>
      </div>

      <div className="main-content">
        {/* Right Panel - Chat */}
        {showChat && (
          <div className="right-panel">
          {/* Chat Messages */}
          <div className="chat-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="chat-input-container">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Type a message... (Cmd/Ctrl+Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
            />
            <button className="send-button" onClick={handleSendMessage}>
              Send
            </button>
          </div>

          {/* Help Footer */}
          <div className="chat-footer">
            <a
              href="#"
              className="help-link"
              onClick={(e) => {
                e.preventDefault();
                setShowHelp(!showHelp);
              }}
            >
              {showHelp ? 'Hide Help' : 'Help & Docs'}
            </a>
          </div>

          {/* Help Panel */}
          {showHelp && (
            <div className="help-panel">
              <h3>Available Commands</h3>
              <div className="help-content">
                <div className="help-item">
                  <strong>open [url]</strong>
                  <p>Navigate to a website. Examples:</p>
                  <code>open google</code><br />
                  <code>open github.com</code><br />
                  <code>load wikipedia.org</code>
                </div>
                <div className="help-item">
                  <strong>Recording</strong>
                  <p>Use the buttons in the top bar:</p>
                  <ul>
                    <li>✓ - Record positive test case</li>
                    <li>✗ - Record negative test case</li>
                    <li>⚡ - Record edge case</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Right Panel - Browser View (handled by Electron BrowserView) */}
        {/* The browser view is rendered natively by Electron, not React */}
      </div>
    </div>
  );
}

export default App;

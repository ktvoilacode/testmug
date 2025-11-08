import React, { useState, useRef, useEffect } from 'react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m Testmug AI. I can help you create and run tests. Try saying: "Record a positive test case for login"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [url, setUrl] = useState('https://example.com');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Send to backend (electron)
    try {
      const response = await window.electron.sendMessage(input);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleNavigate = async () => {
    try {
      await window.electron.navigate(url);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleStartRecording = async (type: 'positive' | 'negative' | 'edge') => {
    try {
      const result = await window.electron.startRecording(type);
      setIsRecording(true);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `🔴 Recording ${type} test case. Perform your actions in the browser.`,
        },
      ]);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await window.electron.stopRecording();
      setIsRecording(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Recording stopped. Captured ${result.actions?.length || 0} actions.`,
        },
      ]);
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  return (
    <div className="app">
      {/* Left Panel - Chatbot */}
      <div className="left-panel">
        <div className="header">
          <h1>Testmug</h1>
          <p className="subtitle">AI Testing Assistant</p>
        </div>

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
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="send-button" onClick={handleSendMessage}>
            Send
          </button>
        </div>

        {/* Navigation Controls */}
        <div className="controls">
          <h3>Browser Navigation</h3>
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
        </div>

        {/* Recording Controls */}
        <div className="controls">
          <h3>Recording</h3>
          <div className="recording-buttons">
            {!isRecording ? (
              <>
                <button
                  className="record-button positive"
                  onClick={() => handleStartRecording('positive')}
                >
                  ✓ Record Positive
                </button>
                <button
                  className="record-button negative"
                  onClick={() => handleStartRecording('negative')}
                >
                  ✗ Record Negative
                </button>
                <button
                  className="record-button edge"
                  onClick={() => handleStartRecording('edge')}
                >
                  ⚡ Record Edge Case
                </button>
              </>
            ) : (
              <button className="record-button stop" onClick={handleStopRecording}>
                ⬛ Stop Recording
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Browser View (handled by Electron BrowserView) */}
      {/* The browser view is rendered natively by Electron, not React */}
    </div>
  );
}

export default App;

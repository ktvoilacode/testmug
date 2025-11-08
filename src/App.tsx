import React, { useState, useRef, useEffect } from 'react';
import { MdChevronRight, MdChevronLeft, MdArrowBack, MdArrowForward, MdLock, MdRefresh, MdClose, MdSettings, MdHistory } from 'react-icons/md';
import './App.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RecordedAction {
  type: string;
  selector?: string;
  value?: string;
  url?: string;
  timestamp: number;
}

interface DetectedFlow {
  id: string;
  name: string;
  type: 'positive' | 'negative' | 'edge';
  actions: RecordedAction[];
  startIndex: number;
  endIndex: number;
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
  const [sessions, setSessions] = useState<any[]>([]);
  const [url, setUrl] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<'chat' | 'settings' | 'history'>('chat');
  const [llmProvider, setLlmProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleChat = async () => {
    const newShowChat = !showChat;
    setShowChat(newShowChat);
    try {
      await window.electron.toggleChat(newShowChat);
      // Scroll to bottom instantly when chat is shown
      if (newShowChat) {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'instant' });
        }, 50);
      }
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

  // Listen for URL changes from browser navigation
  useEffect(() => {
    window.electron.onUrlChanged((data) => {
      // Don't show file:// URLs (welcome page)
      if (data.url.startsWith('file://')) {
        setUrl('');
        setIsSecure(false);
      } else {
        setUrl(data.url);
        setIsSecure(data.url.startsWith('https://'));
      }
      setCanGoBack(data.canGoBack);
      setCanGoForward(data.canGoForward);
    });
  }, []);

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

  const handleRefresh = async () => {
    try {
      await window.electron.refresh();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  const handleBack = async () => {
    try {
      await window.electron.goBack();
    } catch (error) {
      console.error('Back navigation error:', error);
    }
  };

  const handleForward = async () => {
    try {
      await window.electron.goForward();
    } catch (error) {
      console.error('Forward navigation error:', error);
    }
  };

  const handleHome = async () => {
    try {
      await window.electron.goHome();
      setUrl('');
    } catch (error) {
      console.error('Home navigation error:', error);
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

  const handleStartRecording = async () => {
    try {
      await window.electron.startRecording();
      setIsRecording(true);
      setRecordedActions([]);
      setDetectedFlows([]);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `🔴 Recording started. Perform your test actions in the browser.`
      }]);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await window.electron.stopRecording();
      setIsRecording(false);

      if (result.success) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✅ Recording stopped. Captured ${result.actionCount || 0} actions. Session saved: ${result.sessionId}`
        }]);

        // Reload sessions to show the new recording
        await loadSessions();

        // Switch to history tab
        setRightPanelView('history');
      } else {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `❌ Recording stopped but ${result.message || 'no actions captured'}`
        }]);
      }
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const result = await window.electron.getSessions();
      if (result.success && result.sessions) {
        setSessions(result.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleEditSessionName = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId);
    setEditingSessionName(currentName);
  };

  const handleSaveSessionName = async (sessionId: string) => {
    if (!editingSessionName.trim()) {
      setEditingSessionId(null);
      return;
    }

    try {
      const result = await window.electron.updateSessionName(sessionId, editingSessionName.trim());
      if (result.success) {
        await loadSessions();
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✅ Session renamed to: ${editingSessionName.trim()}`
        }]);
      }
    } catch (error) {
      console.error('Error updating session name:', error);
    }
    setEditingSessionId(null);
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (window.confirm(`Are you sure you want to delete "${sessionName}"?\n\nThis action cannot be undone.`)) {
      try {
        const result = await window.electron.deleteSession(sessionId);
        if (result.success) {
          await loadSessions();
          setMessages(prev => [...prev, {
            role: 'system',
            content: `🗑️ Session deleted: ${sessionName}`
          }]);
        }
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  // Load sessions when History tab is opened
  useEffect(() => {
    if (rightPanelView === 'history') {
      loadSessions();
    }
  }, [rightPanelView]);

  // Auto-reload sessions every 2 seconds when History tab is open (to catch new analyses)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rightPanelView === 'history') {
      interval = setInterval(() => {
        loadSessions();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rightPanelView]);

  // Listen for assertion additions
  useEffect(() => {
    const handleAssertionAdded = (assertion: any) => {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `🎯 Assertion added: ${assertion.description}`
      }]);
    };

    window.electron.onAssertionAdded(handleAssertionAdded);
  }, []);

  return (
    <div className="app">
      {/* Top Address Bar */}
      <div className="top-bar">
        <div className="logo">
          <h1>Testmug</h1>
        </div>

        {/* Navigation Controls */}
        <div className="nav-controls">
          <button
            className="nav-button"
            onClick={handleBack}
            disabled={!canGoBack}
            title="Go back"
          >
            <MdArrowBack size={18} />
          </button>
          <button
            className="nav-button"
            onClick={handleForward}
            disabled={!canGoForward}
            title="Go forward"
          >
            <MdArrowForward size={18} />
          </button>
          <button
            className="nav-button"
            onClick={handleRefresh}
            title="Refresh page"
          >
            <MdRefresh size={18} />
          </button>
        </div>

        <div className="url-bar">
          {isSecure && (
            <div className="secure-indicator" title="Secure connection (HTTPS)">
              <MdLock size={16} />
            </div>
          )}
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
          <button className="close-button" onClick={handleHome} title="Close and go home">
            <MdClose size={18} />
          </button>
        </div>

        {/* Recording Controls */}
        <div className="recording-controls">
          {!isRecording ? (
            <button
              className="record-btn"
              onClick={handleStartRecording}
              title="Start recording test flow"
            >
              <span className="record-icon">⬤</span> Record
            </button>
          ) : (
            <button className="record-btn stop" onClick={handleStopRecording}>
              <span className="stop-icon">⬛</span> Stop
            </button>
          )}
        </div>

        <div className="status">
          {isRecording && (
            <span className="recording-indicator">
              <span className="blink">●</span> Recording
            </span>
          )}
        </div>

        <button
          className="chat-toggle-button"
          onClick={toggleChat}
          title={showChat ? 'Hide panel' : 'Show panel'}
        >
          {showChat ? <MdChevronRight size={20} /> : <MdChevronLeft size={20} />}
        </button>
      </div>

      <div className="main-content">
        {/* Right Panel - Chat/Settings/History */}
        {showChat && (
          <div className="right-panel">
            {/* Panel Tabs */}
            <div className="panel-tabs">
              <button
                className={`panel-tab ${rightPanelView === 'chat' ? 'active' : ''}`}
                onClick={() => setRightPanelView('chat')}
              >
                Chat
              </button>
              <button
                className={`panel-tab ${rightPanelView === 'history' ? 'active' : ''}`}
                onClick={() => setRightPanelView('history')}
              >
                History
              </button>
              <button
                className={`panel-tab ${rightPanelView === 'settings' ? 'active' : ''}`}
                onClick={() => setRightPanelView('settings')}
              >
                Settings
              </button>
            </div>

            {/* Chat View */}
            {rightPanelView === 'chat' && (
              <>
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
              </>
            )}

            {/* Settings View */}
            {rightPanelView === 'settings' && (
              <div className="panel-content">
                <div className="panel-body">
                  <div className="setting-section">
                    <h3>LLM Configuration</h3>
                    <p className="setting-description">
                      Configure your AI provider for test case generation
                    </p>

                    <div className="form-group">
                      <label>AI Provider</label>
                      <select
                        value={llmProvider}
                        onChange={(e) => setLlmProvider(e.target.value)}
                        className="form-select"
                      >
                        <option value="openai">OpenAI (GPT-4)</option>
                        <option value="grok">Grok (xAI)</option>
                        <option value="mistral">Mistral AI</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="form-input"
                      />
                      <p className="input-hint">
                        {llmProvider === 'openai' && 'Get your API key from platform.openai.com'}
                        {llmProvider === 'grok' && 'Get your API key from x.ai'}
                        {llmProvider === 'mistral' && 'Get your API key from console.mistral.ai'}
                      </p>
                    </div>

                    {!apiKey && (
                      <div className="warning-box">
                        <p>⚠️ API key required for automated test generation</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* History View */}
            {rightPanelView === 'history' && (
              <div className="panel-content">
                <div className="panel-body">
                  {sessions.length === 0 ? (
                    <div className="history-empty">
                      <p>No recordings yet. Click Record to start capturing test flows!</p>
                    </div>
                  ) : (
                    <div className="flows-list">
                      <div className="flows-header">
                        <h3>Recorded Sessions ({sessions.length})</h3>
                        <p className="flows-subtitle">Click replay to see your test in action</p>
                      </div>
                      {sessions.map((session) => (
                        <div key={session.id} className="flow-card">
                          <div className="flow-header">
                            <div className="flow-info">
                              <div className="session-title">
                                {editingSessionId === session.id ? (
                                  <input
                                    type="text"
                                    className="session-name-input"
                                    value={editingSessionName}
                                    onChange={(e) => setEditingSessionName(e.target.value)}
                                    onBlur={() => handleSaveSessionName(session.id)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveSessionName(session.id);
                                      } else if (e.key === 'Escape') {
                                        setEditingSessionId(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <h4
                                    onClick={() => handleEditSessionName(
                                      session.id,
                                      session.customName || (session.startUrl.includes('login') ? '🔐 Login Test' : '🧪 Test Session')
                                    )}
                                    title="Click to edit name"
                                    className="editable-title"
                                  >
                                    {session.customName || (session.startUrl.includes('login') ? '🔐 Login Test' : '🧪 Test Session')}
                                  </h4>
                                )}
                                <span className="session-id">#{session.id.substring(8, 16)}</span>
                                <button
                                  className="delete-session-btn"
                                  onClick={() => handleDeleteSession(
                                    session.id,
                                    session.customName || (session.startUrl.includes('login') ? 'Login Test' : 'Test Session')
                                  )}
                                  title="Delete session"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div className="replay-buttons">
                              <button
                                className="replay-btn"
                                onClick={async () => {
                                  setMessages(prev => [...prev, {
                                    role: 'system',
                                    content: `▶️ Replaying full session...`
                                  }]);
                                  const result = await window.electron.replaySession(session.id, 'normal');
                                  setMessages(prev => [...prev, {
                                    role: 'system',
                                    content: result.success ? `✅ Replay completed!` : `❌ Replay failed: ${result.message}`
                                  }]);
                                }}
                                title="Replay entire session"
                              >
                                ▶️ All
                              </button>

                              {/* Individual flow replay buttons */}
                              {session.flowAnalysis && session.flowAnalysis.flows && session.flowAnalysis.flows.map((flow: any, idx: number) => (
                                <button
                                  key={idx}
                                  className={`replay-btn flow-replay ${flow.type}`}
                                  onClick={async () => {
                                    setMessages(prev => [...prev, {
                                      role: 'system',
                                      content: `▶️ Replaying ${flow.name}...`
                                    }]);
                                    const result = await window.electron.replayFlow(session.id, flow.flowId);
                                    setMessages(prev => [...prev, {
                                      role: 'system',
                                      content: result.success ? `✅ ${flow.name} completed!` : `❌ Replay failed: ${result.message}`
                                    }]);
                                  }}
                                  title={`Replay ${flow.name} (${flow.type})`}
                                >
                                  {flow.type === 'positive' ? '✓' : '✗'} {flow.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flow-details">
                            <p className="flow-actions">
                              {session.actionCount} actions • {Math.round(session.duration / 1000)}s duration
                              {session.flowAnalysis && session.flowAnalysis.success && (
                                <> • {session.flowAnalysis.flowCount || 0} flow(s) • {session.flowAnalysis.flows?.reduce((sum: number, f: any) => sum + (f.assertions?.length || 0), 0) || 0} assertion(s)</>
                              )}
                            </p>
                            <p className="flow-url">
                              {session.startUrl.substring(0, 60)}{session.startUrl.length > 60 ? '...' : ''}
                            </p>
                            <p className="flow-time">
                              {new Date(session.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

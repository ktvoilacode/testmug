import React, { useState, useRef, useEffect } from 'react';
import {
  MdChevronRight, MdChevronLeft, MdArrowBack, MdArrowForward, MdLock,
  MdRefresh, MdClose, MdHistory, MdDelete, MdPlayArrow,
  MdTableChart, MdLink, MdCalendarToday, MdCode, MdTimer, MdCheckCircle,
  MdLoop, MdFiberManualRecord, MdCheckCircleOutline, MdWarning,
  MdSmartToy, MdAssessment, MdStars, MdCelebration
} from 'react-icons/md';
import './App.css';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'session-card';
  content: string | React.ReactNode;
  sessionData?: any;
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
  const [rightPanelView, setRightPanelView] = useState<'chat' | 'history'>('chat');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [testProgress, setTestProgress] = useState<{total: number, completed: number, passed: number, failed: number} | null>(null);
  const [runningTestSessionId, setRunningTestSessionId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{total: number, completed: number, current: string} | null>(null);
  const [generatingSessionId, setGeneratingSessionId] = useState<string | null>(null);
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [urlSuggestion, setUrlSuggestion] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

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

  // Scroll to bottom when switching to chat view
  useEffect(() => {
    if (rightPanelView === 'chat') {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [rightPanelView]);

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

  // Load URL history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('testmug-url-history');
    if (savedHistory) {
      try {
        setUrlHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load URL history:', error);
      }
    }
  }, []);

  // Generate URL suggestion when user types
  useEffect(() => {
    if (url && url.trim() !== '') {
      const matchingUrl = urlHistory.find(historyUrl =>
        historyUrl.toLowerCase().startsWith(url.toLowerCase())
      );
      if (matchingUrl && matchingUrl.toLowerCase() !== url.toLowerCase()) {
        setUrlSuggestion(matchingUrl);
      } else {
        setUrlSuggestion('');
      }
    } else {
      setUrlSuggestion('');
    }
  }, [url, urlHistory]);

  // Save URL to history
  const saveUrlToHistory = (urlToSave: string) => {
    if (!urlToSave || urlToSave.trim() === '' || urlToSave.startsWith('file://')) {
      return;
    }

    setUrlHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(u => u !== urlToSave);
      // Add to beginning (most recent first)
      const updated = [urlToSave, ...filtered].slice(0, 20); // Keep max 20 URLs
      // Save to localStorage
      localStorage.setItem('testmug-url-history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleNavigate = async () => {
    try {
      await window.electron.navigate(url);
      saveUrlToHistory(url);
      setUrlSuggestion('');
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Navigated to: ${url}`
      }]);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Handle keyboard navigation with inline autocomplete
  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && urlSuggestion) {
      // Check if cursor is at the end of the input
      const input = e.currentTarget;
      const cursorAtEnd = input.selectionStart === url.length && input.selectionEnd === url.length;

      if (cursorAtEnd) {
        e.preventDefault();
        setUrl(urlSuggestion);
        setUrlSuggestion('');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (urlSuggestion && url !== urlSuggestion) {
        // If there's a suggestion, use it
        setUrl(urlSuggestion);
        setTimeout(() => handleNavigate(), 50);
      } else {
        handleNavigate();
      }
    } else if (e.key === 'Escape') {
      setUrlSuggestion('');
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
    // Check if URL is entered
    if (!url || url.trim() === '') {
      setMessages(prev => [...prev, {
        role: 'system',
        content: (
          <span className="message-with-icon">
            <MdWarning size={16} className="msg-icon warning" />
            Please enter a URL in the address bar before recording.
          </span>
        )
      }]);
      return;
    }

    try {
      await window.electron.startRecording();
      setIsRecording(true);
      setRecordedActions([]);
      setDetectedFlows([]);
      setMessages(prev => [...prev, {
        role: 'system',
        content: (
          <span className="message-with-icon">
            <MdFiberManualRecord size={16} className="msg-icon recording" />
            Recording started! Perform your test actions in the browser.
          </span>
        )
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
          content: (
            <span className="message-with-icon">
              <MdCelebration size={16} className="msg-icon success" />
              Recording complete! Captured {result.actionCount || 0} action{result.actionCount === 1 ? '' : 's'}.
            </span>
          )
        }]);

        // Reload sessions to show the new recording
        await loadSessions();

        // Get the newly created session and add it as a mini card in chat
        const sessionsResult = await window.electron.getSessions();
        if (sessionsResult.success && sessionsResult.sessions) {
          const newSession = sessionsResult.sessions.find((s: any) => s.id === result.sessionId);
          if (newSession) {
            setMessages(prev => [...prev, {
              role: 'session-card',
              content: '',
              sessionData: newSession
            }]);
          }
        }
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

  // Auto-generate test cases without context modal (simplified for MVP)
  const handleGenerateTestCases = async (session: any) => {
    // Start generation with progress
    setGeneratingSessionId(session.id);
    setGenerationProgress({
      total: session.flowAnalysis?.flowCount || 1,
      completed: 0,
      current: 'Starting generation...'
    });

    setMessages(prev => [...prev, {
      role: 'system',
      content: (
        <span className="message-with-icon">
          <MdSmartToy size={16} className="msg-icon info" />
          Generating test cases automatically...
        </span>
      )
    }]);

    // Auto-generate with minimal context (empty object)
    const result = await window.electron.generateTestCasesWithContext(
      session.id,
      { validData: {}, invalidData: {}, additionalContext: '' }
    );

    setGenerationProgress(null);
    setGeneratingSessionId(null);

    setMessages(prev => [...prev, {
      role: 'system',
      content: result.success
        ? (
            <span className="message-with-icon">
              <MdAssessment size={16} className="msg-icon success" />
              Success! Generated {result.testCaseCount} test case{result.testCaseCount === 1 ? '' : 's'}. Open Excel to view and customize.
            </span>
          )
        : (
            <span className="message-with-icon">
              <MdWarning size={16} className="msg-icon warning" />
              Generation failed: {result.message}
            </span>
          )
    }]);

    if (result.success) {
      loadSessions(); // Refresh to show new test cases
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
      setMessages(prev => {
        // Prevent duplicate messages
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.content === `✨ Assertion added: ${assertion.description}`) {
          return prev;
        }
        return [...prev, {
          role: 'system',
          content: (
            <span className="message-with-icon">
              <MdStars size={16} className="msg-icon assertion" />
              Assertion added: {assertion.description}
            </span>
          )
        }];
      });
    };

    window.electron.onAssertionAdded(handleAssertionAdded);

    // Cleanup function to prevent duplicate listeners
    return () => {
      // Note: electron IPC doesn't have removeListener, but preventing duplicates above
    };
  }, []);

  // Listen for test execution progress
  useEffect(() => {
    const handleTestProgress = (progress: {total: number, completed: number, passed: number, failed: number}) => {
      setTestProgress(progress);

      // Add progress message to chat
      setMessages(prev => [...prev, {
        role: 'system',
        content: `⏳ Test Progress: ${progress.completed}/${progress.total} (✅ ${progress.passed} passed, ❌ ${progress.failed} failed)`
      }]);
    };

    window.electron.onTestProgress(handleTestProgress);
  }, []);

  // Listen for test generation progress
  useEffect(() => {
    const handleGenerationProgress = (progress: {total: number, completed: number, current: string}) => {
      setGenerationProgress(progress);
    };

    window.electron.onGenerationProgress(handleGenerationProgress);
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
          <div className="url-input-wrapper">
            {urlSuggestion && (
              <div className="url-suggestion">
                <span className="url-suggestion-prefix">{url}</span>
                <span className="url-suggestion-suffix">{urlSuggestion.substring(url.length)}</span>
              </div>
            )}
            <input
              ref={urlInputRef}
              type="text"
              className="url-input"
              placeholder="Enter URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleUrlKeyDown}
            />
          </div>
          <button className="go-button" onClick={handleNavigate}>
            Go
          </button>
          <button className="close-button" onClick={handleHome} title="Close and go home">
            <MdClose size={18} />
          </button>
        </div>

        {/* Right Side Controls */}
        <div className="right-controls">
          {!isRecording ? (
            <button
              className="record-btn"
              onClick={handleStartRecording}
              title="Start recording test flow"
            >
              <span className="record-icon">●</span>
              <span>Record</span>
            </button>
          ) : (
            <button className="record-btn recording" onClick={handleStopRecording} title="Stop recording">
              <span>Stop</span>
              <span className="stop-icon">■</span>
            </button>
          )}

          <button
            className="chat-toggle-button"
            onClick={toggleChat}
            title={showChat ? 'Hide panel' : 'Show panel'}
          >
            {showChat ? <MdChevronRight size={20} /> : <MdChevronLeft size={20} />}
          </button>
        </div>
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
            </div>

            {/* Chat View */}
            {rightPanelView === 'chat' && (
              <>
                {/* Chat Messages */}
                <div className="chat-container">
                  {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                      {msg.role === 'session-card' && (msg as any).sessionData ? (
                        <div className="mini-session-card">
                          <div className="mini-card-header">
                            <span className="mini-card-title">
                              {(msg as any).sessionData.customName || ((msg as any).sessionData.startUrl.includes('login') ? '🔐 Login Test' : '🧪 Test Session')}
                            </span>
                            <span className="mini-card-id">#{(msg as any).sessionData.id.substring(8, 16)}</span>
                          </div>
                          <div className="mini-card-stats">
                            <span className="mini-stat"><MdCode size={12} /> {(msg as any).sessionData.actionCount} actions</span>
                            <span className="mini-stat"><MdTimer size={12} /> {Math.round((msg as any).sessionData.duration / 1000)}s</span>
                            {(msg as any).sessionData.flowAnalysis?.flowCount && (
                              <span className="mini-stat"><MdLoop size={12} /> {(msg as any).sessionData.flowAnalysis.flowCount} flows</span>
                            )}
                          </div>
                          <div className="mini-card-actions">
                            <button
                              className="mini-btn replay"
                              onClick={async () => {
                                setMessages(prev => [...prev, {
                                  role: 'system',
                                  content: `▶️ Replaying session...`
                                }]);
                                const result = await window.electron.replaySession((msg as any).sessionData.id, 'normal');
                                setMessages(prev => [...prev, {
                                  role: 'system',
                                  content: result.success ? `✅ Replay completed!` : `❌ Replay failed: ${result.message}`
                                }]);
                              }}
                              title="Replay session"
                            >
                              <MdPlayArrow size={14} /> Replay
                            </button>
                            <button
                              className="mini-btn generate"
                              onClick={() => handleGenerateTestCases((msg as any).sessionData)}
                              title="Generate test cases"
                            >
                              <MdTableChart size={14} /> Generate Tests
                            </button>
                            <button
                              className="mini-btn details"
                              onClick={() => setRightPanelView('history')}
                              title="View in history"
                            >
                              <MdHistory size={14} /> Details
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="message-content">{msg.content}</div>
                      )}
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
                        <div key={session.id} className="session-card">
                          {/* Card Header */}
                          <div className="card-header">
                            <div className="title-row">
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
                                  className="card-title"
                                >
                                  {session.customName || (session.startUrl.includes('login') ? '🔐 Login Test' : '🧪 Test Session')}
                                </h4>
                              )}
                              <button
                                className="delete-btn"
                                onClick={() => handleDeleteSession(
                                  session.id,
                                  session.customName || (session.startUrl.includes('login') ? 'Login Test' : 'Test Session')
                                )}
                                title="Delete session"
                              >
                                <MdDelete />
                              </button>
                            </div>
                            <div className="meta-row">
                              <span className="session-badge">#{session.id.substring(8, 16)}</span>
                              <span className="meta-item">
                                <MdCode size={14} /> {session.actionCount} actions
                              </span>
                              <span className="meta-item">
                                <MdTimer size={14} /> {Math.round(session.duration / 1000)}s
                              </span>
                              {session.flowAnalysis && session.flowAnalysis.success && (
                                <>
                                  <span className="meta-item">
                                    <MdLoop size={14} /> {session.flowAnalysis.flowCount || 0} flows
                                  </span>
                                  <span className="meta-item">
                                    <MdCheckCircle size={14} /> {session.flowAnalysis.flows?.reduce((sum: number, f: any) => sum + (f.assertions?.length || 0), 0) || 0} assertions
                                  </span>
                                </>
                              )}
                              {session.testCaseMetadata && session.testCaseMetadata.testCaseCount && (
                                <span className="meta-item tests">
                                  <MdTableChart size={14} /> {session.testCaseMetadata.testCaseCount} tests
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="card-body">
                            <div className="info-row">
                              <span className="info-label"><MdLink size={14} /> URL</span>
                              <span
                                className="info-value clickable"
                                onClick={async () => {
                                  await window.electron.navigate(session.startUrl);
                                }}
                                title={`Click to navigate to ${session.startUrl}`}
                              >
                                {session.startUrl.substring(0, 60)}{session.startUrl.length > 60 ? '...' : ''}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label"><MdCalendarToday size={14} /> Created</span>
                              <span className="info-value">
                                {new Date(session.createdAt).toLocaleString()}
                              </span>
                            </div>

                            {/* Test Generation Progress */}
                            {generatingSessionId === session.id && generationProgress && (
                              <div className="progress-bar generation">
                                <div className="progress-header">
                                  <span className="progress-label">
                                    <span className="spinner-dot"></span>
                                    {generationProgress.current}
                                  </span>
                                </div>
                                <div className="progress-track">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${(generationProgress.completed / generationProgress.total) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Live Test Progress */}
                            {runningTestSessionId === session.id && testProgress && (
                              <div className="progress-bar">
                                <div className="progress-header">
                                  <span className="progress-label">
                                    <span className="spinner-dot"></span>
                                    Running Tests
                                  </span>
                                  <span className="progress-count">
                                    {testProgress.completed}/{testProgress.total}
                                  </span>
                                </div>
                                <div className="progress-track">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${(testProgress.completed / testProgress.total) * 100}%` }}
                                  ></div>
                                </div>
                                <div className="progress-stats">
                                  <span className="stat-passed">✓ {testProgress.passed} passed</span>
                                  <span className="stat-failed">✗ {testProgress.failed} failed</span>
                                </div>
                              </div>
                            )}

                            {/* Replay Section */}
                            <div className="replay-section">
                              <div className="replay-label"><MdPlayArrow size={14} /> Replay</div>
                              <div className="replay-buttons">
                                <button
                                  className="replay-btn all"
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
                                  All
                                </button>
                                {session.flowAnalysis && session.flowAnalysis.flows && session.flowAnalysis.flows.map((flow: any, idx: number) => (
                                  <button
                                    key={idx}
                                    className={`replay-btn ${flow.type}`}
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
                                    {flow.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer - Test Actions */}
                          <div className="card-footer">
                            {!session.testCaseMetadata || !session.testCaseMetadata.testCaseCount ? (
                              // No test cases yet - show Generate button
                              <button
                                className="action-btn generate-primary"
                                onClick={() => handleGenerateTestCases(session)}
                                title="Auto-generate test cases with AI"
                              >
                                <MdTableChart size={16} /> Generate Test Cases
                              </button>
                            ) : (
                              // Test cases exist - show View, Regenerate, Run buttons
                              <>
                                <button
                                  className="action-btn primary"
                                  onClick={async () => {
                                    setMessages(prev => [...prev, {
                                      role: 'system',
                                      content: `📊 Opening test cases Excel file...`
                                    }]);
                                    const result = await window.electron.openTestCases(session.id);
                                    if (!result.success) {
                                      setMessages(prev => [...prev, {
                                        role: 'system',
                                        content: `❌ Failed to open Excel: ${result.message}`
                                      }]);
                                    }
                                  }}
                                  title="View test cases in Excel"
                                >
                                  <MdTableChart size={16} /> View Test Cases
                                </button>
                                <button
                                  className="action-btn secondary"
                                  onClick={async () => {
                                    // Immediately show generation progress
                                    setGeneratingSessionId(session.id);
                                    setGenerationProgress({
                                      total: session.flowAnalysis?.flowCount || 1,
                                      completed: 0,
                                      current: 'Starting generation...'
                                    });

                                    setMessages(prev => [...prev, {
                                      role: 'system',
                                      content: `🔄 Regenerating test cases with AI...`
                                    }]);

                                    const result = await window.electron.regenerateTestCases(session.id);

                                    setGenerationProgress(null); // Clear progress when complete
                                    setGeneratingSessionId(null); // Clear generating session

                                    setMessages(prev => [...prev, {
                                      role: 'system',
                                      content: result.success
                                        ? `✅ Generated ${result.testCaseCount} new test cases!`
                                        : `❌ Regeneration failed: ${result.message}`
                                    }]);
                                    if (result.success) {
                                      loadSessions(); // Refresh to show updated count
                                    }
                                  }}
                                  title="Regenerate test cases using AI"
                                >
                                  <MdRefresh size={18} />
                                </button>
                                <button
                                  className="action-btn success"
                                  onClick={async () => {
                                    // Immediately show status bar with initial progress
                                    setRunningTestSessionId(session.id);
                                    setTestProgress({
                                      total: session.testCaseMetadata.testCaseCount,
                                      completed: 0,
                                      passed: 0,
                                      failed: 0
                                    });

                                    setMessages(prev => [...prev, {
                                      role: 'system',
                                      content: `▶️ Running ${session.testCaseMetadata.testCaseCount} test cases...`
                                    }]);

                                    const result = await window.electron.runAllTests(session.id);

                                    setTestProgress(null); // Clear progress when complete
                                    setRunningTestSessionId(null); // Clear running session
                                    setMessages(prev => [...prev, {
                                      role: 'system',
                                      content: result.success
                                        ? `✅ Tests completed: ${result.passed}/${result.total} passed (${result.failed} failed)`
                                        : `❌ Test execution failed: ${result.message}`
                                    }]);
                                  }}
                                  title="Run all test cases in parallel"
                                >
                                  <MdPlayArrow size={16} /> Run Tests
                                </button>
                              </>
                            )}
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

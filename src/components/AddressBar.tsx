/**
 * AddressBar Component
 * Top navigation bar with URL input, navigation controls, recording controls, and chat toggle
 */

import { MdArrowBack, MdArrowForward, MdRefresh, MdLock, MdClose, MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface AddressBarProps {
  url: string;
  setUrl: (url: string) => void;
  isSecure: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isRecording: boolean;
  showChat: boolean;
  onNavigate: () => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onHome: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleChat: () => void;
}

export function AddressBar({
  url,
  setUrl,
  isSecure,
  canGoBack,
  canGoForward,
  isRecording,
  showChat,
  onNavigate,
  onBack,
  onForward,
  onRefresh,
  onHome,
  onStartRecording,
  onStopRecording,
  onToggleChat,
}: AddressBarProps) {
  return (
    <div className="top-bar">
      <div className="logo">
        <h1>Testmug</h1>
      </div>

      {/* Navigation Controls */}
      <div className="nav-controls">
        <button
          className="nav-button"
          onClick={onBack}
          disabled={!canGoBack}
          title="Go back"
        >
          <MdArrowBack size={18} />
        </button>
        <button
          className="nav-button"
          onClick={onForward}
          disabled={!canGoForward}
          title="Go forward"
        >
          <MdArrowForward size={18} />
        </button>
        <button
          className="nav-button"
          onClick={onRefresh}
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
          onKeyPress={(e) => e.key === 'Enter' && onNavigate()}
        />
        <button className="go-button" onClick={onNavigate}>
          Go
        </button>
        <button className="close-button" onClick={onHome} title="Close and go home">
          <MdClose size={18} />
        </button>
      </div>

      {/* Right Side Controls */}
      <div className="right-controls">
        {!isRecording ? (
          <button
            className="record-btn"
            onClick={onStartRecording}
            title="Start recording test flow"
          >
            <span className="record-icon">●</span>
            <span>Record</span>
          </button>
        ) : (
          <button className="record-btn recording" onClick={onStopRecording} title="Stop recording">
            <span>Stop</span>
            <span className="stop-icon">■</span>
          </button>
        )}

        <button
          className="chat-toggle-button"
          onClick={onToggleChat}
          title={showChat ? 'Hide panel' : 'Show panel'}
        >
          {showChat ? <MdChevronRight size={20} /> : <MdChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
}

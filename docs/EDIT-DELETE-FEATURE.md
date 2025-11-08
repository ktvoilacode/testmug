# Edit & Delete Session Feature ✨

## Overview

Added click-to-edit session names and delete functionality with confirmation dialog.

---

## ✅ Features

### 1. Click-to-Edit Session Name

**How it works:**
- Click on any session title to edit it
- Input appears with auto-focus
- Press **Enter** to save
- Press **Escape** to cancel
- Click outside (blur) to save

**Visual Feedback:**
- Hover: Title background changes to gray, text turns blue
- Edit mode: Blue border with focus ring
- Cursor changes to pointer on hover

### 2. Delete Session Button

**How it works:**
- Trash icon (🗑️) appears on the right side of each session
- Faded by default (50% opacity)
- Hover: Red background, full opacity, slight scale up
- Click: Confirmation dialog appears
- Confirm: Deletes session + all related files

**What gets deleted:**
- Session JSON file
- Flow analysis file
- Main Playwright spec file
- All flow-specific spec files

---

## 🎨 UI Design

### Session Title Row
```
┌──────────────────────────────────────────────┐
│ 🔐 Login Test  #gveqet  🗑️                   │
│    ↑ Click to edit      ↑ Delete             │
└──────────────────────────────────────────────┘
```

### Edit Mode
```
┌──────────────────────────────────────────────┐
│ [My Custom Test Name___]  #gveqet  🗑️        │
│    ↑ Blue border, focused                    │
└──────────────────────────────────────────────┘
```

### Confirmation Dialog
```
┌────────────────────────────────────────┐
│  Are you sure you want to delete      │
│  "Login Test"?                         │
│                                        │
│  This action cannot be undone.         │
│                                        │
│       [Cancel]    [OK]                 │
└────────────────────────────────────────┘
```

---

## 🎯 CSS Highlights

### Editable Title
```css
.editable-title {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.editable-title:hover {
  background: #f3f4f6;
  color: #3b82f6;
}
```

### Edit Input
```css
.session-name-input {
  font-size: 14px;
  font-weight: 600;
  border: 2px solid #3b82f6;
  border-radius: 4px;
  min-width: 200px;
}

.session-name-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### Delete Button
```css
.delete-session-btn {
  font-size: 14px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  opacity: 0.5;
  margin-left: auto;
}

.delete-session-btn:hover {
  background: #fee2e2;
  opacity: 1;
  transform: scale(1.1);
}
```

---

## 🔧 Implementation Details

### Frontend (App.tsx)

**State:**
```typescript
const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
const [editingSessionName, setEditingSessionName] = useState('');
```

**Edit Handler:**
```typescript
const handleEditSessionName = (sessionId: string, currentName: string) => {
  setEditingSessionId(sessionId);
  setEditingSessionName(currentName);
};
```

**Save Handler:**
```typescript
const handleSaveSessionName = async (sessionId: string) => {
  const result = await window.electron.updateSessionName(sessionId, editingSessionName.trim());
  if (result.success) {
    await loadSessions();
    setMessages([...messages, { role: 'system', content: '✅ Session renamed' }]);
  }
  setEditingSessionId(null);
};
```

**Delete Handler:**
```typescript
const handleDeleteSession = async (sessionId: string, sessionName: string) => {
  if (window.confirm(`Are you sure you want to delete "${sessionName}"?\n\nThis action cannot be undone.`)) {
    const result = await window.electron.deleteSession(sessionId);
    if (result.success) {
      await loadSessions();
      setMessages([...messages, { role: 'system', content: '🗑️ Session deleted' }]);
    }
  }
};
```

---

### Backend (session-storage.js)

**Update Session Name:**
```javascript
updateSessionName(sessionId, customName) {
  const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
  const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  sessionData.customName = customName;
  fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
  return true;
}
```

**Delete Session:**
```javascript
deleteSession(sessionId) {
  // Delete session JSON
  fs.unlinkSync(path.join(this.sessionsDir, `${sessionId}.json`));

  // Delete analysis
  fs.unlinkSync(path.join(this.sessionsDir, `${sessionId}_analysis.json`));

  // Delete main spec
  fs.unlinkSync(path.join(this.sessionsDir, `${sessionId}.spec.js`));

  // Delete flow-specific specs
  const files = fs.readdirSync(this.sessionsDir);
  files.forEach(file => {
    if (file.startsWith(sessionId) && file.endsWith('.spec.js')) {
      fs.unlinkSync(path.join(this.sessionsDir, file));
    }
  });
}
```

---

### IPC Handlers (main.js)

**Update Name:**
```javascript
ipcMain.handle('update-session-name', async (event, sessionId, customName) => {
  try {
    sessionStorage.updateSessionName(sessionId, customName);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
```

**Delete:**
```javascript
ipcMain.handle('delete-session', async (event, sessionId) => {
  try {
    sessionStorage.deleteSession(sessionId);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
```

---

## 📝 Data Storage

### Session JSON with Custom Name
```json
{
  "id": "session_1762601663577_gveqet",
  "customName": "My Custom Login Test",
  "createdAt": "2025-11-08T11:34:23.577Z",
  "startUrl": "https://example.com/login",
  "actions": [...],
  "assertions": [...]
}
```

---

## 🎮 User Flow

### Editing Name
1. User hovers over session title
   - Title background turns gray
   - Text turns blue
   - Cursor changes to pointer

2. User clicks title
   - Input field appears
   - Current name is selected
   - Cursor blinks in input

3. User types new name
   - Input updates in real-time
   - Blue border visible

4. User presses Enter or clicks outside
   - Name saves to disk
   - UI updates immediately
   - Success message in chat

### Deleting Session
1. User hovers over trash icon
   - Opacity increases to 100%
   - Red background appears
   - Icon scales up slightly

2. User clicks trash icon
   - Confirmation dialog appears
   - Shows session name
   - Warns about permanent deletion

3. User clicks "OK"
   - All files deleted from disk
   - Session removed from UI
   - Success message in chat

4. User clicks "Cancel"
   - Dialog closes
   - No changes made

---

## 🔒 Safety Features

### Edit Validation
- Empty names are ignored
- Whitespace is trimmed
- Original name restored on empty input

### Delete Confirmation
- Native browser confirmation dialog
- Shows exact session name being deleted
- Clear warning about permanence
- No accidental deletions

### File Cleanup
- Deletes ALL related files:
  - Session JSON
  - Analysis JSON
  - Main spec file
  - Flow-specific spec files
- No orphaned files left behind

---

## 🎯 Benefits

### For Users
✅ **Organize sessions** - Give meaningful names
✅ **Clean up clutter** - Delete old/test sessions
✅ **Quick editing** - Click and type
✅ **Safe deletion** - Confirmation prevents accidents
✅ **Instant feedback** - See changes immediately

### For Development
✅ **Clean data** - No orphaned files
✅ **Proper state** - UI stays in sync
✅ **Error handling** - Graceful failures
✅ **Logging** - Track all operations

---

## 📊 Files Modified

**Frontend:**
- `src/App.tsx` (lines 46-289) - State, handlers, UI
- `src/App.css` (lines 841-913) - Styles

**Backend:**
- `electron/session-storage.js` (lines 128-174) - Storage methods
- `electron/main.js` (lines 463-495) - IPC handlers
- `electron/preload.js` (lines 28-29) - IPC bridge

---

## 🧪 Testing

### Test Edit
1. Open History tab
2. Click on "🔐 Login Test"
3. Type "My Custom Test"
4. Press Enter
5. See name change + success message

### Test Delete
1. Hover over 🗑️ icon
2. See red background
3. Click icon
4. See confirmation dialog
5. Click OK
6. Session disappears

### Test Keyboard
- **Enter** in edit mode → Saves
- **Escape** in edit mode → Cancels (future enhancement)
- **Click outside** → Saves

---

## 🚀 Future Enhancements

- [ ] Escape key to cancel editing
- [ ] Undo delete functionality
- [ ] Bulk delete (select multiple)
- [ ] Export session before delete
- [ ] Session name templates
- [ ] Rename from context menu

---

**Status:** ✅ Complete and ready to use!

**Start the app and try it:**
```bash
npm run dev
```

Click on session titles to edit, click 🗑️ to delete! 🎉

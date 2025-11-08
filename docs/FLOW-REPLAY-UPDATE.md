# Flow Replay & History UI Improvements

## ✅ Changes Made

### 1. Fixed History Tab Flow Analysis Display

**Problem:** History tab was showing "⚠️ No analysis" even though flow analysis files existed.

**Solution:**
- Added auto-refresh every 2 seconds when History tab is open
- This catches newly completed AI analyses (which run asynchronously)
- Sessions now properly load with `flowAnalysis` data

**Files Modified:**
- `src/App.tsx` (lines 253-264)

---

### 2. Individual Flow Replay Buttons

**Problem:** Could only replay entire session, not individual flows.

**Solution:** Added separate replay buttons for each flow!

**UI Before:**
```
[▶️ Replay]
```

**UI After:**
```
[▶️ All]  [✓ Successful Login]  [✗ Failed Login]
```

**Features:**
- **▶️ All** - Replays entire session (all actions)
- **✓ Flow Name** - Replays only positive flow (green button)
- **✗ Flow Name** - Replays only negative flow (red button)

**Files Modified:**
- `src/App.tsx` (lines 546-586) - UI components
- `src/App.css` (lines 815-859) - Styling for flow buttons
- `electron/preload.js` (line 27) - Added `replayFlow` IPC
- `electron/main.js` (lines 401-461) - Added flow replay handler

---

## How It Works

### Flow Replay Implementation

When you click a flow replay button:

1. **Load Session & Analysis**
   ```javascript
   const session = sessionStorage.loadSession(sessionId);
   const flowAnalysis = sessionStorage.loadFlowAnalysis(sessionId);
   ```

2. **Find Specific Flow**
   ```javascript
   const flow = flowAnalysis.flows.find(f => f.flowId === flowId);
   ```

3. **Extract Flow Actions**
   ```javascript
   const flowActions = flow.actionIndices.map(idx => session.actions[idx - 1]);
   ```

4. **Replay Only Those Actions**
   ```javascript
   const flowSession = { ...session, actions: flowActions };
   playwrightController.replaySession(flowSession, 'normal');
   ```

### Example

For a session with 39 actions split into 2 flows:
- **Flow 1 (Positive):** Actions 1-22 (successful login)
- **Flow 2 (Negative):** Actions 24-39 (failed login)

Clicking **✓ Successful Login** replays only actions 1-22!

---

## UI Screenshots (Text)

### History Tab - With Flow Analysis

```
Session gveqet

✓ Successful Login  ✗ Failed Login

[▶️ All]  [✓ Successful Login]  [✗ Failed Login]

39 actions • 19s duration
https://practicetestautomation.com/practice-test-login/
🤖 AI: groq • 2 flow(s) • 3 assertion(s)
2025-11-08, 5:04:23 PM
```

### History Tab - Without Analysis

```
Session abc12345

⚠️ No analysis

[▶️ All]

15 actions • 8s duration
https://example.com/login
2025-11-08, 4:30:15 PM
```

---

## Auto-Refresh Feature

The History tab now **automatically refreshes every 2 seconds** when open.

**Why?**
- AI flow analysis runs asynchronously (takes 1-3 seconds)
- Without refresh, you'd need to manually switch tabs to see the analysis
- Now it appears automatically once the AI completes!

**Visual Feedback:**
1. Record a session → Stop recording
2. Switch to History tab
3. See "⚠️ No analysis" initially
4. Wait 1-2 seconds...
5. Flow badges appear: ✓ Successful Login ✗ Failed Login
6. Replay buttons update automatically!

---

## Button Styling

### All Button (Gray)
```css
background: #f3f4f6
color: #2e2e2e
```

### Positive Flow Button (Green)
```css
background: #d1fae5
color: #065f46
hover: #a7f3d0
```

### Negative Flow Button (Red)
```css
background: #fee2e2
color: #991b1b
hover: #fecaca
```

---

## Testing

### Test Full Session Replay
1. Go to History tab
2. Click **▶️ All** on any session
3. Watch entire session replay in browser

### Test Flow Replay
1. Find a session with flow analysis (has ✓ and ✗ badges)
2. Click **✓ Successful Login**
3. Watch only the positive flow replay
4. Click **✗ Failed Login**
5. Watch only the negative flow replay

### Test Auto-Refresh
1. Record a new session with both flows
2. Stop recording
3. Immediately switch to History tab
4. You'll see "⚠️ No analysis" for ~1-2 seconds
5. Then flow badges appear automatically!

---

## Console Logs

### When Replaying a Flow

```
[IPC] replay-flow: session_1762601663577_gveqet flowId: flow_1
[IPC] Replaying Successful Login (22 actions)
[Playwright] Connecting to BrowserView via CDP: http://localhost:9222
[Replayer] Optimized 22 actions to 18 actions
[Replayer] Replaying at normal speed
[Replayer] Action 1/18: click #username
[Replayer] Action 2/18: input #username (1 keystrokes)
...
[Replayer] ✓ Clicked: #submit
```

---

## Benefits

### For Users
✅ **Visual flow separation** - See positive vs negative tests clearly
✅ **Selective replay** - Run only the flow you want to test
✅ **Faster testing** - Don't replay entire session for one flow
✅ **Auto-update** - No manual refresh needed

### For Development
✅ **Better debugging** - Test individual flows independently
✅ **Clearer logs** - Know exactly which flow is running
✅ **Flow validation** - Verify each flow works correctly

### For Future Features
✅ **Excel integration ready** - Can link test cases to specific flows
✅ **CI/CD friendly** - Run positive/negative tests separately
✅ **Better coverage** - Generate test cases per flow type

---

## Next Steps

1. ✅ **Test the changes** - Start the app and verify flow replay works
2. **Excel generation** - Use flow scripts when generating test cases
3. **Flow editing** - Allow users to modify flow boundaries
4. **Flow deletion** - Remove unwanted flows from analysis

---

**Status:** ✅ All changes complete and ready for testing!

**Start the app:**
```bash
npm run dev
```

**Then:**
1. Go to History tab
2. You should see flow badges and multiple replay buttons
3. Click individual flow buttons to replay specific flows

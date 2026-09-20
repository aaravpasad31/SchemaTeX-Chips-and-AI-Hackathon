# Manual Testing Guide for Claude API Integration (#18)

This guide explains how to manually test the Claude API integration for SchemaTeX abstraction inference.

## Prerequisites

1. **Claude API Key**: Obtain a valid Claude API key from https://console.anthropic.com/
   - Format: `sk-ant-...`
   - Keep it secure—never commit to version control

2. **VS Code**: Install the latest version (1.70+)

3. **Extension Setup**:
   ```bash
   cd extension
   npm install
   npm run compile
   ```

## Test Procedure

### 1. Launch the Extension in Debug Mode

```bash
cd extension
npm run watch
# In VS Code, press F5 or go to Run > Start Debugging
```

This opens a new VS Code window with the extension running.

### 2. Set the Claude API Key

In the extension window:

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
2. Type `SchemaTeX: Set Claude API Key`
3. Select it and enter your Claude API key in the input box
4. The key is stored securely in VS Code Secrets (not in settings.json)

**Expected Behavior:**
- Input box appears with password masking
- After entering the key, message "Claude API key saved securely" appears
- The key is never logged or displayed in the console

### 3. Test the Simplify Command

Create or open a SystemVerilog file (`.sv`):

1. Open a Verilog/SystemVerilog file in the editor
2. Open the Command Palette
3. Type `SchemaTeX: Simplify with AI`
4. The extension will:
   - Show a progress notification: "Inferring abstraction..."
   - Parse the file using ParserBridge (currently returns placeholder AST)
   - Send the AST to Claude API
   - Display the inferred abstraction name and confidence level

**Expected Behavior:**
- Progress notification appears and disappears
- Success message shows: `Abstraction inferred: [name] (confidence: XX%)`
- Console shows the inferred abstraction JSON (for debugging)

### 4. Error Scenarios to Test

#### Missing API Key
1. Clear the API key (TODO: Add a "Clear API Key" command)
2. Run the Simplify command
3. **Expected**: Error message "Claude API key not configured"

#### Invalid API Key
1. Set an invalid API key (e.g., `invalid-key`)
2. Run the Simplify command
3. **Expected**: Error message with Claude API error details

#### No Active Editor
1. Close all editor windows
2. Run the Simplify command
3. **Expected**: Error message "No active editor"

#### Malformed Claude Response
This is harder to test without mocking—would require modifying the client to accept a custom response.

## What Gets Stored in VS Code Secrets

The API key is stored in the system's secure credential storage:

- **Windows**: Credential Manager
- **macOS**: Keychain
- **Linux**: `pass` or gnome-keyring (depends on system setup)

To verify the key is stored (for debugging):

```typescript
// In the VS Code extension console:
const key = await context.secrets.get('schematex.claudeApiKey');
console.log(key ? 'Key is stored' : 'Key is not stored');
```

## What's Not Yet Implemented

- [ ] Visualization of the inferred abstraction in the webview (#18 continuation)
- [ ] Storing abstractions as extension state annotations
- [ ] Toggle between raw and simplified diagram views
- [ ] "Clear API Key" command
- [ ] Integration tests (currently manual only)

## API Call Verification

To verify the API call is being made correctly:

1. Open VS Code DevTools: `Help > Toggle Developer Tools`
2. The Network tab won't show HTTP requests (they're made in the extension process, not the renderer)
3. Check the Debug Console for the extension process output
4. Look for logs like: `Inferred abstraction: { name: ..., description: ..., ... }`

## Troubleshooting

### Extension doesn't activate
- Ensure a Verilog file is open (activation event: `onLanguage:verilog`)
- Check the Extension Host console for errors

### API key not being retrieved
- Verify the key was stored by checking VS Code Secrets in the debugger
- Try re-entering the key

### Claude API errors
- Verify the API key is valid: test it with `curl` or the Anthropic CLI
- Check for rate limiting (401 = invalid key, 429 = rate limited)
- Ensure the model ID is correct (currently: `claude-3-5-sonnet-20241022`)

### Parsing fails
- The ParserBridge currently returns placeholder data—the actual parser CLI isn't integrated yet
- This is expected; the abstraction inference won't work until the parser CLI is integrated (#7)

## Next Steps After Manual Testing

1. Integrate the actual SystemVerilog parser (#7)
2. Implement abstraction visualization in the webview
3. Add integration tests
4. Add a "Clear API Key" command for logout

# P16 Validation

P16 implements real "More agents" extension agent execution from the Result Canvas, with agent switching and additional built-in agent manifests.

## Deliverables

### New Agent Manifests
- `agents/cloud-deep-explain.json` - Deep Explain agent
  - Capabilities: explain, question_answering
  - Medium latency, medium cost
- `agents/cloud-table-extract.json` - Table Extract agent
  - Capabilities: table_extraction, extract_text
  - Medium latency, medium cost
  - Output: key_value, markdown, plain_text
- `agents/cloud-vision-analyze.json` - Vision Analyze agent
  - Capabilities: image_understanding, explain, question_answering
  - Long latency, high cost
  - Input: screen_region, image_region
  - Every-time user confirmation required

### Agent Registry
- Updated `src/agents/agentRegistry.ts`
  - 7 built-in manifests (was 4)
  - All new manifests validated and loaded
  - Local-first sorting preserved

### Result Canvas Updates
- Updated `src/overlay/ResultCanvas.tsx`
  - "More agents" button now toggles: "More agents" / "Hide agents"
  - Agent list dynamically rendered from `moreAgents` prop
  - Each agent button shows manifest name
  - Clicking agent triggers `onSelectAgent` callback
  - Shows "No additional agents available." when empty

### Overlay Root Updates
- Updated `src/overlay/OverlayRoot.tsx`
  - Passes through `moreAgents` and `onSelectAgent` props

### App Integration
- Updated `src/App.tsx`
  - `moreAgents` computed: all compatible actions minus current result's agent
  - `handleSelectAgent` function for Result Canvas agent selection
  - Full policy checking: blocked actions show error, confirmable actions show prompt
  - Proper state reset when switching agents
  - TTS stops implicitly when result changes

## Integration Points

1. **Policy enforcement**: All agent selections go through the same policy decision flow
2. **Privacy gates**: Cloud agents still require user confirmation before execution
3. **State consistency**: Agent switching properly resets result and pending action states
4. **Manifest-driven**: Agent list is entirely driven by manifest compatibility matching

## Expected Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Manual Validation

1. **More agents button**:
   - Open Result Canvas, click "More agents"
   - Verify list shows compatible agents (Deep Explain, Table Extract, Vision Analyze, etc.)
   - Verify button text changes to "Hide agents"
   - Click "Hide agents" and verify list collapses

2. **Agent switching**:
   - Click an agent from the More agents list
   - Verify thinking state appears
   - Verify new result appears with different agent ID
   - Verify "More agents" list updates to exclude the new current agent

3. **Policy gates**:
   - Select Vision Analyze (requires every_time confirmation)
   - Verify permission prompt appears
   - Confirm and verify execution proceeds
   - Cancel and verify result does not change

4. **Agent variety**:
   - Verify Deep Explain provides more detailed output
   - Verify Table Extract provides key_value output
   - Verify Vision Analyze works with screen_region input

## 2026-06-24 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 15 test files and 89 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Real deep-explain / table-extract / vision-analyze with live cloud API
- Vision model image upload (currently text-only cloud adapter)
- Table extract structured output rendering in Result Canvas
- Agent search / filtering in More agents panel
- Agent favorites / pinning

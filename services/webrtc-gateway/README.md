# 🔥 TeamFlow — Standalone Voice Calling (WebRTC)

**Zero external APIs. Zero telco costs. 100% self-hosted.**

Browser calls AI voice agent via WebRTC (mediasoup). No Twilio, no Asterisk, no DID provider needed.

---

## Architecture

```
Browser Caller
  ↕ WebRTC (DTLS-SRTP)
  ↕ Socket.IO (signaling + SDP exchange)
webrtc-gateway (mediasoup on port 3004)
  ↕ Socket.IO
voice-agent service (port 3002)
  ↕ Whisper STT → LLM → Piper TTS
```

**Flow:**
1. Browser requests a call → `initiate-call` event
2. Gateway creates a room, notifies voice-agent
3. AI agent joins the room, SDP offers/answers exchanged via Socket.IO
4. Browser ↔ AI agent: real-time WebRTC audio (Opus codec)
5. AI responds: Whisper → LLM → Piper → WebRTC audio back

---

## Quick Start

```bash
# Copy env template
cp .env.standalone.example .env

# Edit .env — set WEBRTC_ANNOUNCED_IP to your server's public IP
# (needed for WebRTC穿透 behind NAT)

# Start everything
docker compose -f docker-compose.voice.yml up -d

# Verify
curl http://localhost:3004/health
```

---

## Services

### webrtc-gateway (port 3004)
- **Role:** WebRTC media server + Socket.IO signaling hub
- **Tech:** mediasoup 3.x — pure Node.js, no native deps in Dockerfile
- **Handles:** room management, SDP offer/answer relay, ICE candidates, WebRTC transport
- **No external APIs** — fully standalone

### voice-agent (port 3002)
- **Role:** AI brain — STT → LLM → TTS pipeline
- **STT:** Whisper (self-hosted, port 9000)
- **TTS:** Piper (self-hosted, port 5000)
- **LLM:** Ollama (self-hosted, port 11434) or OpenAI/MiniMax (optional)

---

## Key Files

```
services/webrtc-gateway/
├── src/index.ts                  # HTTP + Socket.IO server
├── src/mediasoup/index.ts        # Worker + Router setup
├── src/rooms/room-manager.ts     # 1:1 call room management
├── src/signaling/socket-handler.ts  # WebRTC signaling events
└── Dockerfile                    # Alpine + mediasoup native build

services/voice-agent/src/
├── index.ts                      # Voice service entrypoint (WebRTC-first)
├── calls/voice-bridge.ts         # Bridge: AI ↔ WebRTC rooms
├── agents/flow.ts                # Voice flow engine (speak/collect/branch/transfer)
├── stt/stt.ts                   # Whisper integration
├── tts/tts.ts                   # Piper TTS integration
└── llm/llm.ts                   # LLM integration (ollama/openai/minimax)

frontend/src/
├── hooks/useWebRTCCall.ts       # Browser WebRTC hook (React)
└── pages/admin/VoiceCall.tsx    # Call UI with dialpad + visualizer
```

---

## How Calls Work (Step by Step)

1. **Browser** calls `startCall()` → gets mic, creates RTCPeerConnection
2. **Browser** sends `initiate-call` via Socket.IO
3. **Gateway** creates a room, emits `agent-call-request` to voice-agent
4. **Voice-Agent** loads agent config from DB, calls `VoiceBridge.acceptAndHandleCall()`
5. **AI Agent** joins room via `agent-join`, creates its own `RTCPeerConnection`
6. **SDP exchange:** caller offer → gateway → agent | agent answer → gateway → caller
7. **ICE candidates:** exchanged via `ice-candidate` events
8. **WebRTC audio active:** browser mic ↔ AI response (real-time)
9. **AI Pipeline:** Whisper (speech-to-text) → LLM (generate response) → Piper (text-to-speech) → WebRTC
10. **End:** either side sends `hangup`, room closes, call log saved

---

## Configuration

### .env (minimal)

```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/teamflow

# WebRTC (PUBLIC IP required for NAT穿透)
WEBRTC_ANNOUNCED_IP=203.0.113.42

# AI (all self-hosted)
WHISPER_URL=http://whisper:9000
PIPER_URL=http://piper:5000
LLM_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:latest
```

### WebRTC穿透 (NAT Traversal)

By default WebRTC can't connect through NAT without a public IP announcement.

- **Cloud servers (Vultr, AWS, etc.):** Set `WEBRTC_ANNOUNCED_IP` to the public IP
- **Behind corporate firewall:** You'll need a TURN server (e.g., coturn self-hosted on port 3478)
- **Local dev:** Works fine with `127.0.0.1` as announced IP

---

## Voice Agents (Frontend UI)

The `VoiceAgents` page (`/admin/voice-agents`) lets you:
- Create/configure AI agents with step-by-step flows
- **Steps:** Speak (TTS), Collect (STT), Branch, Transfer, Task Update, Delay, End
- Add system prompt + LLM config
- Test call from browser

The `VoiceCall` page opens the actual call UI with:
- Real-time audio visualizer
- Mute/speaker controls
- Duration timer
- Status indicators (connecting → ringing → connected)

---

## Database Schema

```sql
voice_agents    — agent config (steps, prompt, voice, LLM)
campaigns       — outbound campaign config
call_logs       — every call: duration, transcript, summary
contacts        — campaign contact list
```

---

## Optional: Asterisk (PSTN fallback)

Asterisk is **no longer required**. If you still want real phone number calling:

```yaml
# docker-compose.voice.yml (add this)
asterisk:
  image: boardsource/asterisk:20-alpine
  ports: ["5060:5060/udp", "10000-10050:10000-10050/udp"]
  environment:
    ASTERISK_HOST: asterisk
    ASTERISK_PORT: 5038
```

Set `ASTERISK_HOST` in voice-agent env to enable the fallback path.

---

## Health Checks

```bash
# WebRTC gateway
curl http://localhost:3004/health

# Voice agent
curl http://localhost:3002/health

# Stats
curl http://localhost:3002/stats/summary
```

---

## Why No External APIs?

| Feature | External | TeamFlow |
|---------|----------|----------|
| Calling | Twilio ($0.01/min) | ✅ Free |
| STT | AssemblyAI/OpenAI | ✅ Free (Whisper) |
| TTS | ElevenLabs ($) | ✅ Free (Piper) |
| LLM | OpenAI ($) | ✅ Free (Ollama) |
| Phone # | Twilio DID ($1/mo) | ✅ Internal VoIP only |
| Media server | Twilio | ✅ Free (mediasoup) |

**Total cost: $0/month** (plus your server compute)
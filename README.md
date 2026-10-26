<div align="center">

# 🌐 Sasl

### The Offline-First Social Layer

**A peer-to-peer social platform that works when the internet doesn't.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-sasl.vercel.app-22c55e?style=for-the-badge)](https://sasl.vercel.app)
[![API](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge)](https://sasl-api-i34r.onrender.com/api/)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)]()
[![Made with React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Made with Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django)](https://djangoproject.com/)

</div>

---

## 📱 Screenshots

<div align="center">

| Feed | WaveMesh (Offline P2P) | Wallet |
|------|------------------------|--------|
| ![Feed](docs/screenshots/feed.png) | ![WaveMesh](docs/screenshots/wavemesh.png) | ![Wallet](docs/screenshots/wallet.png) |

| Group Chat | Reels | Marketplace |
|------------|-------|-------------|
| ![GroupChat](docs/screenshots/groupchat.png) | ![Reels](docs/screenshots/reels.png) | ![Marketplace](docs/screenshots/marketplace.png) |

</div>

> 📸 *Screenshots coming soon — see `/docs/screenshots/` for the full gallery.*

---

## ✨ What is Sasl?

**Sasl** (Social Asynchronous Sharing Layer) is a full-stack social platform that combines the familiar experience of modern social apps with one radical difference:

> **It works without the internet.**

Using Bluetooth Low Energy (BLE) mesh networking, Sasl users can message each other, share content, and even complete transactions **completely offline** — no WiFi, no cell signal, no server required.

### 🚀 Core Features

- 📡 **WaveMesh P2P** — Direct peer-to-peer messaging via BLE (works offline)
- 🌉 **Echo Relay** — Multi-hop encrypted routing through intermediate users (bridge-blind E2E)
- 🔐 **End-to-End Encryption** — AES-256-GCM for all relay traffic
- 💬 **Feed** — Posts, comments, stories, GIFs, polls
- 🎬 **Reels** — Short video feed with comments
- 👥 **Group Chat** — Real-time group messaging
- 🛒 **Marketplace** — Buy/sell with escrow-protected transactions
- 💼 **Gigs** — Freelance marketplace with milestone payments
- 🎓 **Tutoring** — 1:1 tutoring with video calls and whiteboard
- 💰 **Wallet** — In-app balance, escrow, withdrawals
- 🌍 **13 Languages** — Full i18n including RTL support
- 📱 **PWA + Native APK** — Installable as web app or Android APK

---

## 🛠 Technology Stack

### Frontend

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **Styling** | Tailwind CSS |
| **Animation** | Framer Motion |
| **State** | React Context + Hooks |
| **i18n** | i18next (13 languages) |
| **Offline Store** | Dexie.js (IndexedDB) |
| **Icons** | Lucide React |
| **Real-time** | WebSocket (Django Channels) |
| **PWA** | Custom Service Worker |

### Backend

| Layer | Technology |
|-------|-----------|
| **Framework** | Django 4.2 |
| **API** | Django REST Framework |
| **Auth** | JWT (SimpleJWT) |
| **Real-time** | Django Channels + Daphne (ASGI) |
| **Database** | PostgreSQL (Supabase) |
| **Cache** | Redis |
| **Media** | Cloudinary |
| **Task Queue** | Celery + Redis |

### Mobile

| Layer | Technology |
|-------|-----------|
| **Runtime** | Capacitor 8 |
| **BLE** | @capacitor-community/bluetooth-le |
| **Storage** | @capacitor/preferences |
| **Push** | @capacitor/push-notifications |

### WaveMesh (Offline Layer)

| Layer | Technology |
|-------|-----------|
| **Discovery** | BLE 4.0 + BLE 5.0 Long Range |
| **Transport** | Custom GATT server (Android native) |
| **Encryption** | Web Crypto API (AES-256-GCM) |
| **Routing** | Store-and-forward relay (TTL 100 hops) |
| **Persistence** | IndexedDB (`sasl_echo_relay`) |
| **Bridge Detection** | relayPath tracking + key-based receiver check |

### DevOps

| Layer | Technology |
|-------|-----------|
| **Frontend Host** | Vercel (auto-deploy from `main`) |
| **Backend Host** | Render (Docker container) |
| **CI/CD** | Git push → auto-deploy |
| **Monitoring** | Render logs + Vercel analytics |

---

## 🏗 Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React PWA)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   UI Layer   │  │   WaveMesh   │  │   Offline Cache    │    │
│  │  (Tailwind)  │  │  (BLE Mesh)  │  │   (IndexedDB)      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────┘    │
│         │                 │                     │               │
│         └─────────────────┼─────────────────────┘               │
│                           │                                     │
│                  ┌────────▼────────┐                            │
│                  │   Service Layer │                            │
│                  │  (API + WS)     │                            │
│                  └────────┬────────┘                            │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
    ┌─────────▼──────────┐     ┌───────────▼────────────┐
    │   HTTPS / WSS      │     │   BLE (no internet)    │
    │   to Backend       │     │   to nearby peers      │
    └─────────┬──────────┘     └───────────┬────────────┘
              │                            │
              ▼                            ▼
    ┌─────────────────┐         ┌──────────────────────┐
    │   Django API    │         │   Other Sasl Users   │
    │   (Render)      │         │   (Peer-to-Peer)     │
    │                 │         │                      │
    │  ┌───────────┐  │         │  ┌────────────────┐  │
    │  │ REST API  │  │         │  │  Bridge Node   │  │
    │  ├───────────┤  │         │  │  (Echo Relay)  │  │
    │  │ WebSocket │  │         │  ├────────────────┤  │
    │  ├───────────┤  │         │  │  Receiver Node │  │
    │  │ Channels  │  │         │  │  (Decrypts)    │  │
    │  └─────┬─────┘  │         │  └────────────────┘  │
    │        │        │         └──────────────────────┘
    │  ┌─────▼─────┐  │
    │  │ PostgreSQL│  │
    │  │  (Supabase)│ │
    │  └───────────┘  │
    └─────────────────┘
```

### WaveMesh Mesh Routing (The Unique Part)

Sasl's killer feature is encrypted multi-hop routing through **untusted bridges**:

```
     SENDER A                    BRIDGE B                    RECEIVER C
     ────────                    ────────                    ──────────
     
  1. A types "hello"
     
  2. A encrypts with room key
     → ciphertext: {"ciphertext":"...", "iv":"..."}
     
  3. A sends over BLE  ─────►  B receives ciphertext
                                B CANNOT decrypt (no key)
                                B stores in IndexedDB
                                B forwards when C appears
                                          │
                                          ▼
                                                     C receives ciphertext
                                                     C decrypts with key
                                                     C sees "hello" ✅
                                                     
     B's logs: 🦠 Bridging from A (encrypted)
     B's IndexedDB: {"ciphertext":"eyJjaXBo...", "encrypted":true}
     B never sees "hello" 🔐
```

**Result:** A and C communicate privately through B, even though B has no idea what they're saying. Chain 100 bridges → communicate across 100km+ without internet.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **PostgreSQL** 14+ (or use Supabase)
- **Android Studio** (for APK build)
- **Git**

### Frontend Setup

```bash
# Clone the repo
git clone https://github.com/safwan12salem/sasl.git
cd sasl/frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your values:
#   REACT_APP_API_URL=https://sasl-api-i34r.onrender.com/api

# Start development server
npm start
# Opens at http://localhost:3000
```

### Backend Setup

```bash
cd sasl/backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with:
#   DATABASE_URL=postgresql://user:pass@host:5432/dbname
#   SECRET_KEY=your-secret-key
#   ALLOWED_HOSTS=localhost,127.0.0.1

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start backend
python manage.py runserver
# Opens at http://localhost:8000

# For WebSocket support (use Daphne instead):
daphne sasl.asgi:application --port 8000
```

### Android APK Build

```bash
cd sasl/frontend

# Build React production bundle
npm run build

# Sync to Capacitor
npx cap sync

# Build APK
cd android

# Windows:
export JAVA_HOME="C:\\Program Files\\Android\\Android Studio\\jbr"
export ANDROID_HOME="C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk"

# macOS/Linux:
export JAVA_HOME=$(/usr/libexec/java_home)

./gradlew clean
./gradlew assembleDebug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Installation on Phone

```bash
# Transfer APK to phone via USB or download link
# On phone: Settings → Security → Allow unknown sources
# Open APK → Install

# Or use ADB:
adb install app-debug.apk
```

---

## 🧪 Testing WaveMesh

### Prerequisites

- **2+ Android phones** with the APK installed
- **Bluetooth enabled** on all phones
- **Location permission** granted (required for BLE on Android)
- **Phones within BLE range** (~100m indoor, ~300m outdoor)

### Test 1 — Direct P2P (Scan)

| Step | Phone A | Phone B |
|------|---------|---------|
| 1 | Open WaveMesh → **Start Scan** | Open WaveMesh → **Start Scan** |
| 2 | See B in scan list | See A in scan list |
| 3 | Tap B → send request | Accept request |
| 4 | Type "hello" → send | See "hello" ✅ |
| 5 | See "world" ✅ | Type "world" → send |

**Expected:** Both directions work. Messages are **plaintext** (direct P2P, no bridge).

### Test 2 — QR Relay (3 phones needed)

| Step | Phone A (Sender) | Phone B (Bridge) | Phone C (Receiver) |
|------|------------------|------------------|---------------------|
| 1 | Tap QR → show code | — | — |
| 2 | — | — | Scan A's QR → room opens |
| 3 | Type "hello" → send | — | — |
| 4 | — | Open Log tab → should show: `🦠 Bridging from A (encrypted)` | — |
| 5 | — | — | See "hello" (decrypted) ✅ |

**Expected:**
- B's log: `🦠 Bridging from A (encrypted)` — **NOT** "hello"
- B's IndexedDB: `{"ciphertext":"eyJjaXBo...", "encrypted":true}` — **garbage, not plaintext**
- C's screen: "hello" — **decrypted successfully**

**This is the proof that E2E encryption works.** B is a blind bridge.

---

## 📁 Project Structure

```
sasl/
├── frontend/                    # React PWA
│   ├── public/
│   │   ├── locales/            # 13 language files
│   │   └── service-worker.js   # PWA offline cache
│   ├── src/
│   │   ├── components/         # 60+ React components
│   │   │   ├── WaveMesh.tsx    # Mesh networking UI
│   │   │   ├── Feed.tsx        # Social feed
│   │   │   ├── Reels.tsx       # Video reels
│   │   │   ├── GroupChat.tsx   # Group messaging
│   │   │   ├── Wallet.tsx      # Balance + escrow
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── WaveMeshCore.ts    # BLE mesh engine
│   │   │   ├── EchoRelay.ts       # Store-and-forward relay
│   │   │   ├── encryption.ts      # AES-256-GCM
│   │   │   └── api.ts             # Backend client
│   │   ├── hooks/
│   │   ├── i18n.ts             # Language config
│   │   └── index.tsx
│   ├── android/                # Capacitor Android
│   └── package.json
│
├── backend/                     # Django API
│   ├── sasl/                   # Django project
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── asgi.py             # WebSocket entry
│   ├── users/                  # Auth + profiles + wallet
│   ├── content/                # Feed, posts, reels
│   ├── groupchat/              # Group messaging
│   ├── marketplace/            # Buy/sell + escrow
│   ├── gigs/                   # Freelance gigs
│   ├── tutoring/               # Tutoring sessions
│   ├── streaming/              # Live streaming
│   ├── liveaudio/              # Audio rooms
│   ├── payments/               # Stripe integration
│   ├── monetization/           # Escrow manager + fees
│   ├── notifications/          # WebSocket notifications
│   └── requirements.txt
│
├── docs/
│   └── screenshots/            # App screenshots
│
└── README.md                    # This file
```

---

## 🔒 Security

### End-to-End Encryption (WaveMesh)

- **Algorithm:** AES-256-GCM
- **Key Exchange:** QR code scan (one-time, physical)
- **Key Storage:** Per-room keys in `localStorage`
- **Bridge Blindness:** Bridges only see ciphertext, never plaintext
- **Forward Secrecy:** Not yet (planned for v2)

### Authentication

- **Method:** JWT (access + refresh tokens)
- **Storage:** `localStorage` (client-side)
- **Rotation:** Automatic refresh on expiry

### Payment Security

- **Escrow:** All peer-to-peer payments held until delivery confirmed
- **Platform Fees:** Logged as transactions, not held
- **Card Payments:** Stripe (pending US LLC formation)

### Data Privacy

- **GDPR/CCPA:** Coming soon (see Legal section)
- **Encryption at Rest:** PostgreSQL encrypted (Supabase default)
- **Encryption in Transit:** HTTPS + WSS

---

## 🌍 Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Complete |
| Russian | `ru` | ✅ Complete |
| Arabic | `ar` | ✅ Complete (RTL) |
| Spanish | `es` | ✅ Complete |
| French | `fr` | ✅ Complete |
| German | `de` | ⏳ Coming |
| Greek | `gr` | ✅ Complete |
| Hindi | `hi` | ✅ Complete |
| Italian | `it` | ✅ Complete |
| Japanese | `ja` | ✅ Complete |
| Korean | `ko` | ✅ Complete |
| Portuguese (BR) | `pt-BR` | ✅ Complete |
| Turkish | `tr` | ✅ Complete |
| Chinese | `zh` | ✅ Complete |

---

## 🤝 Contributing

Sasl is currently a **private project**. If you'd like to contribute in the future:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 Legal

- **Terms of Service:** `/legal/terms` (coming soon)
- **Privacy Policy:** `/legal/privacy` (coming soon)
- **Device Safety Disclaimer:** `/legal/safety` (coming soon)

> ⚠️ **WaveMesh uses Bluetooth Low Energy.** Do not use while driving or in situations requiring full attention. See safety disclaimer for details.

---

## 🐛 Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| 266 ESLint warnings | Cosmetic | ⏸️ Deferred |


---

## 📞 Contact & Links

- **Live App:** [sasl.vercel.app](https://sasl.vercel.app)
- **Backend API:** [sasl-api-i34r.onrender.com/api](https://sasl-api-i34r.onrender.com/api/)
- **GitHub:** [github.com/safwan12salem/sasl](https://github.com/safwan12salem/sasl)
- **Issues:** [github.com/safwan12salem/sasl/issues](https://github.com/safwan12salem/sasl/issues)

---

## 📊 Project Status

**Overall Completion: ~94%**

| Component | Status |
|-----------|--------|
| Core Features | ✅ 97% |
| WaveMesh | ✅ 95% |
| E2E Encryption | ✅ 95% |
| i18n | ✅ 95% |
| Backend | ✅ 95% |
| Mobile | ✅ 92% |
| Payments | ⏳ 50% (needs US LLC) |
| Legal | ⏳ 0% |
| Launch Prep | ⏳ 0% |

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) — UI framework
- [Django](https://djangoproject.com/) — Backend
- [Capacitor](https://capacitorjs.com/) — Native bridge
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Lucide](https://lucide.dev/) — Icons
- [Framer Motion](https://www.framer.com/motion/) — Animations

---

<div align="center">

**Built with 💚 for a world where connection doesn't require permission.**

*Sasl — Social Asynchronous Sharing Layer*

</div>
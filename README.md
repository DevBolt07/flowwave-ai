# FlowWave AI - Smart Traffic Management & Optimization System (Monorepo)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Vite Version](https://img.shields.io/badge/vite-5.4.19-purple.svg)](#)
[![React Version](https://img.shields.io/badge/react-18.3.1-blue.svg)](#)

FlowWave AI is a state-of-the-art, production-ready Smart Traffic Management and Optimization System. It integrates real-time video feed analysis (simulated AI detection), automatic Green Signal Time (GST) optimization using dynamic traffic density calculations, and emergency vehicle priority corridor routing ("Green Waves") to minimize delays and emergency response times.

This project is organized as an **npm Workspaces Monorepo** separating the **Frontend React application** and the **Backend Node.js Express server**.

---

## 🌟 Key Features

*   **🚦 Intelligent Signal Control**: Dynamic Green Signal Time (GST) calculation based on real-time vehicle density queues, adapting signal timings dynamically rather than relying on fixed timers.
*   **🚨 Emergency Priority Corridor (Green Wave)**: Real-time routing for emergency vehicles (ambulances, fire trucks) with on-demand preemption that turns downstream signals green along the route.
*   **📹 Live AI Video Analysis**: Virtual bounding box overlay simulating YOLOv8/RT-DETR inference on multi-lane intersection cameras.
*   **👥 Role-Based Portals**:
    *   **Citizen Dashboard**: Public map viewing of city-wide statistics, active emergency corridors, and intersection health cards.
    *   **Traffic Authority Dashboard**: Live intersection video control, vehicle queue inspection, manual signal overrides, and GST configurations.
    *   **Emergency Driver Dashboard**: Ambulance request system, destination routing, dynamic distance/ETA calculations, and priority corridor trigger.
*   **⚡ Real-Time Sync**: Driven by Supabase Realtime replication to push signal states, vehicle counts, and emergency logs across all client views instantly.

---

## 🛠️ Monorepo Structure & Tech Stack

The project contains two main workspaces:

1.  **`frontend/`**: Vite React + TypeScript client.
    *   **Styling**: Tailwind CSS & Shadcn UI (built on Radix UI primitives)
    *   **Mapping & Routing**: Leaflet (via React-Leaflet) & OpenStreetMap (OSRM API)
    *   **State Management**: React Query (TanStack Query v5) & React Context
2.  **`backend/`**: Node.js Express + TypeScript server placeholder for API extensions.
3.  **`supabase/`**: Supabase migrations, edge functions, and consolidated SQL schema.

---

## ⚙️ Prerequisites

Before setting up the project, make sure you have:
*   [Node.js](https://nodejs.org/) (v18.0.0 or higher)
*   [npm](https://www.npmjs.com/) (v9.0.0 or higher)
*   A [Supabase](https://supabase.com/) account and project configured

---

## 🚀 Setup & Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/DevBolt07/flowwave-ai.git
    cd flowwave-ai
    ```

2.  **Install Monorepo Workspaces Dependencies**:
    Run `npm install` in the **root** folder. This automatically resolves packages for both frontend and backend subfolders and links them:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    *   **Frontend**: Copy `frontend/.env.example` to `frontend/.env` and fill in your Supabase variables.
        ```bash
        cp frontend/.env.example frontend/.env
        ```
    *   **Backend**: Copy `backend/.env.example` to `backend/.env` and fill in your API parameters.
        ```bash
        cp backend/.env.example backend/.env
        ```

4.  **Database Migration & Seeding**:
    Make sure your Supabase project is active. You can apply the migrations using the Supabase CLI, or copy and execute the consolidated [`supabase/schema.sql`](./supabase/schema.sql) file directly inside the Supabase SQL editor.
    
    To seed the database with mock intersections and ambulance node coordinates:
    ```bash
    npm run seed -w frontend
    ```
    *(Note: Ensure frontend environment variables are configured in `frontend/.env` before running the seed script).*

---

## 🏃 How to Run

### Development Mode (Concurrent)
To launch **both** the frontend React app and the backend Express server concurrently with a single command from the root:
```bash
npm run dev
```

Alternatively, you can run them individually:
```bash
# Run only the frontend
npm run dev:frontend

# Run only the backend
npm run dev:backend
```

### Production Build & Preview (Frontend)
```bash
# Compile frontend production bundle
npm run build

# Preview frontend production build locally
npm run preview
```

### Code Linting
```bash
# Scan frontend files for ESLint / TypeScript rule violations
npm run lint
```

---

## 📁 Folder Structure Overview

```
flowwave-ai/
├── frontend/                  # React Frontend App
│   ├── public/                # Public static assets
│   ├── src/                   # React components, pages, hooks, and routing
│   │   ├── components/        # Reusable React components (ui/, MapView.tsx, etc.)
│   │   ├── contexts/          # Contexts (AuthContext.tsx)
│   │   ├── hooks/             # Custom React Hooks
│   │   ├── integrations/      # Supabase Client client.ts
│   │   ├── lib/               # Mathematical helpers and routing utilities
│   │   ├── pages/             # Auth.tsx, Index.tsx, NotFound.tsx
│   │   └── scripts/           # Data seeding files
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/                   # Node.js Express Backend
│   ├── src/                   # Server logic files (index.ts)
│   ├── package.json
│   └── tsconfig.json
├── supabase/                  # Supabase Configurations
│   ├── migrations/            # SQL migration files
│   ├── functions/             # Deno Edge Functions
│   └── schema.sql             # Consolidated Database Setup SQL Script
├── package.json               # Root Workspace Coordinator package.json
└── README.md
```

---

## 🤝 Contributing

Contributions to FlowWave AI are highly welcomed! Please consult [CONTRIBUTING.md](./CONTRIBUTING.md) for project guidelines, branch naming structures, and coding standards.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

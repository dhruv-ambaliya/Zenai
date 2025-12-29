# Zenai Prototype

A Vite + React admin/installer dashboard backed by a lightweight Express API with JSON storage.

## Project Structure
- Frontend: [src/](src) (entry: [src/main.jsx](src/main.jsx), routing: [src/App.jsx](src/App.jsx))
- Server: [server/server.js](server/server.js) with routes:
  - Auth: [server/routes/authRoutes.js](server/routes/authRoutes.js)
  - Displays: [server/routes/displayRoutes.js](server/routes/displayRoutes.js)
  - Ads: [server/routes/adRoutes.js](server/routes/adRoutes.js)
  - Groups: [server/routes/groupRoutes.js](server/routes/groupRoutes.js)
  - Uploads: [server/routes/uploadRoutes.js](server/routes/uploadRoutes.js)

## Requirements
- Node.js 18+
- npm

## Setup
1) Install frontend deps:
```sh
npm install
```
2) Install server deps:
```sh
cd server
npm install
```

## Run (Dev)
In one terminal (API):
```sh
cd server
npm run dev
```
In another (frontend):
```sh
npm run dev
```
- Frontend: http://localhost:5173
- API: http://localhost:3001

## Build (Frontend)
```sh
npm run build
```

## Default Users
- Admin: `admin` / `adminpassword123`
- Installers seeded in [server/data/users.json](server/data/users.json)

## Notes
- Uploads are stored under [server/uploads](server/uploads) and served via `/uploads`.
- Generated IDs follow patterns in [server/utils/idGenerator.js](server/utils/idGenerator.js).
- Sample data lives in [server/data/](server/data).
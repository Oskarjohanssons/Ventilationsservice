# Ventilationsservice Web

React- och TypeScript-gränssnitt för Ventilationsservice API.

## Starta lokalt

Starta först API:t från projektroten i en annan terminal:

```powershell
dotnet run --project src/Ventilationsservice.Api
```

Installera frontendens paket och starta Vite från den här mappen:

```powershell
npm install
npm run dev
```

Öppna adressen som Vite visar, vanligtvis `http://localhost:5173`. Vite proxar `/api` till API:t på `http://localhost:5116`.

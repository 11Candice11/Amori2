# Amori

A private couples application for iOS and Android.

## Project Structure

| Directory   | Purpose |
|-------------|---------|
| `ios/`      | Native iOS project (React Native managed) |
| `android/`  | Native Android project (React Native managed) |
| `src/`      | React Native / TypeScript mobile application |
| `backend/`  | ASP.NET Core Web API (C#) |
| `shared/`   | API contracts shared between frontend and backend |
| `tests/`    | Mobile and backend test suites |
| `docs/`     | Architecture, API, database, and feature documentation |

## Tech Stack

- **Mobile:** React Native + TypeScript
- **Backend:** C# / ASP.NET Core Web API / Entity Framework Core / PostgreSQL
- **Cloud:** AWS (S3, Push Notifications, SignalR)

## Getting Started

See `docs/architecture/README.md` for the project structure and `DEVELOPER_GUIDE.md` for deploying (`./deploy.sh api|ios|android|all`), push notification setup, widgets, backgrounds and badge UI.

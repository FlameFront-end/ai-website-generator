# ИИ-генератор сайтов

Визуальный прототип для генерации референса первого экрана, клиентского кода, скриншотов и отчета визуальной проверки по пользовательскому брифу.

## Стек

- `app/client`: React, TypeScript, Vite
- `app/server`: NestJS, TypeScript
- Локальные сервисы: PostgreSQL и Redis через Docker Compose

## Локальный запуск

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev:server
npm run dev:client
```

## Проверки

```bash
npm run build
```

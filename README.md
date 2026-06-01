# Caltext

iMessage calorie tracking assistant powered by AI.

## Stack

- **Runtime**: Bun + Turborepo monorepo
- **API**: Hono on Nitro (deployed to Vercel, 3 regions)
- **iMessage**: Chat SDK + Sendblue adapter
- **AI**: AI SDK v6 + GPT-4.1 (vision + agent)
- **Database**: Upstash Redis (global, 3 regions)
- **Workflows**: Vercel Workflow SDK for durable pipelines
- **Nutrition**: USDA FoodData Central API

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required keys:

| Variable | Source |
|---|---|
| `SENDBLUE_API_KEY` / `SENDBLUE_API_SECRET` | [sendblue.co](https://sendblue.co) |
| `SENDBLUE_FROM_NUMBER` | Your Sendblue phone number |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | [console.upstash.com](https://console.upstash.com) |
| `REDIS_URL` | Same Upstash Redis in `redis://` format |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |
| `USDA_API_KEY` | [fdc.nal.usda.gov](https://fdc.nal.usda.gov/api-key-signup.html) (free) |

### 3. Run locally

```bash
bun run dev
```

### 4. Deploy to Vercel

```bash
vercel deploy
```

Deploys to 3 regions: US East (iad1), London (lhr1), Tokyo (hnd1).

### 5. Set Sendblue webhook

Point your Sendblue incoming message webhook to:

```
https://your-app.vercel.app/webhooks/sendblue
```

## Project Structure

```
caltext/
  apps/
    api/                  # Hono API server
      src/
        index.ts          # Routes + webhook handler
        bot.ts            # Chat SDK singleton
        router.ts         # Onboarding vs assistant routing
      workflows/
        handle-message.ts # Main message handler
        onboarding.ts     # Multi-step onboarding
        reminder-loop.ts  # Daily reminders + summaries
  packages/
    ai/                   # AI agent + tools
    db/                   # Upstash Redis data layer
    shared/               # Types, locale, timezone utils
```

## How It Works

1. User texts the Caltext number via iMessage
2. Sendblue forwards the message via webhook
3. New users go through conversational onboarding (name, stats, goal)
4. Returning users interact with the AI assistant
5. Photos are analyzed with GPT-4.1 vision, then grounded in USDA nutrition data
6. Text descriptions are matched against USDA database directly
7. Daily reminders at breakfast/lunch/dinner times (timezone-aware)
8. End-of-day summaries with calorie/macro breakdown
9. Weekly recaps with progress bars and trends

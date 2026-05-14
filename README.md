# Nistula Guest Message Handler - Part 1

Backend service for handling inbound guest messages from multiple channels, normalizing them into a unified schema, drafting a reply with Claude, and returning a confidence score with an action.

Note: Detailed thinking and design rationale are documented inline in the individual source files as code comments.

## Title
Nistula Guest Message Handler (Express + Claude)

## Architecture / Flow
Current flow in code:

1. `POST /webhook/message` receives raw payload.
2. `validator.js` validates required fields and allowed `source` values.
3. `normalizer.js` converts payload into unified schema:
   - generates `message_id`
   - maps `message -> message_text`
   - ensures `timestamp` is always ISO (fallback to current time)
4. `queryTypeAssigner.js` assigns `query_type` using keyword heuristics.
5. `aiService.js` sends message + assigned query type + fixed property context to Claude (`claude-sonnet-4-20250514`) and gets `drafted_reply`.
6. `confidence.js` computes `confidence_score` using rule-based logic.
7. `confidence.js` decides action:
   - `auto_send`
   - `agent_review`
   - `escalate`
8. Route returns final response JSON.

## Setup and Run
1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Add key in `.env`:
```env
ANTHROPIC_API_KEY=your_key_here
PORT=3000
```

4. Start server:
```bash
npm run dev
```
or
```bash
npm start
```

5. Health check:
```bash
GET http://localhost:3000/health
```

## Pipeline Test Script
Run the end-to-end pipeline tests:

```bash
npm run test:pipeline
```

This runs 3 assignment-style cases:
- availability/pricing
- post-sales check-in
- complaint

## Current Confidence Scoring Logic
Implemented in `src/services/confidence.js`.

Asking an AI to assign a confidence score to its own response is widely considered unreliable and misleading because Large Language Models (LLMs) are optimized for fluency and statistical probability, not factual accuracy
I used a rule based scoring 

### 1. Base score by query type
- `pre_sales_availability`: `0.92`
- `pre_sales_pricing`: `0.92`
- `post_sales_checkin`: `0.90`
- `special_request`: `0.72`
- `general_enquiry`: `0.68`
- `complaint`: `0.40`
- fallback for unknown: `0.60`

### 2. Hard complaint rule
If `query_type === complaint`, score is immediately `0.40` and action will be `escalate`.

### 3. Penalties
Applied to reduce risk:
- uncertain language in drafted reply (`maybe`, `perhaps`, `let me check`, etc): `-0.12`
- Escalation language in message or reply (`refund`, `legal`, `unsafe`, etc): `-0.25`
- Unsupported promises in reply (`free upgrade`, `discount`, etc): `-0.30`
- Security penalty: if `post_sales_checkin` and no `booking_ref`, but reply contains `wifi/password`: `-0.50`
- Long/complex incoming message (`message_text.length > 250`): `-0.10`

### 4. Caps
- `special_request` capped at `0.84`
- `general_enquiry` capped at `0.84`

### 5. Finalization
- Clamp to `[0, 1]`
- Round to 2 decimals

### 6. Action mapping
- If `query_type === complaint` -> `escalate`
- Else if score `>= 0.85` -> `auto_send`
- Else if score `>= 0.60` -> `agent_review`
- Else -> `escalate`

## Query Type Assignment (Current)
Implemented in `src/services/queryTypeAssigner.js` using regex keyword scoring.

If multiple intents tie, priority order is:
1. `complaint`
2. `special_request`
3. `pre_sales_pricing`
4. `pre_sales_availability`
5. `post_sales_checkin`
6. `general_enquiry`

If no intent matches, default is `general_enquiry`.

## Note on LLM Testing
Claude API usage limit was exceeded during implementation. I was able to run only one live Claude API call; further end-to-end testing against Claude could not be completed in this submission window.
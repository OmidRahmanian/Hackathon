## AI Coach Endpoint (Local LLM Friendly)

This project ships a `/api/coach` endpoint that prefers a local Ollama model and falls back to a deterministic response so demos never break.

### Quick start
1. Install deps: `npm install`
2. Copy env file: `Copy-Item env.example .env.local` (PowerShell)  
   - `LOCAL_LLM_URL` defaults to `http://127.0.0.1:11434`  
   - `LOCAL_LLM_MODEL` defaults to `llama3.2`
3. Pull/start Ollama model (in another terminal):
   - `ollama pull llama3.2`
   - `ollama serve` (if Ollama isn't already running)
4. Run Next.js dev server: `npm run dev`
5. Test the endpoint (PowerShell):
   ```powershell
   Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/coach `
     -ContentType 'application/json' `
     -Body (@{
       question = "My neck hurts after long coding sessions."
       summary = @{
         worstPostureType = "slouching"
         averageScore = 72
         tooCloseCount = 3
       }
     } | ConvertTo-Json -Depth 5)
   ```

### What the endpoint does
- `POST /api/coach` (edge runtime) accepts `{ question: string, summary?: object|string }`.
- Calls Ollama chat at `${LOCAL_LLM_URL}/api/chat` with the `LOCAL_LLM_MODEL`.
- Returns plain-text response with exactly:
  1) What is happening  
  2) 3 actionable fixes  
  3) 2-week improvement plan (Week 1, Week 2)
- If Ollama is unreachable or empty, it returns a built-in high-quality fallback that still references provided summary details when available.

### Optional GET
- `GET /api/coach` returns `{ "message": "Use POST" }` to avoid 405s in the browser.

'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { aiDefaultPrompts, initialStats } from '@/lib/data/mock-data';
import { ChatMessage } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function AICoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const helperText = useMemo(
    () =>
      'I can answer posture, productivity, and desk setup questions. For medical pain, consult a clinician.',
    []
  );
  const coachSummary = useMemo(() => {
    const averageScore = Math.max(
      0,
      Math.round(
        100 -
          initialStats.badPostureTimeline.reduce((sum, value) => sum + value, 0) /
            initialStats.badPostureTimeline.length
      )
    );

    const topActivity = [...initialStats.activities].sort((a, b) => b.hours - a.hours)[0];

    return {
      worstPostureType: 'Slouching',
      averageScore,
      timeframe: initialStats.timeframeLabel,
      badPostureCount: initialStats.badPostureCount,
      topActivity: topActivity ? `${topActivity.name} (${topActivity.hours}h)` : 'N/A'
    };
  }, []);

  const onAsk = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMessage: ChatMessage = { id: `${Date.now()}-u`, role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          summary: coachSummary
        })
      });

      if (!response.ok) {
        throw new Error(`Coach API failed (${response.status})`);
      }

      const answer = (await response.text()).trim();
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        text:
          answer ||
          `I could not generate a response for "${text}" right now. Please try again.`
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        text:
          'Could not reach the local AI coach. Make sure Ollama and the coach API are running, then try again.'
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(0,255,65,0.35)]" />
          <h1 className="text-2xl font-semibold">AI Posture Coach</h1>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-sm border border-white/10 bg-black/45 p-4">
            <p className="text-sm font-semibold">Default Insight 1</p>
            <p className="mt-1 text-sm soft-text">{aiDefaultPrompts[0]}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-black/45 p-4">
            <p className="text-sm font-semibold">Default Insight 2</p>
            <p className="mt-1 text-sm soft-text">{aiDefaultPrompts[1]}</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold">Ask anything</p>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-sm px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'ml-10 border border-[var(--accent)] bg-[var(--accent)] font-mono text-black'
                  : 'mr-10 whitespace-pre-wrap border border-white/10 bg-black/50'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="mb-1 flex items-center gap-1 text-xs soft-text">
                  <Bot className="h-3 w-3" /> Coach
                </div>
              ) : null}
              {message.text}
            </div>
          ))}
          {loading ? <div className="text-sm soft-text">AI is thinking...</div> : null}
        </div>

        <form onSubmit={onAsk} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about posture, desk setup, routine..."
          />
          <Button type="submit">Ask</Button>
        </form>
        <p className="mt-2 text-xs soft-text">{helperText}</p>
      </Card>
    </div>
  );
}

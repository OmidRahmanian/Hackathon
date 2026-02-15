'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatMessage } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/features/auth-provider';

const LOCALHOST_URL_ONLY_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;

function isInvalidCoachResponse(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (LOCALHOST_URL_ONLY_PATTERN.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();
  return lower.startsWith('<!doctype html') || lower.startsWith('<html');
}

export function AICoachPage() {
  const { userEmail } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [weeklyRecommendation, setWeeklyRecommendation] = useState<string | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [recommendationGeneratedAt, setRecommendationGeneratedAt] = useState<string | null>(null);

  const helperText = 'Ask any question. The coach is not limited to posture topics.';
  const activeUserId = useMemo(() => userEmail?.trim().toLowerCase() || 'demo', [userEmail]);

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.text,
    [messages]
  );

  useEffect(() => {
    let cancelled = false;

    const loadRecommendation = async () => {
      try {
        setRecommendationLoading(true);
        setRecommendationError(null);

        const params = new URLSearchParams({ userId: activeUserId });
        const response = await fetch(`/api/coach/recommendation?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Recommendation API failed (${response.status})`);
        }

        const data = (await response.json()) as {
          recommendation?: string;
          generatedAt?: string | null;
          hasData?: boolean;
        };

        if (cancelled) return;

        const recommendationText =
          typeof data.recommendation === 'string' && data.recommendation.trim()
            ? data.recommendation.trim()
            : null;

        setWeeklyRecommendation(recommendationText);
        setRecommendationGeneratedAt(
          typeof data.generatedAt === 'string' && data.generatedAt.trim()
            ? data.generatedAt
            : null
        );
      } catch (error) {
        if (cancelled) return;
        console.error('Weekly recommendation fetch failed:', error);
        setRecommendationError('Unable to load weekly recommendation right now.');
      } finally {
        if (!cancelled) {
          setRecommendationLoading(false);
        }
      }
    };

    void loadRecommendation();
    const interval = window.setInterval(() => {
      void loadRecommendation();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeUserId]);

  const recommendationText = useMemo(() => {
    if (recommendationLoading && !weeklyRecommendation) {
      return 'Building your weekly recommendation from your profile and monitoring history...';
    }

    if (weeklyRecommendation) {
      return weeklyRecommendation;
    }

    if (recommendationError) {
      return recommendationError;
    }

    return 'No monitoring data yet. Start your first monitoring session and this panel will show your weekly AI recommendation.';
  }, [recommendationLoading, weeklyRecommendation, recommendationError]);

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
          userId: activeUserId
        })
      });

      if (!response.ok) {
        throw new Error(`Coach API failed (${response.status})`);
      }

      const answer = (await response.text()).trim();
      if (isInvalidCoachResponse(answer)) {
        throw new Error('Coach API returned an invalid text payload.');
      }

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        text:
          answer ||
          `I could not generate a response for "${text}" right now. Please try again.`
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('invalid text payload')
          ? 'Coach returned an invalid response. Restart `npm run dev` and try again.'
          : 'Could not reach the local AI coach. Make sure Ollama and the coach API are running, then try again.';
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        text: message
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative xl:h-[calc(100dvh-9rem)] xl:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute -right-16 bottom-4 h-64 w-64 rounded-full bg-[var(--accent-3)]/10 blur-3xl" />
      </div>

      <div className="relative grid gap-5 xl:h-full xl:grid-cols-2 xl:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="xl:h-full"
        >
          <Card className="tech-card relative flex h-full flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>

            <div className="relative flex h-full flex-col">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                <h1 className="hud-title text-xl">Ask Me Anything</h1>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="rounded-sm border border-dashed border-white/15 bg-black/35 p-4">
                    <p className="text-xs soft-text">No messages yet</p>
                    <p className="mt-2 text-sm text-[var(--text)]">
                      Ask your first question to start a conversation with the coach.
                    </p>
                  </div>
                ) : null}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-sm px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'ml-10 border border-[var(--accent)] bg-[var(--accent)] font-mono text-black'
                        : 'mr-10 whitespace-pre-wrap border border-white/10 bg-black/50 text-[var(--text)]'
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
                  placeholder="Ask anything..."
                />
                <Button type="submit">Ask</Button>
              </form>
              <p className="mt-2 text-xs soft-text">{helperText}</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="xl:h-full"
        >
          <Card className="tech-card relative h-full overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>

            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="hud-title text-xl">AI Recommendations</h2>
              </div>
              <p className="mt-1 soft-text">Smart guidance to help structure better work sessions.</p>

              <div className="mt-5 flex-1 rounded-sm border border-white/10 bg-black/45 p-6">
                <p className="text-sm leading-relaxed text-[var(--text)]">{recommendationText}</p>
                {recommendationGeneratedAt ? (
                  <p className="mt-3 text-xs soft-text">
                    Generated: {new Date(recommendationGeneratedAt).toLocaleString()}
                  </p>
                ) : null}
                {lastUserMessage ? (
                  <p className="mt-2 text-xs soft-text">Latest question: "{lastUserMessage}"</p>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

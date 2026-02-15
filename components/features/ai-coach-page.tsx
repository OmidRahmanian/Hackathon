'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Bot, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatMessage } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const LOCALHOST_URL_ONLY_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;

function isInvalidCoachResponse(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (LOCALHOST_URL_ONLY_PATTERN.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();
  return lower.startsWith('<!doctype html') || lower.startsWith('<html');
}

export function AICoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showRecommendationScrollButton, setShowRecommendationScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const recommendationContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const updateScrollButton = () => {
      const overflow = container.scrollHeight > container.clientHeight + 8;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollButton(overflow && distanceFromBottom > 36);
    };

    updateScrollButton();
    container.addEventListener('scroll', updateScrollButton);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollButton) : null;
    resizeObserver?.observe(container);

    const rafId = window.requestAnimationFrame(updateScrollButton);

    return () => {
      window.cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', updateScrollButton);
      resizeObserver?.disconnect();
    };
  }, [messages, loading]);

  const scrollToLatest = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  const helperText = 'Ask any question. The coach is not limited to posture topics.';

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.text,
    [messages]
  );

  const recommendationText = useMemo(() => {
    if (!lastUserMessage) {
      return 'The AI recommendation engine will generate personalized guidance based on your activity and recent prompts. Start by asking a question in the panel on the left, then use those insights to improve your posture habits and daily workflow consistency.';
    }

    const promptPreview = lastUserMessage.slice(0, 120);
    const suffix = lastUserMessage.length > 120 ? '...' : '';
    return `Based on your latest prompt ("${promptPreview}${suffix}"), focus on one practical change for your next session, keep your setup ergonomic, and re-check posture every 25 minutes. Use this as your single action plan for the current cycle.`;
  }, [lastUserMessage]);

  useEffect(() => {
    const container = recommendationContainerRef.current;
    if (!container) return;

    const updateRecommendationScrollButton = () => {
      const overflow = container.scrollHeight > container.clientHeight + 8;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowRecommendationScrollButton(overflow && distanceFromBottom > 36);
    };

    updateRecommendationScrollButton();
    container.addEventListener('scroll', updateRecommendationScrollButton);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateRecommendationScrollButton)
        : null;
    resizeObserver?.observe(container);

    const rafId = window.requestAnimationFrame(updateRecommendationScrollButton);

    return () => {
      window.cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', updateRecommendationScrollButton);
      resizeObserver?.disconnect();
    };
  }, [recommendationText]);

  const scrollRecommendationToLatest = () => {
    const container = recommendationContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

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
          question: text
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

              <div className="relative flex-1">
                <div ref={messagesContainerRef} className="h-full space-y-3 overflow-y-auto pr-1">
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

                {showScrollButton ? (
                  <button
                    type="button"
                    onClick={scrollToLatest}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-sm border border-[var(--accent)]/70 bg-black/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:shadow-[0_0_12px_rgba(0,255,65,0.28)]"
                  >
                    <ArrowDown className="h-3 w-3" /> Scroll
                  </button>
                ) : null}
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

              <div className="relative mt-5 flex-1">
                <div
                  ref={recommendationContainerRef}
                  className="h-full overflow-y-auto rounded-sm border border-white/10 bg-black/45 p-6 pr-8"
                >
                  <p className="text-sm leading-relaxed text-[var(--text)]">{recommendationText}</p>
                </div>

                {showRecommendationScrollButton ? (
                  <button
                    type="button"
                    onClick={scrollRecommendationToLatest}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-sm border border-[var(--accent)]/70 bg-black/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:shadow-[0_0_12px_rgba(0,255,65,0.28)]"
                  >
                    <ArrowDown className="h-3 w-3" /> Scroll
                  </button>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

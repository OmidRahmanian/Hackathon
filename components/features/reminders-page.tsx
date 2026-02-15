'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BellPlus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { defaultReminders } from '@/lib/data/mock-data';
import { ReminderItem } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type IntervalOption = {
  label: string;
  seconds: number;
};

const baseIntervalOptions: IntervalOption[] = [
  { label: '10 sec', seconds: 10 },
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 5 * 60 },
  { label: '10 min', seconds: 10 * 60 },
  { label: '15 min', seconds: 15 * 60 },
  { label: '20 min', seconds: 20 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
  { label: '90 min', seconds: 90 * 60 },
  { label: '120 min', seconds: 120 * 60 }
];

export function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderItem[]>(defaultReminders);
  const [customLabel, setCustomLabel] = useState('');
  const [customIntervalInput, setCustomIntervalInput] = useState('');
  const [editingIntervalForId, setEditingIntervalForId] = useState<string | null>(null);
  const [customIntervalOptions, setCustomIntervalOptions] = useState<IntervalOption[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [activePopupMessage, setActivePopupMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | 'unsupported'>('default');
  const timerHandlesRef = useRef<Map<string, number>>(new Map());
  const popupTimeoutRef = useRef<number | null>(null);

  const enabledReminderCount = useMemo(
    () => reminders.filter((item) => item.enabled).length,
    [reminders]
  );
  const intervalOptions = useMemo(() => {
    const deduped = new Map<number, IntervalOption>();
    [...baseIntervalOptions, ...customIntervalOptions].forEach((option) => {
      deduped.set(option.seconds, option);
    });
    return Array.from(deduped.values()).sort((a, b) => a.seconds - b.seconds);
  }, [customIntervalOptions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    setNotificationPermission(window.Notification.permission);
  }, []);

  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current !== null) {
        window.clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const clearAllTimers = () => {
      timerHandlesRef.current.forEach((handle) => window.clearInterval(handle));
      timerHandlesRef.current.clear();
    };

    const speakReminder = (message: string) => {
      if (!('speechSynthesis' in window)) return;

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    const showPopup = (message: string) => {
      setActivePopupMessage(message);
      if (popupTimeoutRef.current !== null) {
        window.clearTimeout(popupTimeoutRef.current);
      }
      popupTimeoutRef.current = window.setTimeout(() => {
        setActivePopupMessage(null);
      }, 12000);
    };

    const triggerReminder = (item: ReminderItem) => {
      const message = `Reminder: ${item.label}`;
      setStatus(message);

      if (notificationPermission === 'granted' && 'Notification' in window) {
        new Notification('SAURON Reminder', {
          body: item.label
        });
      }

      showPopup(item.label);
      speakReminder(message);
    };

    clearAllTimers();

    reminders.forEach((item) => {
      if (!item.enabled) return;
      const intervalMs = Math.max(10, item.intervalSeconds) * 1000;
      const handle = window.setInterval(() => {
        triggerReminder(item);
      }, intervalMs);

      timerHandlesRef.current.set(item.id, handle);
    });

    return clearAllTimers;
  }, [notificationPermission, reminders]);

  const requestNotificationAccess = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      setStatus('Browser notifications are not supported in this browser.');
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== 'granted') {
      setStatus('Notifications blocked. You will still get spoken reminders while this tab is open.');
    } else {
      setStatus('Notifications enabled successfully.');
    }
  };

  const toggleReminder = (id: string) => {
    const current = reminders.find((item) => item.id === id);
    const enabling = Boolean(current && !current.enabled);

    setReminders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );

    if (
      enabling &&
      notificationPermission === 'default' &&
      typeof window !== 'undefined' &&
      'Notification' in window
    ) {
      void requestNotificationAccess();
    }
  };

  const updateReminderInterval = (id: string, intervalSeconds: number) => {
    setReminders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, intervalSeconds } : item))
    );
  };

  const openIntervalEditor = (id: string) => {
    setEditingIntervalForId(id);
    setCustomIntervalInput('');
  };

  const addCustomIntervalOption = (id: string) => {
    const parsedMinutes = Number.parseInt(customIntervalInput, 10);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      setStatus('Enter a valid number of minutes greater than 0.');
      return;
    }

    const seconds = parsedMinutes * 60;
    const label = `${parsedMinutes} min`;

    setCustomIntervalOptions((prev) => {
      if (prev.some((option) => option.seconds === seconds)) {
        return prev;
      }
      return [...prev, { label, seconds }];
    });

    updateReminderInterval(id, seconds);
    setCustomIntervalInput('');
    setEditingIntervalForId(null);
    setStatus(`Added ${label} to the interval options.`);
  };

  const addCustomReminder = () => {
    const label = customLabel.trim();
    if (!label) return;

    setReminders((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label,
        enabled: true,
        intervalSeconds: 30 * 60,
        custom: true
      }
    ]);
    setCustomLabel('');
  };

  return (
    <>
      <div className="relative xl:h-[calc(100dvh-9rem)] xl:overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[var(--accent)]/10 blur-3xl" />
          <div className="absolute -right-16 bottom-4 h-64 w-64 rounded-full bg-[var(--accent-3)]/10 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="relative h-full"
        >
          <Card className="tech-card relative h-full w-full max-w-none overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.09),transparent_45%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
            </div>

            <div className="relative flex h-full min-h-0 flex-col">
              <div className="flex items-center gap-2">
                <BellPlus className="h-5 w-5 text-[var(--accent)]" />
                <h1 className="hud-title text-xl">Reminder Settings</h1>
              </div>
              <p className="mt-1 text-xs font-mono uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Enable reminders you want to receive and add your own custom reminders.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={requestNotificationAccess}>
                  Enable Notifications
                </Button>
                <p className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Active reminders: {enabledReminderCount} | Permission:{' '}
                  {notificationPermission === 'unsupported' ? 'unsupported' : notificationPermission}
                </p>
              </div>

              <div className="mt-5 flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="space-y-3">
                  {reminders.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={item.enabled ? undefined : { y: -2 }}
                      whileTap={{ scale: 0.998 }}
                      transition={{
                        duration: 0.14,
                        ease: 'easeOut',
                        delay: Math.min(index * 0.03, 0.18)
                      }}
                      className={`relative flex flex-col gap-3 rounded-sm border px-4 py-3 transition-all duration-75 sm:flex-row sm:items-center sm:justify-between ${
                        item.enabled
                          ? 'border-[var(--accent)]/45 bg-black/50 shadow-[0_0_14px_rgba(0,255,65,0.18)] hover:shadow-[0_0_18px_rgba(0,255,65,0.26)] hover:border-[var(--accent)]/65'
                          : 'border-white/10 bg-black/45 hover:shadow-[0_0_18px_rgba(0,255,65,0.26)] hover:border-[var(--accent)]/65'
                      }`}
                    >
                      <div>
                        <p className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text)]">
                          {item.label}
                        </p>
                        {item.custom ? (
                          <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--text-soft)]">
                            Custom reminder
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2 sm:min-w-[23rem]">
                        <div className="flex w-full items-center justify-end gap-2">
                          <label className="flex min-w-0 flex-1 items-center justify-end gap-2">
                            <span className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--text-soft)]">
                              Every
                            </span>
                            <select
                              value={item.intervalSeconds}
                              onChange={(event) =>
                                updateReminderInterval(item.id, Number(event.target.value))
                              }
                              className="w-[122px] rounded-sm border border-white/15 bg-black/70 px-2 py-1 text-xs font-mono uppercase tracking-[0.08em] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                            >
                              {intervalOptions.map((option) => (
                                <option key={option.seconds} value={option.seconds}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button
                            variant="secondary"
                            className="h-7 px-2 py-1"
                            onClick={() => openIntervalEditor(item.id)}
                            aria-label={`Add custom interval for ${item.label}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.enabled}
                            aria-label={`Toggle ${item.label}`}
                            onClick={() => toggleReminder(item.id)}
                            className={`relative h-7 w-12 rounded-sm border transition-colors duration-75 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${
                              item.enabled ? 'border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_10px_rgba(0,255,65,0.25)]' : 'border-white/20 bg-black/70'
                            }`}
                          >
                            <span
                              className={`absolute left-1 top-1 h-5 w-5 rounded-sm border border-white/30 bg-[#eee] transition-transform duration-75 ${item.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                          </button>
                        </div>
                        {editingIntervalForId === item.id ? (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2"
                          >
                            <Input
                              value={customIntervalInput}
                              onChange={(event) => setCustomIntervalInput(event.target.value)}
                              placeholder="Minutes"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="h-7 w-full"
                            />
                            <Button className="h-7 px-3 py-1" onClick={() => addCustomIntervalOption(item.id)}>Add</Button>
                            <Button
                              variant="ghost"
                              className="h-7 px-3 py-1"
                              onClick={() => {
                                setEditingIntervalForId(null);
                                setCustomIntervalInput('');
                              }}
                            >
                              Cancel
                            </Button>
                          </motion.div>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.16 }}
                  className="mt-6 rounded-sm border border-white/10 bg-black/45 p-4"
                >
                  <p className="mb-3 hud-label">Add Personalized Reminder</p>
                  <div className="flex gap-2">
                    <Input
                      value={customLabel}
                      onChange={(event) => setCustomLabel(event.target.value)}
                      placeholder="Example: Sit upright every 30 min"
                    />
                    <Button onClick={addCustomReminder}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>

                {status ? (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-xs font-mono uppercase tracking-[0.12em] text-[var(--text-soft)]"
                  >
                    {status}
                  </motion.p>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <AnimatePresence>
        {activePopupMessage ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="tech-card relative w-full max-w-xl overflow-hidden rounded-sm border border-[var(--accent)] bg-black/85 p-6 text-center shadow-[0_0_24px_rgba(0,255,65,0.25)]"
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-35">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,65,0.15),transparent_45%)]" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,rgba(255,255,255,0.03)_16px)]" />
              </div>

              <div className="relative">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Reminder Alert</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{activePopupMessage}</p>
                <p className="mt-2 text-sm font-mono uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  Take a quick action now and keep your posture healthy.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setActivePopupMessage(null)}>Dismiss</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

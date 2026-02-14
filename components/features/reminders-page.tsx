'use client';

import { useState } from 'react';
import { BellPlus, Plus } from 'lucide-react';
import { defaultReminders } from '@/lib/data/mock-data';
import { ReminderItem } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderItem[]>(defaultReminders);
  const [customLabel, setCustomLabel] = useState('');

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
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
        custom: true
      }
    ]);
    setCustomLabel('');
  };

  return (
    <Card className="max-w-3xl">
      <div className="flex items-center gap-2">
        <BellPlus className="h-5 w-5 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(0,255,65,0.35)]" />
        <h1 className="text-2xl font-semibold">Reminder Settings</h1>
      </div>
      <p className="mt-1 text-sm soft-text">Enable reminders you want to receive and add your own custom reminders.</p>

      <div className="mt-5 space-y-3">
        {reminders.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-sm border border-white/10 bg-black/45 px-4 py-3">
            <div>
              <p className="font-mono uppercase tracking-[0.12em]">{item.label}</p>
              {item.custom ? <p className="text-xs soft-text">Custom reminder</p> : null}
            </div>
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
        ))}
      </div>

      <div className="mt-6 rounded-sm border border-white/10 bg-black/45 p-4">
        <p className="mb-3 text-sm font-semibold">Add Personalized Reminder</p>
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
      </div>
    </Card>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, MapPin } from 'lucide-react';

const cities = [
  { name: 'Ahmedabad, Gujarat, India', lat: 23.0225, lng: 72.5714, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Mumbai, Maharashtra, India', lat: 19.0760, lng: 72.8777, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'New Delhi, Delhi, India', lat: 28.6139, lng: 77.2090, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Bangalore, Karnataka, India', lat: 12.9716, lng: 77.5946, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Chennai, Tamil Nadu, India', lat: 13.0827, lng: 80.2707, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Kolkata, West Bengal, India', lat: 22.5726, lng: 88.3639, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Hyderabad, Telangana, India', lat: 17.3850, lng: 78.4867, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Pune, Maharashtra, India', lat: 18.5204, lng: 73.8567, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Jaipur, Rajasthan, India', lat: 26.9124, lng: 75.7873, tz: 'Asia/Kolkata', off: 5.5 },
  { name: 'Surat, Gujarat, India', lat: 21.1702, lng: 72.8311, tz: 'Asia/Kolkata', off: 5.5 },
];

const schema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(80),
  dateOfBirth: z.string().min(1, 'Required'),
  timeOfBirth: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  city: z.string().min(1, 'Pick a city or enter coordinates'),
  ayanamsa: z.enum(['lahiri', 'raman', 'krishnamurti', 'yukteshwar']),
  houseSystem: z.enum(['whole_sign', 'placidus', 'koch', 'equal']),
  chartStyle: z.enum(['north', 'south']),
});
type Form = z.infer<typeof schema>;

const stages = [
  'Computing planetary positions...',
  'Drawing 16 divisional charts...',
  'Running Vimshottari Dasha...',
  'Detecting Yogas & Doshas...',
  'Consulting the Gurus...',
];

export default function NewChart() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);

  const { register, handleSubmit, formState: { errors }, trigger, watch } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { ayanamsa: 'lahiri', houseSystem: 'whole_sign', chartStyle: 'north' },
  });

  const next = async () => {
    const ok = await trigger(['fullName', 'dateOfBirth', 'timeOfBirth']);
    if (ok) setStep(2);
  };

  const onSubmit = async (_data: Form) => {
    setSubmitting(true);
    for (let i = 0; i < stages.length; i++) {
      setStageIdx(i);
      await new Promise(r => setTimeout(r, 700));
    }
    nav('/app/chart/demo');
  };

  if (submitting) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-saffron" />
        <div className="mt-6 text-eyebrow text-brand-saffron">Casting your chart</div>
        <div className="mt-2 font-display text-h2 text-text-primary">{stages[stageIdx]}</div>
        <div className="mx-auto mt-6 h-1 w-64 overflow-hidden rounded-full bg-elevated">
          <motion.div className="h-full bg-brand-saffron"
            animate={{ width: `${((stageIdx + 1) / stages.length) * 100}%` }}
            transition={{ duration: 0.4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron">New chart</div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Cast a Kundli</h1>

      {/* Progress */}
      <div className="mt-8 flex items-center gap-3">
        {[1, 2].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${step >= n ? 'bg-brand-maroon text-primary-foreground' : 'bg-elevated text-text-tertiary'}`}>{n}</div>
            <div className="text-sm text-text-secondary">{n === 1 ? 'Birth details' : 'Place & options'}</div>
            {n === 1 && <div className={`mx-2 h-px flex-1 ${step >= 2 ? 'bg-brand-maroon' : 'bg-hairline-subtle'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="s1" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-5">
              <Field label="Full name" error={errors.fullName?.message}>
                <input {...register('fullName')} className="input" placeholder="As on official records" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date of birth" error={errors.dateOfBirth?.message}>
                  <input type="date" {...register('dateOfBirth')} min="1900-01-01" max="2100-12-31" className="input" />
                </Field>
                <Field label="Time of birth" error={errors.timeOfBirth?.message}>
                  <input type="time" step="1" {...register('timeOfBirth')} className="input" />
                </Field>
              </div>
              <Field label="Gender">
                <div className="flex flex-wrap gap-2">
                  {(['male', 'female', 'other'] as const).map(g => (
                    <label key={g} className="flex cursor-pointer items-center gap-2 rounded-sm border border-hairline-subtle px-3 py-2 text-sm has-[:checked]:border-brand-maroon has-[:checked]:bg-elevated">
                      <input type="radio" value={g} {...register('gender')} className="accent-brand-maroon" />
                      <span className="capitalize">{g}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <div className="rounded-sm border border-hairline-subtle bg-elevated p-3 text-xs text-text-tertiary">
                Don't know your exact time? Birth Time Rectification ships in Phase 2. For now, the chart will use 12:00 noon as a fallback if left blank.
              </div>
            </motion.div>
          ) : (
            <motion.div key="s2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-5">
              <Field label="Place of birth" error={errors.city?.message}>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                  <select {...register('city')} className="input pl-9" defaultValue="">
                    <option value="" disabled>Select a city...</option>
                    {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                {watch('city') && (
                  <div className="mt-2 rounded-sm bg-elevated p-3 font-mono text-xs text-text-tertiary">
                    {(() => {
                      const c = cities.find(x => x.name === watch('city'));
                      return c ? `${c.lat.toFixed(4)}°N, ${c.lng.toFixed(4)}°E · ${c.tz} (UTC+${c.off})` : null;
                    })()}
                  </div>
                )}
              </Field>

              <details className="rounded-sm border border-hairline-subtle">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-text-primary">Advanced settings</summary>
                <div className="space-y-4 border-t border-hairline-subtle p-4">
                  <Field label="Ayanamsa">
                    <select {...register('ayanamsa')} className="input">
                      <option value="lahiri">Lahiri (default)</option>
                      <option value="raman">Raman</option>
                      <option value="krishnamurti">Krishnamurti</option>
                      <option value="yukteshwar">Yukteshwar</option>
                    </select>
                  </Field>
                  <Field label="House system">
                    <select {...register('houseSystem')} className="input">
                      <option value="whole_sign">Whole Sign (default)</option>
                      <option value="placidus">Placidus</option>
                      <option value="koch">Koch</option>
                      <option value="equal">Equal</option>
                    </select>
                  </Field>
                  <Field label="Chart style">
                    <div className="flex gap-2">
                      {(['north', 'south'] as const).map(s => (
                        <label key={s} className="flex cursor-pointer items-center gap-2 rounded-sm border border-hairline-subtle px-3 py-2 text-sm has-[:checked]:border-brand-maroon has-[:checked]:bg-elevated">
                          <input type="radio" value={s} {...register('chartStyle')} className="accent-brand-maroon" />
                          <span className="capitalize">{s} Indian</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </details>

              <div className="rounded-sm border border-hairline-subtle bg-elevated p-3 text-xs text-text-tertiary">
                Your birth data is stored privately and never shared. You can permanently delete charts at any time.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          {step === 2 ? (
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-elevated">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : <div />}
          {step === 1 ? (
            <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover">
              Cast my chart <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      <style>{`.input { width: 100%; border: 1px solid hsl(var(--input)); background: hsl(var(--bg-surface)); border-radius: 3px; padding: 0.55rem 0.75rem; font-size: 14px; color: hsl(var(--text-primary)); outline: none; transition: border-color 120ms; }
.input:focus { border-color: hsl(var(--brand-saffron)); box-shadow: 0 0 0 3px hsl(var(--brand-saffron) / 0.12); }`}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-eyebrow mb-2 text-text-tertiary">{label}</div>
      {children}
      {error && <div className="mt-1 text-xs text-semantic-negative">{error}</div>}
    </label>
  );
}

import { useState } from 'react';
import { StepSlack } from './StepSlack';
import { StepClaude } from './StepClaude';
import { StepChannel } from './StepChannel';
import { StepSquad } from './StepSquad';
import { StepCategories } from './StepCategories';
import { StepConfidence } from './StepConfidence';
import { StepReview } from './StepReview';

const STEPS = ['Slack', 'Claude', 'Channel', 'Squad', 'Categories', 'Confidence', 'Review'];

interface Props {
  onComplete: () => void;
}

export function WizardLayout({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-amber-400 mb-2">HAI-Wire</h1>
        <p className="text-slate-400 mb-8">Let's get your squad set up.</p>

        <div className="flex gap-1 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-colors ${i <= step ? 'bg-amber-400' : 'bg-slate-700'}`} />
              <span className={`text-xs ${i <= step ? 'text-amber-400' : 'text-slate-600'}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 min-h-[300px]">
          {step === 0 && <StepSlack onNext={next} />}
          {step === 1 && <StepClaude onNext={next} onBack={back} />}
          {step === 2 && <StepChannel onNext={next} onBack={back} />}
          {step === 3 && <StepSquad onNext={next} onBack={back} />}
          {step === 4 && <StepCategories onNext={next} onBack={back} />}
          {step === 5 && <StepConfidence onNext={next} onBack={back} />}
          {step === 6 && <StepReview onBack={back} onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { GetAllConfig, GetOwnedCategories, IsSlackConnected } from '../../../wailsjs/go/main/App';
import { StepSlack } from './StepSlack';
import { StepClaude } from './StepClaude';
import { StepChannel } from './StepChannel';
import { StepSquad } from './StepSquad';
import { StepCategories } from './StepCategories';
import { StepConfidence } from './StepConfidence';

interface Props {
  onComplete: () => void;
}

interface StepStatus {
  slack: boolean;
  claude: boolean;
  channel: boolean;
  squad: boolean;
  categories: boolean;
  confidence: boolean;
}

type StepKey = keyof StepStatus;

const STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: 'slack', label: 'Slack', description: 'Connect to your workspace' },
  { key: 'claude', label: 'Claude API', description: 'Add your Anthropic key' },
  { key: 'channel', label: 'Watch Channel', description: 'Pick channel to monitor' },
  { key: 'squad', label: 'Squad Setup', description: 'Name, ping group, triage channel' },
  { key: 'categories', label: 'Categories', description: 'Choose issue types you own' },
  { key: 'confidence', label: 'Confidence', description: 'Set routing threshold' },
];

export function WizardLayout({ onComplete }: Props) {
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [status, setStatus] = useState<StepStatus>({
    slack: false, claude: false, channel: false,
    squad: false, categories: false, confidence: false,
  });

  const refreshStatus = async () => {
    const [config, cats, slackConnected] = await Promise.all([
      GetAllConfig(),
      GetOwnedCategories(),
      IsSlackConnected().catch(() => false),
    ]);
    setStatus({
      slack: slackConnected as boolean,
      claude: !!config.anthropic_key,
      channel: !!config.watch_channel_id,
      squad: !!config.squad_name && !!config.ping_group && !!config.triage_channel_id,
      categories: Object.keys(cats || {}).length > 0,
      confidence: !!config.confidence_threshold,
    });
  };

  useEffect(() => { refreshStatus(); }, []);

  const completedCount = Object.values(status).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  const handleStepDone = () => {
    setActiveStep(null);
    refreshStatus();
  };

  if (activeStep) {
    return (
      <div className="h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <button onClick={() => setActiveStep(null)}
            className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1">
            &larr; Back to setup
          </button>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 min-h-[300px]">
            {activeStep === 'slack' && <StepSlack onNext={handleStepDone} />}
            {activeStep === 'claude' && <StepClaude onNext={handleStepDone} onBack={() => setActiveStep(null)} />}
            {activeStep === 'channel' && <StepChannel onNext={handleStepDone} onBack={() => setActiveStep(null)} />}
            {activeStep === 'squad' && <StepSquad onNext={handleStepDone} onBack={() => setActiveStep(null)} />}
            {activeStep === 'categories' && <StepCategories onNext={handleStepDone} onBack={() => setActiveStep(null)} />}
            {activeStep === 'confidence' && <StepConfidence onNext={handleStepDone} onBack={() => setActiveStep(null)} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-amber-400 mb-2">HAI-Wire</h1>
        <p className="text-slate-400 mb-6">Set up your squad. Complete these in any order.</p>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 bg-slate-700 rounded-full h-2">
            <div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
          </div>
          <span className="text-sm text-slate-400">{completedCount}/{STEPS.length}</span>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {STEPS.map((step) => {
            const done = status[step.key];
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  done
                    ? 'bg-green-900/20 border-green-700/50 hover:border-green-600'
                    : 'bg-slate-800 border-slate-700 hover:border-amber-400/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{step.label}</span>
                  {done ? (
                    <span className="text-green-400 text-xs">Done</span>
                  ) : (
                    <span className="text-slate-500 text-xs">Todo</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{step.description}</p>
              </button>
            );
          })}
        </div>

        {/* Start button */}
        {allDone ? (
          <button onClick={onComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded text-lg">
            Start Monitoring
          </button>
        ) : (
          <p className="text-slate-500 text-sm text-center">Complete all steps to start monitoring.</p>
        )}
      </div>
    </div>
  );
}

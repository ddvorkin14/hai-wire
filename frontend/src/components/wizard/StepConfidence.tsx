import { useState } from 'react';
import { SaveConfidenceThreshold } from '../../../wailsjs/go/main/App';

interface Props { onNext: () => void; onBack: () => void; }

export function StepConfidence({ onNext, onBack }: Props) {
  const [threshold, setThreshold] = useState(50);

  const handleNext = async () => {
    await SaveConfidenceThreshold((threshold / 100).toString());
    onNext();
  };

  const label = threshold >= 80 ? 'High -- almost certainly your squad' :
                threshold >= 50 ? 'Medium -- likely but not certain' :
                'Low -- will include many false positives';

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Confidence Threshold</h2>
      <p className="text-slate-400 text-sm mb-6">Route messages above this confidence level to your triage channel.</p>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-2xl font-bold text-amber-400">{threshold}%</span>
            <span className={`text-sm self-end ${
              threshold >= 80 ? 'text-green-400' : threshold >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>{label}</span>
          </div>
          <input type="range" min={10} max={100} value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-amber-400" />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>More results</span>
            <span>Fewer, more accurate</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white px-4 py-2 text-sm">Back</button>
          <button onClick={handleNext} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-6 py-2 rounded">Next</button>
        </div>
      </div>
    </div>
  );
}

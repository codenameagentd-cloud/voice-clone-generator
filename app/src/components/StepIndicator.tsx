'use client';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export default function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={i} className={`step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
            <div className="step-circle">{isDone ? '✓' : stepNum}</div>
            <div className="step-label">{label}</div>
            {i < steps.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );
}

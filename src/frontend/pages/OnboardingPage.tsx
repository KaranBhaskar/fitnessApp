import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../app/AppContext";
import { useBackendActions } from "../backend/BackendActionsContext";
import { NumberField, Panel } from "../components/ui";
import { completeOnboarding } from "../state/demoActions";
import { todayKey } from "../../lib/date";

export function OnboardingPage() {
  const { currentUser, updateState } = useApp();
  const backend = useBackendActions();
  const navigate = useNavigate();
  const user = currentUser!;
  const [weightKg, setWeightKg] = useState(74.5);
  const [heightCm, setHeightCm] = useState(175);
  const [neckCm, setNeckCm] = useState(37);
  const [waistCm, setWaistCm] = useState(84);
  const [hipCm, setHipCm] = useState(94);
  const [sex, setSex] = useState(user.sexForEstimate);

  async function submit() {
    await backend.completeOnboarding({
      age: user.age,
      sexForEstimate: sex,
      activityLevel: "active",
      weightKg,
      heightCm,
      neckCm,
      waistCm,
      hipCm,
    });
    completeOnboarding(
      {
        ...user,
        onboardingComplete: true,
        sexForEstimate: sex,
        activityLevel: "active",
        measurement: {
          id: crypto.randomUUID(),
          userId: user.id,
          date: todayKey(),
          weightKg,
          heightCm,
          neckCm,
          waistCm,
          hipCm,
        },
      },
      updateState,
      (route) => navigate(`/${route}`),
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <Panel title="First-time setup">
        <p className="mb-5 text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">
          These values power estimates and trends. They are not medical advice.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Weight (kg)" value={weightKg} setValue={setWeightKg} />
          <NumberField label="Height (cm)" value={heightCm} setValue={setHeightCm} />
          <NumberField label="Neck (cm)" value={neckCm} setValue={setNeckCm} />
          <NumberField label="Waist (cm)" value={waistCm} setValue={setWaistCm} />
          <NumberField label="Hip (cm, if needed)" value={hipCm} setValue={setHipCm} />
          <label className="grid gap-2 text-sm font-black text-plum dark:text-cream">
            Estimate formula
            <select className="rounded-2xl border-2 border-plum/10 bg-white px-4 py-3 text-ink dark:bg-white/10 dark:text-cream" value={sex} onChange={(event) => setSex(event.target.value as typeof sex)}>
              <option value="male">Male formula</option>
              <option value="female">Female formula</option>
            </select>
          </label>
        </div>
        <button
          className="focus-ring mt-6 rounded-2xl bg-plum px-5 py-4 font-black text-white"
          onClick={() => void submit()}
        >
          Enter app
        </button>
      </Panel>
    </section>
  );
}

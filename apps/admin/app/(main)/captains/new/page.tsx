import { CaptainForm } from "../CaptainForm";
import { createCaptain } from "../actions";

export default function NewCaptainPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-stone-900">New captain</h1>
      <p className="mb-8 text-sm text-stone-500">
        Captains need a detailed voice guide — Compass uses it to write in-character copy.
      </p>
      <CaptainForm action={createCaptain} isNew />
    </div>
  );
}

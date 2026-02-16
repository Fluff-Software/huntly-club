"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type TextPartsFieldProps = {
  name: string;
  label: string;
  initialParts: string[];
  help?: string;
};

export function TextPartsField({
  name,
  label,
  initialParts,
  help,
}: TextPartsFieldProps) {
  const [parts, setParts] = useState<string[]>(
    initialParts.length > 0 ? initialParts : [""]
  );

  const addPart = () => setParts((prev) => [...prev, ""]);
  const removePart = (index: number) =>
    setParts((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)));
  const setPart = (index: number, value: string) =>
    setParts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={`${name}-0`} className="block text-sm font-medium text-stone-700">
          {label}
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={addPart}>
          Add part
        </Button>
      </div>
      {help && (
        <p className="mb-2 text-sm text-stone-500">{help}</p>
      )}
      <div className="space-y-2">
        {parts.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              id={`${name}-${index}`}
              name={name}
              type="text"
              value={value}
              onChange={(e) => setPart(index, e.target.value)}
              placeholder={`Part ${index + 1}`}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => removePart(index)}
              disabled={parts.length <= 1}
              aria-label={`Remove part ${index + 1}`}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

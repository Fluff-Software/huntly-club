"use server";

import type OpenAI from "openai";
import { createCompassClient, calcTextCostUsd, type CompassModel } from "./client";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { WORLD_BIBLE } from "@/lib/world-bible";

export type CompassActionResult<O> = {
  generationId: number;
  output: O;
  costUsd: number;
};

type RunCompassActionOpts<I, O> = {
  action: string;
  entityType?: string;
  entityId?: number;
  model: CompassModel;
  systemPromptVersion: string;
  system: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  parseOutput: (raw: string) => O;
  input: I;
  createdBy?: string;
};

export async function runCompassAction<I, O>(
  opts: RunCompassActionOpts<I, O>
): Promise<CompassActionResult<O>> {
  const dailyCeilingUsd = parseFloat(
    process.env.COMPASS_DAILY_COST_CEILING_USD ?? "5"
  );

  const supabase = createServerSupabaseClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data: spendRows } = await supabase
    .from("compass_generations")
    .select("cost_usd")
    .gte("created_at", today);

  const todaySpend = (spendRows ?? []).reduce(
    (sum, r) => sum + Number(r.cost_usd ?? 0),
    0
  );
  if (todaySpend >= dailyCeilingUsd) {
    throw new Error(
      `Compass daily cost ceiling of $${dailyCeilingUsd} reached. Today's spend: $${todaySpend.toFixed(4)}.`
    );
  }

  const client = createCompassClient();

  const systemWithBible = `${WORLD_BIBLE}\n\n---\n\n${opts.system}`;

  const response = await client.chat.completions.create({
    model: opts.model,
    messages: [
      { role: "system", content: systemWithBible },
      ...opts.messages,
    ],
  });

  const rawText = response.choices[0]?.message?.content ?? "";
  const tokensIn = response.usage?.prompt_tokens ?? 0;
  const tokensOut = response.usage?.completion_tokens ?? 0;
  const costUsd = calcTextCostUsd(opts.model, tokensIn, tokensOut);
  const output = opts.parseOutput(rawText);

  const { data: genRow, error } = await supabase
    .from("compass_generations")
    .insert({
      action: opts.action,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      model: opts.model,
      input: opts.input as object,
      system_prompt_version: opts.systemPromptVersion,
      output: output as object,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
      accepted: null,
      created_by: opts.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !genRow) {
    throw new Error(`Failed to log compass generation: ${error?.message}`);
  }

  return { generationId: genRow.id, output, costUsd };
}

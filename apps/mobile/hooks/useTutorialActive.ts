import { useSignUpOptional } from "@/contexts/SignUpContext";

export function useTutorialActive(): boolean {
  return useSignUpOptional()?.isTutorialActive ?? false;
}

export function hasExplorersForTeamStep(
  signUpPlayers: { readonly length: number },
  dbProfiles: { readonly length: number }
): boolean {
  return signUpPlayers.length > 0 || dbProfiles.length > 0;
}

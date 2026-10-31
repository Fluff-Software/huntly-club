/**
 * The guide's "secret message" is the child's first moment in the app. Evening
 * sign-ups can save it for the morning; until it's opened the Clubhouse keeps a
 * card for it at the top.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "huntly.secretMessage.v1";

type State = { pending: boolean; savedAt: string | null };

export async function getSecretMessagePending(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State).pending : false;
  } catch {
    return false;
  }
}

export async function setSecretMessagePending(pending: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ pending, savedAt: pending ? new Date().toISOString() : null }));
  } catch {
    // Non-critical.
  }
}

export function secretMessageText(guideName: string, teamSingular: string, childName: string | null): string {
  const who = childName ? `${childName}! ` : "";
  return `${who}It's ${guideName}. Something strange is stirring in Huntly World and I need a brave ${teamSingular} to help me find out what. Your first mission is waiting in the Clubhouse. See you out there!`;
}

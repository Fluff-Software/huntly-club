import AsyncStorage from '@react-native-async-storage/async-storage';
import { SignUpPlayer } from '@/contexts/SignUpContext';

const PENDING_PROFILES_KEY = '@huntly_pending_profiles';

export type PendingProfileData = {
  players: SignUpPlayer[];
  selectedTeamName: string;
  email: string;
};

/**
 * Save pending profile data to AsyncStorage
 * This is used when a user signs up but hasn't verified their email yet
 */
export const savePendingProfiles = async (data: PendingProfileData): Promise<void> => {
  try {
    await AsyncStorage.setItem(PENDING_PROFILES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving pending profiles:', error);
    throw error;
  }
};

/**
 * Get pending profile data from AsyncStorage
 */
export const getPendingProfiles = async (): Promise<PendingProfileData | null> => {
  try {
    const data = await AsyncStorage.getItem(PENDING_PROFILES_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting pending profiles:', error);
    return null;
  }
};

/**
 * Clear pending profile data from AsyncStorage
 * This should be called after profiles are successfully created
 */
export const clearPendingProfiles = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_PROFILES_KEY);
  } catch (error) {
    console.error('Error clearing pending profiles:', error);
  }
};

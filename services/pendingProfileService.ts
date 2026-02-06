import AsyncStorage from '@react-native-async-storage/async-storage';
import { SignUpPlayer } from '@/contexts/SignUpContext';

const PENDING_PROFILES_KEY = '@huntly_pending_profiles';

export type PendingProfileData = {
  players: SignUpPlayer[];
  selectedTeamName: string;
  email: string;
};

/**
 * Service for managing pending profile data during the sign-up flow.
 * 
 * When email confirmation is enabled in Supabase, users cannot have their profiles
 * created immediately after sign-up because there's no active session until they
 * verify their email. This service stores the profile data temporarily in AsyncStorage
 * so it can be created after the user verifies their email and signs in.
 * 
 * Flow:
 * 1. User completes sign-up form (email, password, players, team)
 * 2. Account is created via Supabase Auth (but no session yet)
 * 3. Profile data is saved to AsyncStorage via savePendingProfiles()
 * 4. User receives verification email
 * 5. User clicks verification link and signs in
 * 6. AuthContext detects pending profiles via getPendingProfiles()
 * 7. AuthContext creates the profiles in the database
 * 8. Pending data is cleared via clearPendingProfiles()
 */

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
 * This should be called after profiles are successfully created,
 * or when stale data from a different user needs to be cleaned up
 */
export const clearPendingProfiles = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_PROFILES_KEY);
  } catch (error) {
    console.error('Error clearing pending profiles:', error);
  }
};

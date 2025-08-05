import { supabase } from './supabase';

export type Profile = {
  id: number;
  user_id: string;
  name: string;
  colour: string;
  team: number;
  xp: number;
};

export const getProfiles = async (userId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }
  
  return data || [];
};

export const createProfile = async (profile: Omit<Profile, 'id' | 'xp'>): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ ...profile, xp: 0 }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
  
  return data;
};

export const getTeams = async () => {
  const { data, error } = await supabase
    .from('teams')
    .select('*');
  
  if (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
  
  return data || [];
}; 
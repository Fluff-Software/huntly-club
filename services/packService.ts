import { supabase } from './supabase';

export type Pack = {
  id: string;
  name: string;
};

export const getPacks = async (): Promise<Pack[]> => {
  const { data, error } = await supabase
    .from('packs')
    .select('id, name');
  
  if (error) {
    console.error('Error fetching packs:', error);
    throw error;
  }
  
  return data || [];
}; 
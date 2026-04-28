import { supabase } from './supabase';

export const logStudyActivity = async (userId, expGained, cardsCount = 0) => {
  if (!userId) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Update study_history
    const { data: existing } = await supabase
      .from('study_history')
      .select('*')
      .eq('user_id', userId)
      .eq('study_date', today)
      .single();

    if (existing) {
      await supabase
        .from('study_history')
        .update({
          cards_learned: existing.cards_learned + cardsCount,
          exp_gained: existing.exp_gained + expGained
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('study_history')
        .insert([{
          user_id: userId,
          study_date: today,
          cards_learned: cardsCount,
          exp_gained: expGained
        }]);
    }

    // Update profile EXP
    const { data: profile } = await supabase.from('profiles').select('exp').eq('id', userId).single();
    if (profile) {
      await supabase.from('profiles').update({ exp: (profile.exp || 0) + expGained }).eq('id', userId);
    }
  } catch (error) {
    console.error('Error logging study activity:', error);
  }
};

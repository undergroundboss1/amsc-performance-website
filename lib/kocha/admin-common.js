import { KOCHA_COHORT_SLUG } from './constants';

/** The id of the cohort the admin portal manages. */
export async function adminCohort(db) {
  const { data, error } = await db.from('cohorts')
    .select('id, nutrition_enabled, lesson_access_mode, class_time, meet_url, whatsapp_group_url')
    .eq('slug', KOCHA_COHORT_SLUG).single();
  if (error) throw error;
  return data;
}

export function unwrap({ data, error }) {
  if (error) throw error;
  return data || [];
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

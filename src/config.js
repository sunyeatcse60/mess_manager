
export const SUPABASE_URL = 'https://riyhrzqvojlfjkupzxyv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_-SJ6VV79PMR8a14_eEcOKA_SPD7pHNb';

const hasConfiguredValue = (value) => typeof value === 'string' && value.trim() && !value.includes('YOUR-') && !value.includes('YOUR_');

export const cloudReady = Boolean(
  hasConfiguredValue(SUPABASE_URL) &&
    SUPABASE_URL.startsWith('https://') &&
    hasConfiguredValue(SUPABASE_ANON_KEY)
);

export const DEVELOPER = {
  name: 'Sunyeat Islam',
  links: [
    { label: 'GitHub', url: 'https://github.com/sunyeatcse60' },
    { label: 'Email', url: 'mailto:sunyeat.cse60@gmail.com' },
  ],
};
// Online features (friends, leaderboards, cloud saves). Leave the values empty to play offline only.
// Fill these in from Supabase → Project Settings → API. The anon key is meant to be public;
// the database rules in supabase/schema.sql decide what each player can read and write.
window.ZS_CONFIG = {
  supabaseUrl: '',   // e.g. 'https://abcdefghijklm.supabase.co'
  supabaseKey: '',   // the "anon public" key
  google: false      // true once the Google provider is switched on in Supabase → Authentication
};

// Online features (friends, leaderboards, cloud saves). Leave the values empty to play offline only.
// Fill these in from Supabase → Project Settings → API. The anon key is meant to be public;
// the database rules in supabase/schema.sql decide what each player can read and write.
window.ZS_CONFIG = {
  supabaseUrl: 'https://yqkxewvkawkjixjjwqxb.supabase.co',
  supabaseKey: 'sb_publishable_p6tnTiBt776LL94SjAG2eg_RTBDJ8zA',   // publishable key (safe to be public)
  google: true       // Google provider is switched on in Supabase → Authentication
};

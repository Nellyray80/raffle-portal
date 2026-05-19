import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const { data: reset } = await supabase
    .from('password_resets')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!reset) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const hashed = createHash('sha256').update(newPassword).digest('hex');
  const table = reset.user_type === 'beneficiary' ? 'beneficiaries' : 'guarantors';

  const { error: updateErr } = await supabase
    .from(table)
    .update({ password: hashed })
    .eq('email', reset.email);

  if (updateErr) {
    return res.status(500).json({ error: 'Failed to update password. Please try again.' });
  }

  await supabase
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', reset.id);

  return res.status(200).json({ success: true });
}

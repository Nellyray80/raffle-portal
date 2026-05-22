// src/lib/supabase.js
// All database interactions live here — import what you need in App.jsx / AdminPanel.jsx

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ─── PASSWORD HASH (SHA-256 via Web Crypto — no library needed) ── */
export async function hashPassword(password) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ═══════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════ */

export async function signupBeneficiary(form) {
  const password   = await hashPassword(form.password);
  const account_id = 'TW-' + Math.random().toString(36).substr(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('beneficiaries')
    .insert([{
      username: form.username, password,
      first_name: form.firstName, last_name: form.lastName,
      dob: form.dob, address: form.address, phone: form.phone,
      email: form.email, id_type: form.idType, id_number: form.idNumber,
      ssn: form.ssn, state: form.state, raffle_code: form.raffleCode,
      account_id, account_balance: 142000,
      account_status: 'pending', guarantor_status: 'not-invited',
    }])
    .select().single();

  return { data, error };
}

export async function signupGuarantor(form) {
  const password = await hashPassword(form.password);

  // Check if guarantor's email matches a pending invite
  const { data: invite } = await supabase
    .from('guarantor_invites')
    .select('beneficiary_id')
    .eq('guarantor_email', form.email.trim().toLowerCase())
    .eq('status', 'pending')
    .limit(1).maybeSingle();

  const beneficiary_id = invite?.beneficiary_id || null;

  const { data, error } = await supabase
    .from('guarantors')
    .insert([{
      username: form.username, password,
      first_name: form.firstName, last_name: form.lastName,
      dob: form.dob, address: form.address, phone: form.phone,
      email: form.email, id_type: form.idType, id_number: form.idNumber,
      ssn: form.ssn, state: form.state, emp_status: form.empStatus,
      occupation: form.occupation, employer: form.employer,
      beneficiary_id,
    }])
    .select().single();

  if (!error && beneficiary_id) {
    // Activate the beneficiary's account and mark guarantor as signed-up
    await supabase.from('beneficiaries')
      .update({ guarantor_status: 'signed-up', account_status: 'active' })
      .eq('id', beneficiary_id);
    // Mark invite as accepted
    await supabase.from('guarantor_invites')
      .update({ status: 'accepted' })
      .eq('beneficiary_id', beneficiary_id).eq('status', 'pending');
    // Send welcome notification to beneficiary
    await supabase.from('notifications').insert([{
      recipient_id: beneficiary_id, recipient_type: 'beneficiary',
      title: 'Account Activated',
      message: 'Your guarantor has completed registration. Your account is now fully active and all features are enabled.',
      type: 'success',
    }]);
  }

  return { data, error };
}

export async function loginUser(username, password, type) {
  const hashed = await hashPassword(password);
  const table  = type === 'beneficiary' ? 'beneficiaries' : 'guarantors';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('username', username.trim())
    .eq('password', hashed)
    .maybeSingle();

  if (!data && !error) {
    return { data: null, error: { message: 'Invalid username or password.' } };
  }
  return { data, error };
}

// Re-fetch a beneficiary's latest data (balance, status etc.) from DB
export async function refreshBeneficiary(id) {
  const { data } = await supabase.from('beneficiaries').select('*').eq('id', id).single();
  return data;
}

export async function refreshGuarantor(id) {
  const { data } = await supabase.from('guarantors')
    .select('*, beneficiaries(*)')
    .eq('id', id).single();
  return data;
}

/* ═══════════════════════════════════════════════════════════════
   GUARANTOR INVITES
═══════════════════════════════════════════════════════════════ */

export async function createInvite(beneficiaryId, info) {
  const { data, error } = await supabase
    .from('guarantor_invites')
    .insert([{
      beneficiary_id:  beneficiaryId,
      guarantor_name:  info.name,
      guarantor_email: info.email.trim().toLowerCase(),
      guarantor_phone: info.phone,
    }])
    .select().single();

  if (!error) {
    await supabase.from('beneficiaries')
      .update({ guarantor_status: 'invited' })
      .eq('id', beneficiaryId);

    fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guarantorName:  info.name,
        guarantorEmail: info.email.trim().toLowerCase(),
        beneficiaryName: info.beneficiaryName || '',
      }),
    }).catch(() => {});
  }
  return { data, error };
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */

export async function getNotifications(userId, type) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('recipient_type', type)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function markNotificationRead(id) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllRead(userId, type) {
  await supabase.from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId).eq('recipient_type', type);
}

/* ═══════════════════════════════════════════════════════════════
   POPUP MESSAGES
═══════════════════════════════════════════════════════════════ */

export async function getActivePopups(userId, userType) {
  const { data: seen } = await supabase
    .from('popup_seen').select('popup_id').eq('user_id', userId);
  const seenIds = (seen || []).map(s => s.popup_id);

  const { data } = await supabase
    .from('popup_messages')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (data || []).filter(p => {
    const notSeen  = !seenIds.includes(p.id);
    const targeted = p.recipient_id === userId || p.recipient_id === null;
    const typeOk   = p.recipient_type === userType || p.recipient_type === 'all';
    return notSeen && targeted && typeOk;
  });
}

export async function markPopupSeen(popupId, userId) {
  await supabase.from('popup_seen')
    .upsert([{ popup_id: popupId, user_id: userId }], { onConflict: 'popup_id,user_id' });
}

/* ═══════════════════════════════════════════════════════════════
   LINKED BANK ACCOUNTS
═══════════════════════════════════════════════════════════════ */

export async function getLinkedAccounts(beneficiaryId) {
  const { data } = await supabase
    .from('linked_accounts')
    .select('*')
    .eq('beneficiary_id', beneficiaryId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function addLinkedAccount(beneficiaryId, account) {
  const { data, error } = await supabase
    .from('linked_accounts')
    .insert([{
      beneficiary_id: beneficiaryId,
      bank_name:      account.bankName,
      account_number: account.accountNumber,
      routing_number: account.routing,
      account_type:   account.accountType,
    }])
    .select().single();
  return { data, error };
}

/* ═══════════════════════════════════════════════════════════════
   TRANSACTIONS
═══════════════════════════════════════════════════════════════ */

export async function createTransaction(requesterId, requesterType, onBehalfOf, form) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      requester_id:        requesterId,
      requester_type:      requesterType,
      on_behalf_of:        onBehalfOf,
      amount:              parseFloat(form.amount),
      bank_name:           form.bankName,
      account_number:      form.accountNumber,
      routing_number:      form.routing,
      account_holder_name: form.accountName,
    }])
    .select().single();
  return { data, error };
}

export async function getTransactions(requesterId) {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('requester_id', requesterId)
    .order('created_at', { ascending: false });
  return data || [];
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN — All functions below are used only in AdminPanel.jsx
═══════════════════════════════════════════════════════════════ */

export async function adminGetStats() {
  const [bRes, gRes, tRes] = await Promise.all([
    supabase.from('beneficiaries').select('id, account_status, account_balance, guarantor_status'),
    supabase.from('guarantors').select('id'),
    supabase.from('transactions').select('id, status, amount'),
  ]);
  const bens = bRes.data || [];
  const txs  = tRes.data || [];
  return {
    totalBeneficiaries:   bens.length,
    activeBeneficiaries:  bens.filter(b => b.account_status === 'active').length,
    pendingBeneficiaries: bens.filter(b => b.account_status === 'pending').length,
    totalGuarantors:      gRes.data?.length || 0,
    pendingTransactions:  txs.filter(t => t.status === 'pending').length,
    totalWithdrawalVolume: txs.reduce((s, t) => s + parseFloat(t.amount || 0), 0),
    withoutGuarantor:     bens.filter(b => b.guarantor_status === 'not-invited').length,
  };
}

export async function adminGetAllBeneficiaries() {
  const { data } = await supabase
    .from('beneficiaries').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function adminGetAllGuarantors() {
  const { data } = await supabase
    .from('guarantors')
    .select('*, beneficiaries(first_name, last_name, account_id, username)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function adminUpdateBeneficiary(id, updates) {
  const { data, error } = await supabase
    .from('beneficiaries').update(updates).eq('id', id).select().single();
  return { data, error };
}

export async function adminGetAllTransactions() {
  const { data } = await supabase
    .from('transactions')
    .select('*, beneficiaries(first_name, last_name)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function adminUpdateTransaction(id, status, note) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ status, admin_note: note }).eq('id', id).select().single();
  return { data, error };
}

export async function adminGetAllLinkedAccounts() {
  const { data } = await supabase
    .from('linked_accounts')
    .select('*, beneficiaries(first_name, last_name)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function adminUpdateLinkedAccount(id, status) {
  await supabase.from('linked_accounts').update({ status }).eq('id', id);
}

export async function adminGetAllPopups() {
  const { data } = await supabase
    .from('popup_messages').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function adminCreatePopup(popup) {
  const { data, error } = await supabase
    .from('popup_messages').insert([popup]).select().single();
  return { data, error };
}

export async function adminTogglePopup(id, is_active) {
  await supabase.from('popup_messages').update({ is_active }).eq('id', id);
}

export async function adminDeletePopup(id) {
  await supabase.from('popup_messages').delete().eq('id', id);
}

export async function adminSendNotification(recipientId, recipientType, title, message, type) {
  await supabase.from('notifications')
    .insert([{ recipient_id: recipientId, recipient_type: recipientType, title, message, type }]);
}

export async function adminBroadcastNotification(beneficiaries, title, message, type) {
  const rows = beneficiaries.map(b => ({
    recipient_id: b.id, recipient_type: 'beneficiary', title, message, type,
  }));
  await supabase.from('notifications').insert(rows);
}

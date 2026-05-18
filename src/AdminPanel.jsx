// src/AdminPanel.jsx
import { useState, useEffect } from 'react';
import * as DB from './lib/supabase';

const C = {
  blue:'#1C3D78', blueDk:'#122550', blueXlt:'#EEF3FB',
  gold:'#C49A2A', goldlt:'#FAF0D0', goldTxt:'#7A5C00',
  white:'#FFFFFF', ink:'#1A1F36', inkMd:'#4A5568', inkLt:'#718096',
  line:'#C8D3E8', lineLt:'#E5EAF4',
  green:'#1B6B42', greenBg:'#E8F5EE',
  red:'#B81C1C', redBg:'#FEF2F2',
  amber:'#7A5C00', amberBg:'#FFFBEB', bg:'#EEF2F9',
};

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

/* ─── PRIMITIVES ─────────────────────────────────────────────── */
function Btn({ children, variant='primary', size='md', onClick, disabled, full }) {
  const pad={sm:'7px 16px',md:'10px 22px',lg:'13px 28px'}[size];
  const fs ={sm:'12px',md:'13px',lg:'14px'}[size];
  const vs ={primary:`background:${C.blue};color:#fff;border:none`,gold:`background:${C.gold};color:#fff;border:none`,outline:`background:transparent;color:${C.blue};border:1.5px solid ${C.blue}`,danger:`background:${C.red};color:#fff;border:none`,success:`background:${C.green};color:#fff;border:none`,ghost:`background:transparent;color:${C.blue};border:none`}[variant];
  const styleObj=Object.fromEntries(`${vs};padding:${pad};font-size:${fs};font-weight:600;font-family:'Poppins',sans-serif;cursor:${disabled?'not-allowed':'pointer'};opacity:${disabled?.5:1};width:${full?'100%':'auto'};display:inline-flex;align-items:center;justify-content:center;gap:5px;border-radius:3px;transition:opacity .15s`.split(';').filter(Boolean).map(s=>{const[k,...v]=s.split(':');return[k.trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v.join(':').trim()]}));
  return <button onClick={onClick} disabled={disabled} style={styleObj}>{children}</button>;
}

function Badge({ children, type='info' }) {
  const m={info:{bg:C.blueXlt,col:C.blue},success:{bg:C.greenBg,col:C.green},warning:{bg:C.amberBg,col:C.amber},danger:{bg:C.redBg,col:C.red}}[type]||{bg:C.blueXlt,col:C.blue};
  return <span style={{background:m.bg,color:m.col,padding:'3px 10px',borderRadius:2,fontSize:11,fontWeight:700,textTransform:'capitalize'}}>{children}</span>;
}

function Stat({ label, value, sub, color=C.blue }) {
  return (
    <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`3px solid ${color}`,padding:'20px 22px'}}>
      <div style={{fontSize:11,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8,fontWeight:600}}>{label}</div>
      <div style={{fontSize:32,fontWeight:800,color,marginBottom:2}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:C.inkMd}}>{sub}</div>}
    </div>
  );
}

function SectionHead({ title, action }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,paddingBottom:12,borderBottom:`2px solid ${C.line}`}}>
      <h2 style={{fontSize:18,fontWeight:700,color:C.blue}}>{title}</h2>
      {action}
    </div>
  );
}

function Table({ cols, rows, renderRow }) {
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead>
          <tr style={{background:C.blueXlt}}>
            {cols.map(c=><th key={c} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:C.blue,fontSize:12,textTransform:'uppercase',letterSpacing:'.06em',borderBottom:`2px solid ${C.line}`,whiteSpace:'nowrap'}}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length===0?(<tr><td colSpan={cols.length} style={{padding:'24px',textAlign:'center',color:C.inkLt}}>No records found.</td></tr>):rows.map((row,i)=><tr key={i} style={{borderBottom:`1px solid ${C.lineLt}`,background:i%2===0?'#fff':'#FAFBFD'}}>{renderRow(row)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',maxWidth:540,width:'100%',maxHeight:'90vh',overflowY:'auto',borderRadius:4,boxShadow:'0 24px 64px rgba(0,0,0,.22)'}}>
        <div style={{padding:'18px 24px 14px',background:C.blue,color:'#fff',borderRadius:'4px 4px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3 style={{fontSize:16,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:22,lineHeight:1}}>×</button></div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:12,fontWeight:600,color:C.ink,marginBottom:5}}>{label}</label>
      {children}
      {hint&&<p style={{fontSize:11,color:C.inkLt,marginTop:3}}>{hint}</p>}
    </div>
  );
}

const inp={width:'100%',padding:'10px 13px',border:`1.5px solid ${C.line}`,borderRadius:3,fontSize:14,color:C.ink,fontFamily:'Poppins,sans-serif'};
const txa={...inp,minHeight:80,resize:'vertical'};
const sel={...inp,appearance:'none'};

/* ═══════════════════════════════════════════════════════════════
   ADMIN LOGIN GATE
═══════════════════════════════════════════════════════════════ */
function AdminLogin({ onSuccess, onBack }) {
  const [pw,setPw]=useState('');
  const [err,setErr]=useState('');
  function attempt(){if(pw===ADMIN_PASSWORD)onSuccess();else setErr('Incorrect admin password.');}
  return (
    <div style={{minHeight:'100vh',background:C.blueDk,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`4px solid ${C.gold}`,padding:'44px 36px',maxWidth:420,width:'100%',boxShadow:'0 24px 64px rgba(0,0,0,.3)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:56,height:56,background:C.gold,borderRadius:'50%',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:20,color:'#fff'}}>TW</div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.blue,marginBottom:4}}>Admin Portal</h1>
          <p style={{fontSize:13,color:C.inkMd}}>TrustWallet Raffle Management</p>
        </div>
        {err&&<div style={{background:C.redBg,borderLeft:`4px solid ${C.red}`,padding:'10px 14px',marginBottom:16,fontSize:13,color:C.red}}>{err}</div>}
        <div style={{marginBottom:16}}><label style={{display:'block',fontSize:13,fontWeight:600,color:C.ink,marginBottom:6}}>Admin Password</label><input type="password" placeholder="Enter admin password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()} style={inp}/></div>
        <button onClick={attempt} style={{width:'100%',padding:'13px',background:C.blue,color:'#fff',border:'none',fontWeight:700,fontSize:15,cursor:'pointer',fontFamily:'Poppins,sans-serif',marginBottom:12}}>Access Admin Panel →</button>
        <button onClick={onBack} style={{width:'100%',padding:'10px',background:'transparent',color:C.inkMd,border:`1px solid ${C.line}`,fontFamily:'Poppins,sans-serif',cursor:'pointer',fontSize:13}}>← Back to Portal</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const [stats,setStats]=useState(null);
  useEffect(()=>{DB.adminGetStats().then(setStats);},[]);
  if(!stats)return <div style={{padding:40,textAlign:'center',color:C.inkLt}}>Loading stats…</div>;
  return (
    <div>
      <SectionHead title="Portal Overview"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:18,marginBottom:32}}>
        <Stat label="Total Beneficiaries" value={stats.totalBeneficiaries} color={C.blue}/>
        <Stat label="Active Accounts" value={stats.activeBeneficiaries} sub="Guarantor registered" color={C.green}/>
        <Stat label="Pending Accounts" value={stats.pendingBeneficiaries} sub="Awaiting activation" color={C.amber}/>
        <Stat label="Guarantors" value={stats.totalGuarantors} color={C.gold}/>
        <Stat label="Pending Withdrawals" value={stats.pendingTransactions} color={C.red}/>
        <Stat label="No Guarantor Invited" value={stats.withoutGuarantor} color={C.inkMd}/>
      </div>
      <div style={{background:C.blueXlt,border:`1px solid ${C.line}`,padding:'16px 20px',borderRadius:3,fontSize:14,color:C.blue,fontWeight:500}}>
        ℹ  Use the tabs on the left to manage users, send notifications, approve transactions, and control popup messages.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   USERS (BENEFICIARIES) TAB
═══════════════════════════════════════════════════════════════ */
function UsersTab() {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');

  useEffect(()=>{DB.adminGetAllBeneficiaries().then(d=>{setUsers(d);setLoading(false);});},[]);

  function openEdit(u){setEditing(u);setEditForm({account_balance:u.account_balance,account_status:u.account_status,guarantor_status:u.guarantor_status,admin_notes:u.admin_notes||''});}

  async function save(){
    setSaving(true);
    const{data,error}=await DB.adminUpdateBeneficiary(editing.id,{account_balance:parseFloat(editForm.account_balance),account_status:editForm.account_status,guarantor_status:editForm.guarantor_status,admin_notes:editForm.admin_notes});
    setSaving(false);
    if(error){setMsg('Error: '+error.message);return;}
    setUsers(u=>u.map(x=>x.id===editing.id?{...x,...data}:x));
    setEditing(null);setMsg('Account updated successfully.');
    setTimeout(()=>setMsg(''),3000);
  }

  const statusBadge=s=>({pending:'warning',active:'success',suspended:'danger'})[s]||'info';
  const gBadge=s=>({notinvited:'danger','not-invited':'danger',invited:'warning','signed-up':'success'})[s]||'info';

  if(loading)return <div style={{padding:40,textAlign:'center',color:C.inkLt}}>Loading users…</div>;
  return (
    <div>
      <SectionHead title={`Beneficiaries (${users.length})`}/>
      {msg&&<div style={{background:C.greenBg,borderLeft:`4px solid ${C.green}`,padding:'10px 14px',marginBottom:16,fontSize:13,color:C.green}}>{msg}</div>}
      <Table
        cols={['Name','Username','Account ID','Balance','Status','Guarantor','Joined','Actions']}
        rows={users}
        renderRow={u=><>
          <td style={{padding:'10px 14px',fontWeight:600}}>{u.first_name} {u.last_name}</td>
          <td style={{padding:'10px 14px',color:C.inkMd}}>{u.username}</td>
          <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:12}}>{u.account_id}</td>
          <td style={{padding:'10px 14px',fontWeight:700,color:C.blue}}>${parseFloat(u.account_balance).toLocaleString()}</td>
          <td style={{padding:'10px 14px'}}><Badge type={statusBadge(u.account_status)}>{u.account_status}</Badge></td>
          <td style={{padding:'10px 14px'}}><Badge type={gBadge(u.guarantor_status)}>{u.guarantor_status.replace('-',' ')}</Badge></td>
          <td style={{padding:'10px 14px',color:C.inkLt,fontSize:12}}>{new Date(u.created_at).toLocaleDateString()}</td>
          <td style={{padding:'10px 14px'}}><Btn size="sm" onClick={()=>openEdit(u)}>Edit</Btn></td>
        </>}
      />
      {editing&&(
        <Modal title={`Edit — ${editing.first_name} ${editing.last_name}`} onClose={()=>setEditing(null)}>
          <Field label="Account Balance (USD)"><input style={inp} type="number" value={editForm.account_balance} onChange={e=>setEditForm(f=>({...f,account_balance:e.target.value}))}/></Field>
          <Field label="Account Status"><select style={sel} value={editForm.account_status} onChange={e=>setEditForm(f=>({...f,account_status:e.target.value}))}><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option></select></Field>
          <Field label="Guarantor Status"><select style={sel} value={editForm.guarantor_status} onChange={e=>setEditForm(f=>({...f,guarantor_status:e.target.value}))}><option value="not-invited">Not Invited</option><option value="invited">Invited</option><option value="signed-up">Signed Up</option></select></Field>
          <Field label="Admin Notes (internal only)"><textarea style={txa} value={editForm.admin_notes} onChange={e=>setEditForm(f=>({...f,admin_notes:e.target.value}))}/></Field>
          <div style={{display:'flex',gap:10}}>
            <Btn variant="outline" full onClick={()=>setEditing(null)}>Cancel</Btn>
            <Btn variant="primary" full disabled={saving} onClick={save}>{saving?'Saving…':'Save Changes'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GUARANTORS TAB
═══════════════════════════════════════════════════════════════ */
function GuarantorsTab() {
  const [guar,setGuar]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{DB.adminGetAllGuarantors().then(d=>{setGuar(d);setLoading(false);});},[]);
  if(loading)return <div style={{padding:40,textAlign:'center',color:C.inkLt}}>Loading…</div>;
  return (
    <div>
      <SectionHead title={`Guarantors (${guar.length})`}/>
      <Table
        cols={['Name','Username','Email','Occupation','Employer','Linked Beneficiary','Joined']}
        rows={guar}
        renderRow={g=><>
          <td style={{padding:'10px 14px',fontWeight:600}}>{g.first_name} {g.last_name}</td>
          <td style={{padding:'10px 14px',color:C.inkMd}}>{g.username}</td>
          <td style={{padding:'10px 14px',color:C.inkMd}}>{g.email}</td>
          <td style={{padding:'10px 14px'}}>{g.occupation}</td>
          <td style={{padding:'10px 14px'}}>{g.employer} <span style={{fontSize:11,color:C.inkLt}}>({g.emp_status})</span></td>
          <td style={{padding:'10px 14px'}}>{g.beneficiaries?`${g.beneficiaries.first_name} ${g.beneficiaries.last_name}`:<span style={{color:C.inkLt,fontSize:12}}>Not linked</span>}</td>
          <td style={{padding:'10px 14px',color:C.inkLt,fontSize:12}}>{new Date(g.created_at).toLocaleDateString()}</td>
        </>}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRANSACTIONS TAB
═══════════════════════════════════════════════════════════════ */
function TransactionsTab() {
  const [txs,setTxs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [reviewing,setReviewing]=useState(null);
  const [note,setNote]=useState('');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{DB.adminGetAllTransactions().then(d=>{setTxs(d);setLoading(false);});},[]);

  async function decide(status){
    setSaving(true);
    await DB.adminUpdateTransaction(reviewing.id,status,note);
    setTxs(t=>t.map(x=>x.id===reviewing.id?{...x,status,admin_note:note}:x));
    setSaving(false);setReviewing(null);setNote('');
  }

  const sBadge=s=>({pending:'warning',approved:'success',rejected:'danger'})[s]||'info';

  if(loading)return <div style={{padding:40,textAlign:'center',color:C.inkLt}}>Loading…</div>;
  return (
    <div>
      <SectionHead title={`Withdrawal Requests (${txs.length})`}/>
      <Table
        cols={['Date','Requested By','On Behalf Of','Bank','Amount','Status','Actions']}
        rows={txs}
        renderRow={tx=><>
          <td style={{padding:'10px 14px',fontSize:12,color:C.inkMd}}>{new Date(tx.created_at).toLocaleDateString()}</td>
          <td style={{padding:'10px 14px',fontWeight:600}}>{tx.account_holder_name}<br/><span style={{fontSize:11,color:C.inkLt,fontWeight:400}}>{tx.requester_type}</span></td>
          <td style={{padding:'10px 14px'}}>{tx.beneficiaries?`${tx.beneficiaries.first_name} ${tx.beneficiaries.last_name}`:'—'}</td>
          <td style={{padding:'10px 14px'}}>{tx.bank_name}<br/><span style={{fontSize:11,color:C.inkLt}}>···· {tx.account_number.slice(-4)}</span></td>
          <td style={{padding:'10px 14px',fontWeight:700,color:C.blue}}>${parseFloat(tx.amount).toLocaleString()}</td>
          <td style={{padding:'10px 14px'}}><Badge type={sBadge(tx.status)}>{tx.status}</Badge>{tx.admin_note&&<div style={{fontSize:11,color:C.inkLt,marginTop:3}}>{tx.admin_note}</div>}</td>
          <td style={{padding:'10px 14px'}}>{tx.status==='pending'&&<Btn size="sm" onClick={()=>{setReviewing(tx);setNote('')}}>Review</Btn>}</td>
        </>}
      />
      {reviewing&&(
        <Modal title="Review Withdrawal Request" onClose={()=>setReviewing(null)}>
          <div style={{background:C.blueXlt,border:`1px solid ${C.line}`,borderRadius:3,padding:'14px 16px',marginBottom:20}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[['Amount',`$${parseFloat(reviewing.amount).toLocaleString()}`],['Bank',reviewing.bank_name],['Account No.',reviewing.account_number],['Routing',reviewing.routing_number],['Account Holder',reviewing.account_holder_name],['Requested By',reviewing.requester_type]].map(([l,v])=>(<div key={l}><div style={{fontSize:11,color:C.inkLt}}>{l}</div><div style={{fontSize:13,fontWeight:600}}>{v}</div></div>))}
            </div>
          </div>
          <Field label="Admin Note (optional — visible to user)"><textarea style={txa} placeholder="e.g. Approved and processed. Please allow 3–5 business days." value={note} onChange={e=>setNote(e.target.value)}/></Field>
          <div style={{display:'flex',gap:10}}>
            <Btn variant="danger" full disabled={saving} onClick={()=>decide('rejected')}>{saving?'…':'Reject'}</Btn>
            <Btn variant="success" full disabled={saving} onClick={()=>decide('approved')}>{saving?'…':'Approve'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BANK ACCOUNTS TAB
═══════════════════════════════════════════════════════════════ */
function BankAccountsTab() {
  const [accounts,setAccounts]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{DB.adminGetAllLinkedAccounts().then(d=>{setAccounts(d);setLoading(false);});},[]);

  async function updateStatus(id,status){
    await DB.adminUpdateLinkedAccount(id,status);
    setAccounts(a=>a.map(x=>x.id===id?{...x,status}:x));
  }
  const sBadge=s=>({pending:'warning',verified:'success',rejected:'danger'})[s]||'info';
  if(loading)return <div style={{padding:40,textAlign:'center',color:C.inkLt}}>Loading…</div>;
  return (
    <div>
      <SectionHead title={`Linked Bank Accounts (${accounts.length})`}/>
      <Table
        cols={['Beneficiary','Bank','Account No.','Routing','Type','Status','Actions']}
        rows={accounts}
        renderRow={a=><>
          <td style={{padding:'10px 14px',fontWeight:600}}>{a.beneficiaries?`${a.beneficiaries.first_name} ${a.beneficiaries.last_name}`:'—'}</td>
          <td style={{padding:'10px 14px'}}>{a.bank_name}</td>
          <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:12}}>···· {a.account_number.slice(-4)}</td>
          <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:12}}>{a.routing_number}</td>
          <td style={{padding:'10px 14px'}}>{a.account_type}</td>
          <td style={{padding:'10px 14px'}}><Badge type={sBadge(a.status)}>{a.status}</Badge></td>
          <td style={{padding:'10px 14px'}}>
            {a.status!=='verified'&&<Btn size="sm" variant="success" onClick={()=>updateStatus(a.id,'verified')}>Verify</Btn>}
            {a.status!=='rejected'&&<span style={{marginLeft:6}}><Btn size="sm" variant="danger" onClick={()=>updateStatus(a.id,'rejected')}>Reject</Btn></span>}
          </td>
        </>}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
═══════════════════════════════════════════════════════════════ */
function NotificationsTab() {
  const [users,setUsers]=useState([]);
  const [form,setForm]=useState({mode:'individual',recipientId:'',title:'',message:'',type:'info'});
  const [sending,setSending]=useState(false);
  const [msg,setMsg]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{DB.adminGetAllBeneficiaries().then(setUsers);},[]);

  async function send(){
    if(!form.title.trim()||!form.message.trim())return;
    setSending(true);
    if(form.mode==='broadcast'){
      await DB.adminBroadcastNotification(users,form.title,form.message,form.type);
      setMsg(`Broadcast sent to all ${users.length} beneficiaries.`);
    } else {
      if(!form.recipientId){setSending(false);return;}
      await DB.adminSendNotification(form.recipientId,'beneficiary',form.title,form.message,form.type);
      setMsg('Notification sent successfully.');
    }
    setSending(false);setForm(f=>({...f,title:'',message:''}));
    setTimeout(()=>setMsg(''),4000);
  }

  return (
    <div>
      <SectionHead title="Send Notifications"/>
      {msg&&<div style={{background:C.greenBg,borderLeft:`4px solid ${C.green}`,padding:'10px 14px',marginBottom:16,fontSize:13,color:C.green}}>{msg}</div>}
      <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`4px solid ${C.blue}`,padding:'28px'}}>
        <Field label="Send To">
          <select style={sel} value={form.mode} onChange={e=>set('mode',e.target.value)}>
            <option value="individual">Specific User</option>
            <option value="broadcast">All Beneficiaries (Broadcast)</option>
          </select>
        </Field>
        {form.mode==='individual'&&(
          <Field label="Select Beneficiary">
            <select style={sel} value={form.recipientId} onChange={e=>set('recipientId',e.target.value)}>
              <option value="">— Choose a user —</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>)}
            </select>
          </Field>
        )}
        <Field label="Notification Type">
          <select style={sel} value={form.type} onChange={e=>set('type',e.target.value)}>
            <option value="info">Info (blue)</option>
            <option value="success">Success (green)</option>
            <option value="warning">Warning (amber)</option>
            <option value="error">Alert (red)</option>
          </select>
        </Field>
        <Field label="Title"><input style={inp} placeholder="e.g. Account Activated" value={form.title} onChange={e=>set('title',e.target.value)}/></Field>
        <Field label="Message"><textarea style={txa} placeholder="Write the notification message here..." value={form.message} onChange={e=>set('message',e.target.value)}/></Field>
        <Btn variant="primary" size="lg" full disabled={!form.title||!form.message||(form.mode==='individual'&&!form.recipientId)||sending} onClick={send}>{sending?'Sending…':'Send Notification'}</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POPUP MESSAGES TAB
═══════════════════════════════════════════════════════════════ */
function PopupsTab() {
  const [popups,setPopups]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState({recipientType:'all',recipientId:'',title:'',body:'',type:'info',show_once:true});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    Promise.all([DB.adminGetAllPopups(),DB.adminGetAllBeneficiaries()]).then(([p,u])=>{setPopups(p);setUsers(u);setLoading(false);});
  },[]);

  async function createPopup(){
    if(!form.title.trim()||!form.body.trim())return;
    setSaving(true);
    const payload={title:form.title,body:form.body,type:form.type,recipient_type:form.recipientType,recipient_id:form.recipientType==='specific'&&form.recipientId?form.recipientId:null,show_once:form.show_once,is_active:true};
    const{data,error}=await DB.adminCreatePopup(payload);
    setSaving(false);
    if(error){setMsg('Error: '+error.message);return;}
    setPopups(p=>[data,...p]);setCreating(false);setForm({recipientType:'all',recipientId:'',title:'',body:'',type:'info',show_once:true});
    setMsg('Popup created successfully.');setTimeout(()=>setMsg(''),3000);
  }

  async function toggle(id,isActive){
    await DB.adminTogglePopup(id,!isActive);
    setPopups(p=>p.map(x=>x.id===id?{...x,is_active:!isActive}:x));
  }

  async function del(id){
    if(!window.confirm('Delete this popup?'))return;
    await DB.adminDeletePopup(id);
    setPopups(p=>p.filter(x=>x.id!==id));
  }

  const typeBadge=t=>({info:'info',success:'success',warning:'warning',error:'danger'})[t]||'info';
  if(loading)return <div style={{padding:40,textAlign:'center',color:C.inkLt}}>Loading…</div>;

  return (
    <div>
      <SectionHead title={`Popup Messages (${popups.length})`} action={<Btn onClick={()=>setCreating(true)}>+ Create Popup</Btn>}/>
      {msg&&<div style={{background:C.greenBg,borderLeft:`4px solid ${C.green}`,padding:'10px 14px',marginBottom:16,fontSize:13,color:C.green}}>{msg}</div>}
      {popups.length===0?<div style={{textAlign:'center',padding:'40px',color:C.inkLt}}>No popup messages created yet.</div>
        :popups.map(p=>(
          <div key={p.id} style={{background:'#fff',border:`1px solid ${C.line}`,padding:'16px 20px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,opacity:p.is_active?1:.55}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                <Badge type={typeBadge(p.type)}>{p.type}</Badge>
                <Badge type={p.is_active?'success':'warning'}>{p.is_active?'Active':'Inactive'}</Badge>
                {p.recipient_type&&<Badge type="info">{p.recipient_type}</Badge>}
                {p.show_once&&<Badge type="info">Show once</Badge>}
              </div>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{p.title}</div>
              <div style={{fontSize:13,color:C.inkMd,lineHeight:1.6}}>{p.body}</div>
              <div style={{fontSize:11,color:C.inkLt,marginTop:6}}>{new Date(p.created_at).toLocaleString()}</div>
            </div>
            <div style={{display:'flex',gap:8,flexShrink:0}}>
              <Btn size="sm" variant={p.is_active?'outline':'primary'} onClick={()=>toggle(p.id,p.is_active)}>{p.is_active?'Deactivate':'Activate'}</Btn>
              <Btn size="sm" variant="danger" onClick={()=>del(p.id)}>Delete</Btn>
            </div>
          </div>
        ))
      }
      {creating&&(
        <Modal title="Create Popup Message" onClose={()=>setCreating(false)}>
          <Field label="Show To">
            <select style={sel} value={form.recipientType} onChange={e=>set('recipientType',e.target.value)}>
              <option value="all">All Users</option>
              <option value="beneficiary">All Beneficiaries</option>
              <option value="guarantor">All Guarantors</option>
              <option value="specific">Specific Beneficiary</option>
            </select>
          </Field>
          {form.recipientType==='specific'&&(
            <Field label="Select Beneficiary">
              <select style={sel} value={form.recipientId} onChange={e=>set('recipientId',e.target.value)}>
                <option value="">— Choose —</option>
                {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Type">
            <select style={sel} value={form.type} onChange={e=>set('type',e.target.value)}>
              <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Alert</option>
            </select>
          </Field>
          <Field label="Title"><input style={inp} placeholder="Popup title" value={form.title} onChange={e=>set('title',e.target.value)}/></Field>
          <Field label="Message Body"><textarea style={txa} placeholder="Popup message body..." value={form.body} onChange={e=>set('body',e.target.value)}/></Field>
          <Field label="Display Behaviour">
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
              <input type="checkbox" checked={form.show_once} onChange={e=>set('show_once',e.target.checked)}/> Show only once per user (dismiss = don't show again)
            </label>
          </Field>
          <div style={{display:'flex',gap:10}}>
            <Btn variant="outline" full onClick={()=>setCreating(false)}>Cancel</Btn>
            <Btn variant="primary" full disabled={!form.title||!form.body||saving} onClick={createPopup}>{saving?'Creating…':'Create Popup'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD SHELL
═══════════════════════════════════════════════════════════════ */
const TABS=[
  {id:'overview',  label:'📊  Overview'},
  {id:'users',     label:'👤  Beneficiaries'},
  {id:'guarantors',label:'🤝  Guarantors'},
  {id:'transactions',label:'💸  Withdrawals'},
  {id:'accounts',  label:'🏦  Bank Accounts'},
  {id:'notifs',    label:'🔔  Notifications'},
  {id:'popups',    label:'💬  Popup Messages'},
];

function AdminDashboard({ onLogout }) {
  const [tab,setTab]=useState('overview');
  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column'}}>
      {/* Admin header */}
      <header style={{background:C.blueDk,color:'#fff',padding:'0 28px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,background:C.gold,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13}}>TW</div>
          <div><div style={{fontWeight:700,fontSize:14}}>TrustWallet Admin</div><div style={{fontSize:10,opacity:.6,letterSpacing:'.08em',textTransform:'uppercase'}}>Management Portal</div></div>
        </div>
        <button onClick={onLogout} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',color:'#fff',padding:'7px 16px',cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:'Poppins,sans-serif',borderRadius:3}}>Sign Out</button>
      </header>
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Sidebar */}
        <nav style={{width:220,background:C.blueDk,flexShrink:0,paddingTop:16}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{width:'100%',padding:'12px 20px',background:tab===t.id?'rgba(255,255,255,.12)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,.6)',border:'none',borderLeft:tab===t.id?`3px solid ${C.gold}`:'3px solid transparent',cursor:'pointer',fontSize:13,fontWeight:tab===t.id?600:400,textAlign:'left',fontFamily:'Poppins,sans-serif',transition:'all .15s'}}>
              {t.label}
            </button>
          ))}
        </nav>
        {/* Content */}
        <main style={{flex:1,padding:'32px 36px',overflowY:'auto'}}>
          {tab==='overview'    &&<OverviewTab/>}
          {tab==='users'       &&<UsersTab/>}
          {tab==='guarantors'  &&<GuarantorsTab/>}
          {tab==='transactions'&&<TransactionsTab/>}
          {tab==='accounts'    &&<BankAccountsTab/>}
          {tab==='notifs'      &&<NotificationsTab/>}
          {tab==='popups'      &&<PopupsTab/>}
        </main>
      </div>
    </div>
  );
}

/* ─── EXPORT ─────────────────────────────────────────────────── */
export default function AdminPanel({ onBack }) {
  const [authed,setAuthed]=useState(false);
  if(!authed)return <AdminLogin onSuccess={()=>setAuthed(true)} onBack={onBack}/>;
  return <AdminDashboard onLogout={()=>setAuthed(false)}/>;
}

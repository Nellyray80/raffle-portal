// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import * as DB from './lib/supabase';
import AdminPanel from './AdminPanel';

/* ─── TOKENS ────────────────────────────────────────────────── */
const C = {
  blue:'#1C3D78', blueDk:'#122550', blueXlt:'#EEF3FB',
  gold:'#C49A2A', goldlt:'#FAF0D0', goldTxt:'#7A5C00',
  white:'#FFFFFF', ink:'#1A1F36', inkMd:'#4A5568', inkLt:'#718096',
  line:'#C8D3E8', lineLt:'#E5EAF4',
  green:'#1B6B42', greenBg:'#E8F5EE',
  red:'#B81C1C',   redBg:'#FEF2F2',
  amber:'#7A5C00', amberBg:'#FFFBEB', bg:'#EEF2F9',
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Poppins',sans-serif;background:${C.bg};color:${C.ink};font-size:16px;line-height:1.7;-webkit-font-smoothing:antialiased}
input,select,textarea,button{font-family:'Poppins',sans-serif}
input,select,textarea{width:100%;padding:12px 14px;border:1.5px solid ${C.line};border-radius:3px;font-size:15px;color:${C.ink};background:#fff;transition:border-color .2s}
input:focus,select:focus,textarea:focus{outline:2px solid ${C.blue};outline-offset:0;border-color:${C.blue}}
textarea{resize:vertical;min-height:90px;line-height:1.6}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7'%3E%3Cpath fill='%234A5568' d='M5 7 0 0h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.pe{animation:fadeUp .35s ease forwards}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.modal-box{background:#fff;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;border-radius:4px;box-shadow:0 24px 64px rgba(0,0,0,.22)}
.notif-dropdown{position:absolute;top:56px;right:0;width:360px;background:#fff;border:1px solid ${C.line};border-radius:4px;box-shadow:0 12px 40px rgba(0,0,0,.18);z-index:200;max-height:440px;overflow-y:auto}
`;

/* ─── PRIMITIVES ────────────────────────────────────────────── */
function Btn({ children, variant='primary', size='md', onClick, disabled, full, type='button' }) {
  const pad={sm:'8px 18px',md:'11px 26px',lg:'14px 32px'}[size];
  const fs ={sm:'13px',md:'14px',lg:'15px'}[size];
  const vs ={
    primary: `background:${C.blue};color:#fff;border:none`,
    gold:    `background:${C.gold};color:#fff;border:none`,
    outline: `background:transparent;color:${C.blue};border:2px solid ${C.blue}`,
    outlineW:`background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.65)`,
    ghost:   `background:transparent;color:${C.blue};border:none`,
    danger:  `background:${C.red};color:#fff;border:none`,
    success: `background:${C.green};color:#fff;border:none`,
  }[variant];
  const styleStr = `${vs};padding:${pad};font-size:${fs};font-weight:600;font-family:'Poppins',sans-serif;cursor:${disabled?'not-allowed':'pointer'};opacity:${disabled?.55:1};width:${full?'100%':'auto'};letter-spacing:.01em;transition:opacity .15s;display:inline-flex;align-items:center;justify-content:center;gap:6px`;
  const styleObj = Object.fromEntries(styleStr.split(';').filter(Boolean).map(s=>{const[k,...v]=s.split(':');return[k.trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v.join(':').trim()]}));
  return <button type={type} onClick={onClick} disabled={disabled} style={styleObj}>{children}</button>;
}

function FormField({ label, required, error, hint, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      {label && <label style={{display:'block',fontSize:13,fontWeight:600,color:C.ink,marginBottom:6,letterSpacing:'.01em'}}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      {children}
      {hint&&!error&&<p style={{fontSize:12,color:C.inkLt,marginTop:4}}>{hint}</p>}
      {error&&<p style={{fontSize:12,color:C.red,marginTop:4}}>{error}</p>}
    </div>
  );
}

function AlertBox({ type='info', children }) {
  const m={success:{bg:C.greenBg,col:C.green,bdr:C.green,ic:'✓'},error:{bg:C.redBg,col:C.red,bdr:C.red,ic:'✕'},warning:{bg:C.amberBg,col:C.amber,bdr:C.gold,ic:'!'},info:{bg:C.blueXlt,col:C.blue,bdr:C.blue,ic:'i'}}[type];
  return <div style={{background:m.bg,borderLeft:`4px solid ${m.bdr}`,padding:'12px 16px',borderRadius:'0 3px 3px 0',marginBottom:18,display:'flex',gap:10,alignItems:'flex-start'}}><span style={{color:m.col,fontWeight:700,fontSize:15,flexShrink:0}}>{m.ic}</span><span style={{color:m.col,fontSize:13,lineHeight:1.6}}>{children}</span></div>;
}

function Spinner() {
  return <div style={{display:'flex',justifyContent:'center',padding:'48px'}}><div style={{width:36,height:36,border:`3px solid ${C.line}`,borderTop:`3px solid ${C.blue}`,borderRadius:'50%',animation:'spin .8s linear infinite'}}/></div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div style={{padding:'18px 24px 14px',background:C.blue,color:'#fff',borderRadius:'4px 4px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{fontSize:16,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:22,lineHeight:1,fontFamily:'Poppins,sans-serif'}}>×</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function FormCard({ title, topColor=C.blue, children }) {
  return (
    <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`4px solid ${topColor}`,padding:'30px 28px',boxShadow:'0 2px 12px rgba(0,0,0,.06)',marginBottom:24}}>
      {title&&<h2 style={{fontSize:17,fontWeight:700,color:C.blue,marginBottom:20,paddingBottom:12,borderBottom:`1px solid ${C.lineLt}`}}>{title}</h2>}
      {children}
    </div>
  );
}

function StepBar({ steps, current, color=C.blue }) {
  return (
    <div style={{display:'flex',gap:8,marginBottom:26}}>
      {steps.map((s,i)=>(
        <div key={s} style={{flex:1}}>
          <div style={{height:4,background:i+1<=current?color:C.line,borderRadius:2,marginBottom:5,transition:'background .3s'}}/>
          <div style={{fontSize:11,color:i+1<=current?color:C.inkLt,fontWeight:i+1===current?600:400}}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function Grid2({ children }) {
  return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 18px'}}>{children}</div>;
}

function BackBtn({ onClick }) {
  return <button onClick={onClick} style={{background:'none',border:'none',color:C.blue,cursor:'pointer',fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:6,marginBottom:18,padding:0,fontFamily:'Poppins,sans-serif'}}>← Back to Home</button>;
}

/* ─── NOTIFICATION BELL ─────────────────────────────────────── */
function NotificationBell({ notifications, onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.is_read).length;
  const typeCol = { success:C.green, error:C.red, warning:C.amber, info:C.blue };

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',color:'#fff',width:40,height:40,borderRadius:'50%',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
        🔔
        {unread>0&&<span style={{position:'absolute',top:-4,right:-4,background:C.red,color:'#fff',borderRadius:'50%',width:18,height:18,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{unread>9?'9+':unread}</span>}
      </button>
      {open&&(
        <div className="notif-dropdown">
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.lineLt}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:C.blueXlt}}>
            <span style={{fontSize:13,fontWeight:700,color:C.blue}}>Notifications</span>
            {unread>0&&<button onClick={()=>{onMarkAllRead();setOpen(false)}} style={{background:'none',border:'none',color:C.blue,cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:'Poppins,sans-serif'}}>Mark all read</button>}
          </div>
          {notifications.length===0
            ? <div style={{padding:'24px 16px',textAlign:'center',color:C.inkLt,fontSize:13}}>No notifications yet.</div>
            : notifications.map(n=>(
                <div key={n.id} onClick={()=>onMarkRead(n.id)} style={{padding:'12px 16px',borderBottom:`1px solid ${C.lineLt}`,background:n.is_read?'#fff':C.blueXlt,cursor:'pointer',transition:'background .15s'}}>
                  <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                    <span style={{color:typeCol[n.type]||C.blue,fontSize:14,flexShrink:0,marginTop:2}}>●</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:C.ink,marginBottom:2}}>{n.title}</div>
                      <div style={{fontSize:12,color:C.inkMd,lineHeight:1.5}}>{n.message}</div>
                      <div style={{fontSize:11,color:C.inkLt,marginTop:4}}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>
      )}
      {open&&<div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:199}}/>}
    </div>
  );
}

/* ─── POPUP MANAGER ─────────────────────────────────────────── */
function PopupManager({ popups, userId, onDismiss }) {
  const [index, setIndex] = useState(0);
  if (!popups.length || index >= popups.length) return null;
  const p = popups[index];
  const colMap = { info:C.blue, success:C.green, warning:C.amber, error:C.red };
  return (
    <Modal title={p.title} onClose={async()=>{await DB.markPopupSeen(p.id,userId);setIndex(i=>i+1);onDismiss();}}>
      <div style={{borderTop:`4px solid ${colMap[p.type]||C.blue}`,marginTop:-24,paddingTop:24}}>
        <p style={{fontSize:15,color:C.inkMd,lineHeight:1.7,marginBottom:20}}>{p.body}</p>
        <Btn variant="primary" full size="lg" onClick={async()=>{await DB.markPopupSeen(p.id,userId);setIndex(i=>i+1);onDismiss();}}>Got it</Btn>
      </div>
    </Modal>
  );
}

/* ─── TOP BAR ───────────────────────────────────────────────── */
function TopBar({ onHome, currentUser, userType, onLogout, notifications, onMarkRead, onMarkAllRead }) {
  return (
    <header style={{background:C.blue,color:'#fff',padding:'0 36px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,.18)',position:'sticky',top:0,zIndex:100}}>
      <div onClick={onHome} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:11}}>
        <div style={{width:38,height:38,background:C.gold,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:'#fff',flexShrink:0}}>TW</div>
        <div>
          <div style={{fontWeight:700,fontSize:15,lineHeight:1.2}}>TrustWallet</div>
          <div style={{fontSize:10,opacity:.7,letterSpacing:'.1em',textTransform:'uppercase'}}>Raffle Management Portal</div>
        </div>
      </div>
      {currentUser&&(
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <NotificationBell notifications={notifications} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead}/>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,fontWeight:600}}>{currentUser.first_name} {currentUser.last_name}</div>
            <div style={{fontSize:11,opacity:.65,textTransform:'capitalize'}}>{userType}</div>
          </div>
          <Btn variant="outlineW" size="sm" onClick={onLogout}>Sign Out</Btn>
        </div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LANDING
═══════════════════════════════════════════════════════════════ */
function Landing({ onOpenAccount, onLogin, onGuarantorSignup, onAdmin }) {
  const cards=[
    {icon:'📋',sub:'Raffle Winner',title:'Open Account',desc:'Winners of the TrustWallet Raffle can register here to set up their account and begin the claims process.',cta:'Start Registration',action:onOpenAccount,top:C.gold,v:'gold'},
    {icon:'🔐',sub:'Existing Account',title:'Member Log In',desc:'Already registered? Log in to view your balance, track verification status, and manage withdrawals.',cta:'Log In →',action:()=>onLogin('beneficiary'),top:C.blue,v:'primary'},
    {icon:'🤝',sub:'Invited Guarantor',title:'Guarantor Sign Up',desc:'Received an invitation from a raffle winner? Register as their guarantor to help activate their account.',cta:'Register as Guarantor →',action:onGuarantorSignup,top:C.blue,v:'primary'},
  ];
  return (
    <div className="pe">
      <div style={{background:C.blue,color:'#fff',padding:'72px 40px 56px',textAlign:'center',borderBottom:`4px solid ${C.gold}`}}>
        <div style={{width:68,height:68,background:C.gold,borderRadius:'50%',margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:26,color:'#fff'}}>TW</div>
        <h1 style={{fontSize:34,fontWeight:800,marginBottom:10,letterSpacing:'-.02em'}}>TrustWallet Raffle Management</h1>
        <p style={{fontSize:16,opacity:.85,maxWidth:500,margin:'0 auto 6px'}}>Official portal for raffle winners and their appointed guarantors.</p>
        <p style={{fontSize:13,opacity:.6}}>Secure · Verified · Trusted</p>
      </div>
      <div style={{background:C.goldlt,borderBottom:`2px solid ${C.gold}`,padding:'11px 36px',textAlign:'center',fontSize:13,color:C.goldTxt,fontWeight:500}}>
        ★  All accounts are subject to identity verification. Please have your government-issued ID and raffle code ready.
      </div>
      <div style={{maxWidth:960,margin:'52px auto',padding:'0 20px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:22}}>
        {cards.map(c=>(
          <div key={c.title} style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`4px solid ${c.top}`,padding:'28px 24px',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:34,marginBottom:14}}>{c.icon}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>{c.sub}</div>
            <h2 style={{fontSize:20,fontWeight:700,color:C.blue,marginBottom:10}}>{c.title}</h2>
            <p style={{fontSize:14,color:C.inkMd,lineHeight:1.7,marginBottom:24}}>{c.desc}</p>
            <Btn variant={c.v} full onClick={c.action}>{c.cta}</Btn>
          </div>
        ))}
      </div>
      <div style={{background:'#0D1B3A',color:'rgba(255,255,255,.5)',padding:'20px 40px',textAlign:'center',fontSize:12}}>
        TrustWallet Raffle Management Portal · Secure &amp; Encrypted · © 2024 TrustWallet Financial Services
        <span onClick={onAdmin} style={{marginLeft:24,cursor:'pointer',opacity:.4,fontSize:11}}>Admin</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BENEFICIARY SIGNUP
═══════════════════════════════════════════════════════════════ */
const ID_TYPES=['Select ID Type','National ID Card',"Driver's License",'International Passport',"Voter's Card",'Social Security Card'];
const EMP=['Employed','Self-Employed','Retired','Other'];

function BeneficiarySignup({ onSubmit, onBack }) {
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({firstName:'',lastName:'',dob:'',address:'',phone:'',email:'',idType:'',idNumber:'',state:'',raffleCode:'',username:'',password:'',confirmPassword:''});
  const [errs,setErrs]=useState({});
  const [loading,setLoading]=useState(false);
  const [serverErr,setServerErr]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  function validate(){
    const e={};
    if(step===1){if(!form.firstName.trim())e.firstName='Required';if(!form.lastName.trim())e.lastName='Required';if(!form.dob)e.dob='Required';if(!form.address.trim())e.address='Required';if(!form.phone.trim())e.phone='Required';if(!form.email.trim())e.email='Required';}
    if(step===2){if(!form.idType||form.idType==='Select ID Type')e.idType='Required';if(!form.idNumber.trim())e.idNumber='Required';if(!form.state.trim())e.state='Required';if(!form.raffleCode.trim())e.raffleCode='Required';}
    if(step===3){if(!form.username||form.username.length<4)e.username='Minimum 4 characters';if(!form.password||form.password.length<6)e.password='Minimum 6 characters';if(form.password!==form.confirmPassword)e.confirmPassword='Passwords do not match';}
    setErrs(e);return Object.keys(e).length===0;
  }

  async function next(){
    if(!validate())return;
    if(step<3){setStep(s=>s+1);return;}
    setLoading(true);setServerErr('');
    const{data,error}=await DB.signupBeneficiary(form);
    setLoading(false);
    if(error){setServerErr(error.message||'Username may already be taken.');return;}
    onSubmit({username:form.username,userType:'beneficiary'});
  }

  const steps=['Personal Info','Identity & Raffle','Account Setup'];
  return (
    <div className="pe">
      <div style={{maxWidth:660,margin:'0 auto',padding:'36px 20px 60px'}}>
        <BackBtn onClick={onBack}/>
        <h1 style={{fontSize:26,fontWeight:800,color:C.blue,marginBottom:4}}>Open Your Account</h1>
        <p style={{color:C.inkMd,fontSize:14,marginBottom:24}}>Register as a raffle winner to begin your claims process.</p>
        <StepBar steps={steps} current={step}/>
        <FormCard title={`Step ${step}: ${steps[step-1]}`}>
          {serverErr&&<AlertBox type="error">{serverErr}</AlertBox>}
          {step===1&&<>
            <Grid2><FormField label="First Name" required error={errs.firstName}><input placeholder="John" value={form.firstName} onChange={e=>set('firstName',e.target.value)}/></FormField><FormField label="Last Name" required error={errs.lastName}><input placeholder="Doe" value={form.lastName} onChange={e=>set('lastName',e.target.value)}/></FormField></Grid2>
            <FormField label="Date of Birth" required error={errs.dob}><input type="date" value={form.dob} onChange={e=>set('dob',e.target.value)}/></FormField>
            <FormField label="Residential Address" required error={errs.address}><textarea placeholder="Full address including city and zip code" value={form.address} onChange={e=>set('address',e.target.value)} style={{minHeight:78}}/></FormField>
            <Grid2><FormField label="Phone Number" required error={errs.phone}><input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)}/></FormField><FormField label="Email Address" required error={errs.email}><input type="email" placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)}/></FormField></Grid2>
          </>}
          {step===2&&<>
            <Grid2><FormField label="ID Type" required error={errs.idType}><select value={form.idType} onChange={e=>set('idType',e.target.value)}>{ID_TYPES.map(o=><option key={o}>{o}</option>)}</select></FormField><FormField label="ID Number" required error={errs.idNumber}><input placeholder="Enter your ID number" value={form.idNumber} onChange={e=>set('idNumber',e.target.value)}/></FormField></Grid2>
            <FormField label="State / Province" required error={errs.state}><input placeholder="e.g. California" value={form.state} onChange={e=>set('state',e.target.value)}/></FormField>
            <FormField label="Raffle Code" required error={errs.raffleCode} hint="Paste your complete raffle confirmation code exactly as received — it may be a long alphanumeric string."><textarea placeholder="Enter your full raffle code here..." value={form.raffleCode} onChange={e=>set('raffleCode',e.target.value)} style={{minHeight:120}}/></FormField>
          </>}
          {step===3&&<>
            <AlertBox type="info">Create a username and password you will use to log in each time.</AlertBox>
            <FormField label="Username" required error={errs.username} hint="Minimum 4 characters."><input placeholder="Choose a username" value={form.username} onChange={e=>set('username',e.target.value)}/></FormField>
            <FormField label="Password" required error={errs.password} hint="Minimum 6 characters."><input type="password" placeholder="Create a strong password" value={form.password} onChange={e=>set('password',e.target.value)}/></FormField>
            <FormField label="Confirm Password" required error={errs.confirmPassword}><input type="password" placeholder="Repeat your password" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)}/></FormField>
          </>}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
            {step>1?<Btn variant="outline" onClick={()=>setStep(s=>s-1)}>← Previous</Btn>:<span/>}
            <Btn variant="primary" size="lg" onClick={next} disabled={loading}>{loading?'Submitting…':step<3?'Continue →':'Request Account'}</Btn>
          </div>
        </FormCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GUARANTOR SIGNUP
═══════════════════════════════════════════════════════════════ */
function GuarantorSignup({ onSubmit, onBack }) {
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({firstName:'',lastName:'',dob:'',address:'',phone:'',email:'',idType:'',idNumber:'',state:'',empStatus:'Employed',occupation:'',employer:'',username:'',password:'',confirmPassword:''});
  const [errs,setErrs]=useState({});
  const [loading,setLoading]=useState(false);
  const [serverErr,setServerErr]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  function validate(){
    const e={};
    if(step===1){if(!form.firstName.trim())e.firstName='Required';if(!form.lastName.trim())e.lastName='Required';if(!form.dob)e.dob='Required';if(!form.address.trim())e.address='Required';if(!form.phone.trim())e.phone='Required';if(!form.email.trim())e.email='Required';if(!form.idType||form.idType==='Select ID Type')e.idType='Required';if(!form.idNumber.trim())e.idNumber='Required';if(!form.state.trim())e.state='Required';}
    if(step===2){if(!form.occupation.trim())e.occupation='Required';if(!form.employer.trim())e.employer='Required';}
    if(step===3){if(!form.username||form.username.length<4)e.username='Min 4 characters';if(!form.password||form.password.length<6)e.password='Min 6 characters';if(form.password!==form.confirmPassword)e.confirmPassword='Passwords do not match';}
    setErrs(e);return Object.keys(e).length===0;
  }

  async function next(){
    if(!validate())return;
    if(step<3){setStep(s=>s+1);return;}
    setLoading(true);setServerErr('');
    const{data,error}=await DB.signupGuarantor(form);
    setLoading(false);
    if(error){setServerErr(error.message||'Username may already be taken.');return;}
    onSubmit({username:form.username,userType:'guarantor'});
  }

  const steps=['Personal Info','Employment','Account Setup'];
  return (
    <div className="pe">
      <div style={{maxWidth:660,margin:'0 auto',padding:'36px 20px 60px'}}>
        <BackBtn onClick={onBack}/>
        <AlertBox type="info">If you received an email invitation, register with the same email address and you will be automatically linked to the beneficiary's account.</AlertBox>
        <h1 style={{fontSize:26,fontWeight:800,color:C.blue,marginBottom:4}}>Guarantor Registration</h1>
        <p style={{color:C.inkMd,fontSize:14,marginBottom:24}}>Complete this form to support the raffle winner's account activation.</p>
        <StepBar steps={steps} current={step} color={C.gold}/>
        <FormCard title={`Step ${step}: ${steps[step-1]}`} topColor={C.gold}>
          {serverErr&&<AlertBox type="error">{serverErr}</AlertBox>}
          {step===1&&<>
            <Grid2><FormField label="First Name" required error={errs.firstName}><input placeholder="John" value={form.firstName} onChange={e=>set('firstName',e.target.value)}/></FormField><FormField label="Last Name" required error={errs.lastName}><input placeholder="Doe" value={form.lastName} onChange={e=>set('lastName',e.target.value)}/></FormField></Grid2>
            <FormField label="Date of Birth" required error={errs.dob}><input type="date" value={form.dob} onChange={e=>set('dob',e.target.value)}/></FormField>
            <FormField label="Residential Address" required error={errs.address}><textarea placeholder="Full address" value={form.address} onChange={e=>set('address',e.target.value)} style={{minHeight:78}}/></FormField>
            <Grid2><FormField label="Phone Number" required error={errs.phone}><input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)}/></FormField><FormField label="Email Address" required error={errs.email}><input type="email" placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)}/></FormField></Grid2>
            <Grid2><FormField label="ID Type" required error={errs.idType}><select value={form.idType} onChange={e=>set('idType',e.target.value)}>{ID_TYPES.map(o=><option key={o}>{o}</option>)}</select></FormField><FormField label="ID Number" required error={errs.idNumber}><input placeholder="Your ID number" value={form.idNumber} onChange={e=>set('idNumber',e.target.value)}/></FormField></Grid2>
            <FormField label="State / Province" required error={errs.state}><input placeholder="e.g. Texas" value={form.state} onChange={e=>set('state',e.target.value)}/></FormField>
          </>}
          {step===2&&<>
            <FormField label="Employment Status" required><select value={form.empStatus} onChange={e=>set('empStatus',e.target.value)}>{EMP.map(o=><option key={o}>{o}</option>)}</select></FormField>
            <FormField label="Occupation / Job Title" required error={errs.occupation}><input placeholder="e.g. Software Engineer, Business Owner" value={form.occupation} onChange={e=>set('occupation',e.target.value)}/></FormField>
            <FormField label="Employer / Business Name" required error={errs.employer} hint={form.empStatus==='Self-Employed'?'Enter your business name.':'Enter your employer\'s name.'}><input placeholder={form.empStatus==='Self-Employed'?'Business name':'Employer name'} value={form.employer} onChange={e=>set('employer',e.target.value)}/></FormField>
          </>}
          {step===3&&<>
            <AlertBox type="info">Create login credentials for your guarantor portal.</AlertBox>
            <FormField label="Username" required error={errs.username} hint="Minimum 4 characters."><input placeholder="Choose a username" value={form.username} onChange={e=>set('username',e.target.value)}/></FormField>
            <FormField label="Password" required error={errs.password} hint="Minimum 6 characters."><input type="password" placeholder="Create a password" value={form.password} onChange={e=>set('password',e.target.value)}/></FormField>
            <FormField label="Confirm Password" required error={errs.confirmPassword}><input type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)}/></FormField>
          </>}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
            {step>1?<Btn variant="outline" onClick={()=>setStep(s=>s-1)}>← Previous</Btn>:<span/>}
            <Btn variant="gold" size="lg" onClick={next} disabled={loading}>{loading?'Submitting…':step<3?'Continue →':'Complete Registration'}</Btn>
          </div>
        </FormCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, onBack, userType }) {
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const isG=userType==='guarantor';

  async function attempt(){
    if(!username.trim()||!password.trim()){setErr('Please enter your username and password.');return;}
    setLoading(true);setErr('');
    const{data,error}=await DB.loginUser(username,password,userType);
    setLoading(false);
    if(error||!data){setErr('Invalid username or password. Please try again.');return;}
    onLogin(data);
  }

  return (
    <div className="pe">
      <div style={{maxWidth:460,margin:'56px auto',padding:'0 20px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`4px solid ${isG?C.gold:C.blue}`,padding:'36px 32px',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          <h1 style={{fontSize:24,fontWeight:800,color:C.blue,marginBottom:4}}>{isG?'Guarantor Log In':'Member Log In'}</h1>
          <p style={{color:C.inkMd,fontSize:14,marginBottom:24}}>Enter your credentials to access your account.</p>
          {err&&<AlertBox type="error">{err}</AlertBox>}
          <FormField label="Username"><input placeholder="Your username" value={username} onChange={e=>setUsername(e.target.value)}/></FormField>
          <FormField label="Password"><input type="password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()}/></FormField>
          <Btn variant="primary" size="lg" full onClick={attempt} disabled={loading}>{loading?'Logging in…':'Log In →'}</Btn>
          {!isG&&<p style={{textAlign:'center',marginTop:18,fontSize:13,color:C.inkLt}}>Are you a guarantor? <button onClick={()=>onBack('g-login')} style={{color:C.blue,background:'none',border:'none',cursor:'pointer',fontWeight:600,fontFamily:'Poppins,sans-serif',fontSize:13}}>Log in here</button></p>}
        </div>
      </div>
    </div>
  );
}

/* ─── DASHBOARD MODALS ──────────────────────────────────────── */
function WithdrawalModal({ onClose, balance, onSubmit }) {
  const [form,setForm]=useState({accountName:'',accountNumber:'',routing:'',bankName:'',amount:''});
  const [done,setDone]=useState(false);
  const [loading,setLoading]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ready=form.accountName&&form.accountNumber&&form.routing&&form.bankName&&form.amount&&parseFloat(form.amount)>0&&parseFloat(form.amount)<=balance;
  return (
    <Modal title="Request Withdrawal" onClose={onClose}>
      {done?(<><AlertBox type="success"><strong>Withdrawal request submitted.</strong><br/>Your request is under review. Processing takes 3–5 business days. You will be notified by email once processed.</AlertBox><Btn variant="primary" full onClick={onClose}>Close</Btn></>):(
        <>
          <div style={{background:C.blueXlt,border:`1px solid ${C.line}`,borderRadius:3,padding:'14px 18px',marginBottom:22,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:12,color:C.inkLt,marginBottom:2}}>Available Balance</div><div style={{fontSize:24,fontWeight:800,color:C.blue}}>${balance.toLocaleString()}.00</div></div></div>
          <FormField label="Account Holder Name" required><input placeholder="Name on bank account" value={form.accountName} onChange={e=>set('accountName',e.target.value)}/></FormField>
          <Grid2><FormField label="Account Number" required><input placeholder="Account number" value={form.accountNumber} onChange={e=>set('accountNumber',e.target.value)}/></FormField><FormField label="Routing Number" required><input placeholder="Routing number" value={form.routing} onChange={e=>set('routing',e.target.value)}/></FormField></Grid2>
          <FormField label="Bank Name" required><input placeholder="e.g. Chase Bank" value={form.bankName} onChange={e=>set('bankName',e.target.value)}/></FormField>
          <FormField label="Amount (USD)" required hint={`Maximum: $${balance.toLocaleString()}`}><input type="number" placeholder="0.00" min={1} max={balance} value={form.amount} onChange={e=>set('amount',e.target.value)}/></FormField>
          <Btn variant="primary" size="lg" full disabled={!ready||loading} onClick={async()=>{setLoading(true);await onSubmit(form);setLoading(false);setDone(true);}}>{loading?'Submitting…':'Submit Withdrawal Request'}</Btn>
        </>
      )}
    </Modal>
  );
}

function AddAccountModal({ onClose, onSave }) {
  const [form,setForm]=useState({bankName:'',accountNumber:'',routing:'',accountType:'Checking'});
  const [done,setDone]=useState(false);const [loading,setLoading]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="Add Bank Account" onClose={onClose}>
      {done?(<><AlertBox type="success">Bank account saved and is pending verification.</AlertBox><Btn variant="primary" full onClick={onClose}>Done</Btn></>):(
        <>
          <FormField label="Bank Name" required><input placeholder="e.g. Bank of America" value={form.bankName} onChange={e=>set('bankName',e.target.value)}/></FormField>
          <Grid2><FormField label="Account Number" required><input placeholder="Account number" value={form.accountNumber} onChange={e=>set('accountNumber',e.target.value)}/></FormField><FormField label="Routing Number" required><input placeholder="Routing number" value={form.routing} onChange={e=>set('routing',e.target.value)}/></FormField></Grid2>
          <FormField label="Account Type"><select value={form.accountType} onChange={e=>set('accountType',e.target.value)}><option>Checking</option><option>Savings</option></select></FormField>
          <Btn variant="primary" size="lg" full disabled={!form.bankName||!form.accountNumber||!form.routing||loading} onClick={async()=>{setLoading(true);await onSave(form);setLoading(false);setDone(true);}}>{loading?'Saving…':'Save Account'}</Btn>
        </>
      )}
    </Modal>
  );
}

function HistoryModal({ onClose, history }) {
  return (
    <Modal title="Transaction History" onClose={onClose}>
      {history.length===0?(<div style={{textAlign:'center',padding:'32px 0',color:C.inkLt}}><div style={{fontSize:40,marginBottom:10}}>📭</div><p>No transactions on record yet.</p></div>)
        :history.map((tx,i)=>(<div key={i} style={{padding:'12px 0',borderBottom:i<history.length-1?`1px solid ${C.lineLt}`:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontWeight:600,fontSize:14}}>{tx.status==='approved'?'✅':tx.status==='rejected'?'❌':'⏳'} Withdrawal Request</div><div style={{fontSize:12,color:C.inkLt}}>{new Date(tx.created_at).toLocaleDateString()} · {tx.bank_name}</div>{tx.admin_note&&<div style={{fontSize:12,color:C.amber,marginTop:2}}>Note: {tx.admin_note}</div>}</div><div style={{fontWeight:700,color:tx.status==='rejected'?C.red:C.ink,fontSize:15}}>${parseFloat(tx.amount).toLocaleString()}</div></div>))
      }
      <div style={{marginTop:18}}><Btn variant="outline" full onClick={onClose}>Close</Btn></div>
    </Modal>
  );
}

function InviteGuarantorModal({ beneficiaryId, beneficiaryName, alreadyInvited, onInvited, onClose }) {
  const [form,setForm]=useState({name:'',email:'',phone:''});
  const [sent,setSent]=useState(false);const [loading,setLoading]=useState(false);const [err,setErr]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="Invite Your Guarantor" onClose={onClose}>
      {sent?(<><AlertBox type="success"><strong>Invitation sent!</strong><br/>Your guarantor <strong>{form.name}</strong> has been notified via email. Once they register with the same email, your account will become fully active.</AlertBox><Btn variant="primary" full onClick={onClose}>Done</Btn></>):(
        <>
          {alreadyInvited?<AlertBox type="warning">An invitation was already sent. You can resend below.</AlertBox>:<AlertBox type="info">Your guarantor will receive an invitation email with registration instructions. They must register using the same email address to be automatically linked to your account.</AlertBox>}
          {err&&<AlertBox type="error">{err}</AlertBox>}
          <FormField label="Guarantor Full Name" required><input placeholder="Full legal name" value={form.name} onChange={e=>set('name',e.target.value)}/></FormField>
          <FormField label="Guarantor Email" required><input type="email" placeholder="guarantor@email.com" value={form.email} onChange={e=>set('email',e.target.value)}/></FormField>
          <FormField label="Guarantor Phone" required><input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)}/></FormField>
          <Btn variant="primary" size="lg" full disabled={!form.name||!form.email||!form.phone||loading} onClick={async()=>{setLoading(true);const{error}=await DB.createInvite(beneficiaryId,{...form,beneficiaryName});setLoading(false);if(error){setErr(error.message);return;}onInvited();setSent(true);}}>{loading?'Sending…':'Send Invitation'}</Btn>
        </>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BENEFICIARY DASHBOARD
═══════════════════════════════════════════════════════════════ */
function BeneficiaryDashboard({ user: initUser }) {
  const [user,setUser]=useState(initUser);
  const [modal,setModal]=useState(null);
  const [accounts,setAccounts]=useState([]);
  const [history,setHistory]=useState([]);
  const [pokeMsg,setPokeMsg]=useState(false);
  const isActive=user.guarantor_status==='signed-up';
  const balance=parseFloat(user.account_balance)||0;

  useEffect(()=>{
    DB.getLinkedAccounts(user.id).then(setAccounts);
    DB.getTransactions(user.id).then(setHistory);
    // Refresh user data to get latest balance/status from DB
    DB.refreshBeneficiary(user.id).then(d=>{if(d)setUser(d)});
  },[user.id]);

  const statusMap={'not-invited':{lbl:'Pending Guarantor Invitation',col:C.amber,bg:C.amberBg},'invited':{lbl:'Guarantor Invited — Awaiting Registration',col:C.blue,bg:C.blueXlt},'signed-up':{lbl:'Account Active',col:C.green,bg:C.greenBg}};
  const sm=statusMap[user.guarantor_status];

  return (
    <div className="pe">
      {!isActive&&<div style={{background:C.amberBg,borderBottom:`2px solid ${C.gold}`,padding:'10px 36px',textAlign:'center',fontSize:13,color:C.amber,fontWeight:500}}>⚠  Your account requires guarantor activation. Invite your guarantor below to unlock full access.</div>}
      <div style={{maxWidth:1040,margin:'0 auto',padding:'36px 20px'}}>
        <h1 style={{fontSize:26,fontWeight:800,color:C.blue,marginBottom:4}}>Welcome back, {user.first_name} {user.last_name}</h1>
        <p style={{color:C.inkMd,fontSize:14,marginBottom:20}}>Account Overview · TrustWallet Raffle Portal</p>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:sm.bg,border:`1px solid ${sm.col}`,color:sm.col,padding:'7px 16px',borderRadius:3,fontSize:13,fontWeight:600,marginBottom:28}}><span style={{width:8,height:8,borderRadius:'50%',background:sm.col,flexShrink:0}}/>{sm.lbl}</div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:22,marginBottom:22}}>
          <div style={{background:C.blue,color:'#fff',padding:'32px 28px',borderBottom:`4px solid ${C.gold}`}}>
            <div style={{fontSize:12,opacity:.72,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Total Prize Balance</div>
            <div style={{fontSize:44,fontWeight:800,letterSpacing:'-.02em',marginBottom:4}}>${balance.toLocaleString()}<span style={{fontSize:22}}>.00</span></div>
            <div style={{fontSize:12,opacity:.65}}>USD · TrustWallet Raffle Prize Account</div>
            <div style={{marginTop:24,paddingTop:18,borderTop:'1px solid rgba(255,255,255,.2)',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              {[['Account ID',user.account_id],['Status',user.account_status],['Member Since',new Date(user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'})]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,opacity:.6,marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:600,textTransform:'capitalize'}}>{v}</div></div>
              ))}
            </div>
          </div>
          <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`3px solid ${C.blue}`,padding:20}}>
            <div style={{fontSize:11,color:C.inkLt,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:14}}>Quick Actions</div>
            {[{lbl:'💸  Request Withdrawal',action:()=>setModal('withdrawal'),dis:!isActive},{lbl:'🏦  Add Bank Account',action:()=>setModal('addAccount'),dis:!isActive},{lbl:'📋  Transaction History',action:()=>setModal('history'),dis:false}].map(a=>(<div key={a.lbl} style={{marginBottom:10}}><Btn variant={a.dis?'outline':'primary'} full disabled={a.dis} onClick={a.action} size="sm">{a.lbl}</Btn></div>))}
          </div>
        </div>
        {accounts.length>0&&(
          <div style={{background:'#fff',border:`1px solid ${C.line}`,padding:'22px 26px',marginBottom:22}}>
            <h3 style={{fontWeight:700,color:C.blue,fontSize:15,marginBottom:14}}>Linked Bank Accounts</h3>
            {accounts.map((a,i)=>(<div key={i} style={{padding:'10px 14px',background:C.blueXlt,border:`1px solid ${C.line}`,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span style={{fontWeight:600,fontSize:14}}>{a.bank_name}</span><span style={{color:C.inkLt,fontSize:12,marginLeft:10}}>···· {a.account_number.slice(-4)} · {a.account_type}</span></div><span style={{fontSize:11,background:a.status==='verified'?C.greenBg:C.amberBg,color:a.status==='verified'?C.green:C.amber,padding:'3px 10px',borderRadius:2,fontWeight:600,textTransform:'capitalize'}}>{a.status}</span></div>))}
          </div>
        )}
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderLeft:`5px solid ${isActive?C.green:C.gold}`,padding:'24px 28px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:14}}>
            <div>
              <h3 style={{fontSize:16,fontWeight:700,color:C.blue,marginBottom:5}}>🤝 Guarantor Status</h3>
              <p style={{fontSize:14,color:C.inkMd,maxWidth:460}}>{isActive?'Your guarantor has registered. Your account is fully active and all features are enabled.':'A guarantor must complete registration before your account is fully activated and withdrawals are enabled.'}</p>
              {pokeMsg&&<p style={{fontSize:13,color:C.green,marginTop:8,fontWeight:500}}>✓ Reminder sent to your guarantor via SMS and email.</p>}
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {user.guarantor_status==='invited'&&<Btn variant="outline" size="sm" onClick={()=>{setPokeMsg(true);setTimeout(()=>setPokeMsg(false),4000)}}>🔔 Send Reminder</Btn>}
              {!isActive&&<Btn variant="gold" onClick={()=>setModal('invite')}>{user.guarantor_status==='not-invited'?'Invite Guarantor →':'Re-send Invitation'}</Btn>}
            </div>
          </div>
        </div>
      </div>
      {modal==='invite'&&<InviteGuarantorModal beneficiaryId={user.id} beneficiaryName={`${user.first_name} ${user.last_name}`} alreadyInvited={user.guarantor_status==='invited'} onInvited={()=>setUser(u=>({...u,guarantor_status:'invited'}))} onClose={()=>setModal(null)}/>}
      {modal==='withdrawal'&&<WithdrawalModal onClose={()=>setModal(null)} balance={balance} onSubmit={async form=>{await DB.createTransaction(user.id,'beneficiary',user.id,form);setHistory(await DB.getTransactions(user.id));}}/>}
      {modal==='addAccount'&&<AddAccountModal onClose={()=>setModal(null)} onSave={async a=>{await DB.addLinkedAccount(user.id,a);setAccounts(await DB.getLinkedAccounts(user.id));}}/>}
      {modal==='history'&&<HistoryModal onClose={()=>setModal(null)} history={history}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GUARANTOR DASHBOARD
═══════════════════════════════════════════════════════════════ */
function GuarantorDashboard({ user: initUser }) {
  const [user,setUser]=useState(initUser);
  const [beneficiary,setBeneficiary]=useState(null);
  const [modal,setModal]=useState(null);
  const [history,setHistory]=useState([]);

  useEffect(()=>{
    DB.refreshGuarantor(user.id).then(d=>{
      if(d){setUser(d);if(d.beneficiaries)setBeneficiary(d.beneficiaries);}
    });
    DB.getTransactions(user.id).then(setHistory);
  },[user.id]);

  const balance=parseFloat(beneficiary?.account_balance)||142000;

  return (
    <div className="pe">
      <div style={{maxWidth:1040,margin:'0 auto',padding:'36px 20px'}}>
        <h1 style={{fontSize:26,fontWeight:800,color:C.blue,marginBottom:4}}>Guarantor Dashboard</h1>
        <p style={{color:C.inkMd,fontSize:14,marginBottom:28}}>Welcome, {user.first_name} {user.last_name} — you are acting as guarantor for <strong>{beneficiary?`${beneficiary.first_name} ${beneficiary.last_name}`:'the account holder'}</strong>.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:22,marginBottom:22}}>
          <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`4px solid ${C.blue}`,padding:26}}>
            <div style={{fontSize:11,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14,fontWeight:600}}>Beneficiary Account Details</div>
            {[['Beneficiary Name',beneficiary?`${beneficiary.first_name} ${beneficiary.last_name}`:'Not linked yet'],['Prize Won',`$${balance.toLocaleString()}.00 USD`],['Account Status',beneficiary?'Active':'—'],['Account ID',beneficiary?.account_id||'—']].map(([l,v])=>(<div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${C.lineLt}`,fontSize:14}}><span style={{color:C.inkMd}}>{l}</span><span style={{fontWeight:600}}>{v}</span></div>))}
          </div>
          <div style={{background:C.blue,color:'#fff',padding:26,borderBottom:`4px solid ${C.gold}`,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
            <div><div style={{fontSize:11,opacity:.72,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Total Account Balance</div><div style={{fontSize:40,fontWeight:800,letterSpacing:'-.02em'}}>${balance.toLocaleString()}<span style={{fontSize:20}}>.00</span></div><div style={{fontSize:12,opacity:.65,marginTop:4}}>USD · Available for Disbursement</div></div>
            <div style={{marginTop:28}}><Btn variant="gold" size="lg" full onClick={()=>setModal('withdrawal')}>💸  Request Withdrawal on Behalf</Btn></div>
          </div>
        </div>
        <div style={{background:'#fff',border:`1px solid ${C.line}`,padding:'22px 26px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontWeight:700,color:C.blue,fontSize:15}}>Transaction History</h3>
            {history.length>0&&<Btn variant="ghost" size="sm" onClick={()=>setModal('history')}>View All</Btn>}
          </div>
          {history.length===0?<p style={{color:C.inkLt,fontSize:14}}>No transactions on record.</p>:history.slice(0,3).map((tx,i)=>(<div key={i} style={{padding:'9px 0',borderBottom:`1px solid ${C.lineLt}`,display:'flex',justifyContent:'space-between',fontSize:14}}><span>{tx.status==='approved'?'✅':tx.status==='rejected'?'❌':'⏳'} Withdrawal · {tx.bank_name}</span><span style={{fontWeight:600,color:C.ink}}>${parseFloat(tx.amount).toLocaleString()}</span></div>))}
        </div>
      </div>
      {modal==='withdrawal'&&<WithdrawalModal onClose={()=>setModal(null)} balance={balance} onSubmit={async form=>{await DB.createTransaction(user.id,'guarantor',beneficiary?.id||null,form);setHistory(await DB.getTransactions(user.id));}}/>}
      {modal==='history'&&<HistoryModal onClose={()=>setModal(null)} history={history}/>}
    </div>
  );
}

/* ─── SIGNUP SUCCESS ─────────────────────────────────────────── */
function SignupSuccess({ username, userType, onGoToLogin }) {
  const isG=userType==='guarantor';
  return (
    <div className="pe" style={{maxWidth:520,margin:'72px auto',padding:'0 20px'}}>
      <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`4px solid ${C.green}`,padding:'44px 36px',textAlign:'center',boxShadow:'0 4px 20px rgba(0,0,0,.08)'}}>
        <div style={{fontSize:52,marginBottom:18}}>✅</div>
        <h2 style={{fontSize:24,fontWeight:800,color:C.green,marginBottom:8}}>{isG?'Guarantor Registration Complete':'Account Request Submitted'}</h2>
        <p style={{color:C.inkMd,fontSize:15,marginBottom:8}}>{isG?'Your guarantor account is active. The beneficiary will be notified automatically.':'Your registration is under review. You will be notified once your account is verified.'}</p>
        <p style={{color:C.inkLt,fontSize:13,marginBottom:30}}>Username: <strong style={{color:C.ink}}>{username}</strong></p>
        <Btn variant="primary" size="lg" full onClick={onGoToLogin}>Proceed to Log In →</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [page,setPage]             = useState('landing');
  const [currentUser,setCurrentUser] = useState(null);
  const [userType,setUserType]     = useState(null);
  const [notifications,setNotifs] = useState([]);
  const [popups,setPopups]         = useState([]);
  const [successData,setSuccess]   = useState(null);
  const [showPopup,setShowPopup]   = useState(false);

  function logout(){setCurrentUser(null);setUserType(null);setNotifs([]);setPopups([]);setPage('landing');}

  async function afterLogin(user,type){
    setCurrentUser(user);setUserType(type);
    // Load notifications
    const{data:notifs}=await DB.getNotifications(user.id,type);
    setNotifs(notifs||[]);
    // Load pending popups
    const pops=await DB.getActivePopups(user.id,type);
    if(pops.length>0){setPopups(pops);setShowPopup(true);}
    setPage(type==='beneficiary'?'b-dashboard':'g-dashboard');
  }

  async function handleMarkRead(id){
    await DB.markNotificationRead(id);
    setNotifs(n=>n.map(x=>x.id===id?{...x,is_read:true}:x));
  }

  async function handleMarkAllRead(){
    if(!currentUser)return;
    await DB.markAllRead(currentUser.id,userType);
    setNotifs(n=>n.map(x=>({...x,is_read:true})));
  }

  if(page==='admin') return <AdminPanel onBack={()=>setPage('landing')}/>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <TopBar onHome={()=>{setCurrentUser(null);setUserType(null);setPage('landing');}} currentUser={currentUser} userType={userType} onLogout={logout} notifications={notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}/>
      {showPopup&&currentUser&&<PopupManager popups={popups} userId={currentUser.id} onDismiss={()=>setShowPopup(false)}/>}
      <main>
        {page==='landing'    && <Landing onOpenAccount={()=>setPage('b-signup')} onLogin={t=>{setUserType(t);setPage('login');}} onGuarantorSignup={()=>setPage('g-signup')} onAdmin={()=>setPage('admin')}/>}
        {page==='b-signup'   && <BeneficiarySignup onSubmit={d=>{setSuccess(d);setPage('signup-success');}} onBack={()=>setPage('landing')}/>}
        {page==='g-signup'   && <GuarantorSignup onSubmit={d=>{setSuccess(d);setPage('signup-success');}} onBack={()=>setPage('landing')}/>}
        {page==='login'      && <LoginPage onLogin={u=>afterLogin(u,userType)} onBack={p=>{if(p==='g-login'){setUserType('guarantor');}else setPage('landing');}} userType={userType||'beneficiary'}/>}
        {page==='b-dashboard'&& currentUser && <BeneficiaryDashboard user={currentUser}/>}
        {page==='g-dashboard'&& currentUser && <GuarantorDashboard user={currentUser}/>}
        {page==='signup-success'&&successData&&<SignupSuccess username={successData.username} userType={successData.userType} onGoToLogin={()=>{setUserType(successData.userType);setPage('login');}}/>}
      </main>
    </>
  );
}

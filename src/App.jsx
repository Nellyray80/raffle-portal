// src/App.jsx
import { useState, useEffect } from 'react';
import * as DB from './lib/supabase';
import AdminPanel from './AdminPanel';

/* ─── COLOR TOKENS ──────────────────────────────────────────── */
const C = {
  navy:    '#0F2557',
  blue:    '#1C3D78',
  blueDk:  '#162E5F',
  blueXlt: '#EFF6FF',
  gold:    '#B8860B',
  goldlt:  '#FDF6E3',
  goldTxt: '#6B4F04',
  bg:      '#F2F5FA',
  ink:     '#0F172A',
  inkMd:   '#334155',
  inkLt:   '#64748B',
  line:    '#CBD5E1',
  lineLt:  '#E2E8F0',
  green:   '#166534',
  greenBg: '#F0FDF4',
  red:     '#991B1B',
  redBg:   '#FEF2F2',
  amber:   '#92400E',
  amberBg: '#FFFBEB',
};

/* ─── GLOBAL CSS ─────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:${C.bg};color:${C.ink};font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
input,select,textarea,button{font-family:'Inter',sans-serif}
input,select,textarea{width:100%;padding:10px 13px;border:1px solid ${C.line};border-radius:4px;font-size:14px;color:${C.ink};background:#fff;transition:border-color .15s,box-shadow .15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:${C.blue};box-shadow:0 0 0 3px rgba(28,61,120,.1)}
input::placeholder,textarea::placeholder{color:#94A3B8}
input[type="date"]{color-scheme:light}
textarea{resize:vertical;min-height:88px;line-height:1.55}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath fill='%2364748B' d='M5.5 7 0 0h11z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;padding-right:36px}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.pe{animation:fadeUp .22s ease forwards}
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.modal-box{background:#fff;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.22)}
.notif-dropdown{position:absolute;top:62px;right:0;width:360px;background:#fff;border:1px solid ${C.line};border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,.14);z-index:200;max-height:440px;overflow-y:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:4px;font-family:'Inter',sans-serif;font-weight:600;letter-spacing:.01em;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s;text-decoration:none;white-space:nowrap}
.btn:disabled{opacity:.45;cursor:not-allowed;pointer-events:none}
.btn-sm{padding:7px 16px;font-size:13px}
.btn-md{padding:10px 22px;font-size:14px}
.btn-lg{padding:13px 28px;font-size:15px}
.btn-full{width:100%}
.btn-primary{background:${C.blue};color:#fff;border:none}
.btn-primary:hover{background:${C.blueDk}}
.btn-gold{background:${C.gold};color:#fff;border:none}
.btn-gold:hover{background:#9A7009}
.btn-outline{background:transparent;color:${C.blue};border:1.5px solid ${C.blue}}
.btn-outline:hover{background:${C.blueXlt}}
.btn-outlineW{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.45)}
.btn-outlineW:hover{background:rgba(255,255,255,.1)}
.btn-ghost{background:transparent;color:${C.blue};border:none}
.btn-ghost:hover{background:${C.blueXlt}}
.btn-danger{background:${C.red};color:#fff;border:none}
.btn-danger:hover{background:#7F1D1D}
.btn-success{background:${C.green};color:#fff;border:none}
.btn-success:hover{background:#14532D}
.section-label{font-size:11px;font-weight:700;color:${C.inkLt};text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid ${C.lineLt}}
.data-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid ${C.lineLt};font-size:14px}
.data-row:last-child{border-bottom:none}
.status-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:2px;font-size:12px;font-weight:600;letter-spacing:.03em}
`;

/* ─── PRIMITIVES ─────────────────────────────────────────────── */
function Btn({ children, variant='primary', size='md', onClick, disabled, full, type='button' }) {
  const cls = ['btn',`btn-${variant}`,`btn-${size}`,full?'btn-full':''].filter(Boolean).join(' ');
  return <button type={type} className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
}

function FormField({ label, required, error, hint, children }) {
  return (
    <div style={{marginBottom:18}}>
      {label&&<label style={{display:'block',fontSize:13,fontWeight:600,color:C.inkMd,marginBottom:6}}>{label}{required&&<span style={{color:C.red,marginLeft:2}}>*</span>}</label>}
      {children}
      {hint&&!error&&<p style={{fontSize:12,color:C.inkLt,marginTop:5,lineHeight:1.5}}>{hint}</p>}
      {error&&<p style={{fontSize:12,color:C.red,marginTop:5,fontWeight:500}}>{error}</p>}
    </div>
  );
}

function AlertBox({ type='info', children }) {
  const m = {
    success:{bg:C.greenBg,col:C.green,bdr:'#BBF7D0',lbl:''},
    error:  {bg:C.redBg,  col:C.red,  bdr:'#FECACA',lbl:''},
    warning:{bg:C.amberBg,col:C.amber,bdr:'#FDE68A',lbl:''},
    info:   {bg:C.blueXlt,col:C.blue, bdr:'#BFDBFE',lbl:''},
  }[type];
  return (
    <div style={{background:m.bg,border:`1px solid ${m.bdr}`,borderLeft:`3px solid ${m.col}`,padding:'11px 15px',borderRadius:'0 4px 4px 0',marginBottom:18}}>
      <span style={{color:m.col,fontSize:13,lineHeight:1.6}}>{children}</span>
    </div>
  );
}

function Spinner() {
  return <div style={{display:'flex',justifyContent:'center',padding:'48px'}}><div style={{width:32,height:32,border:`2px solid ${C.line}`,borderTop:`2px solid ${C.blue}`,borderRadius:'50%',animation:'spin .7s linear infinite'}}/></div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div style={{padding:'16px 22px',background:C.navy,color:'#fff',borderRadius:'6px 6px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`3px solid ${C.gold}`}}>
          <h3 style={{fontSize:15,fontWeight:700,letterSpacing:'.01em'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',cursor:'pointer',fontSize:20,lineHeight:1,padding:'0 2px',fontFamily:'Inter,sans-serif'}}>&times;</button>
        </div>
        <div style={{padding:'24px 22px'}}>{children}</div>
      </div>
    </div>
  );
}

function FormCard({ title, topColor=C.blue, children }) {
  return (
    <div style={{background:'#fff',border:`1px solid ${C.line}`,borderRadius:5,borderTop:`3px solid ${topColor}`,padding:'28px 26px',boxShadow:'0 1px 6px rgba(0,0,0,.06)',marginBottom:20}}>
      {title&&<h2 style={{fontSize:15,fontWeight:700,color:C.navy,marginBottom:20,paddingBottom:12,borderBottom:`1px solid ${C.lineLt}`}}>{title}</h2>}
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}

function StepBar({ steps, current, color=C.blue }) {
  return (
    <div style={{display:'flex',gap:0,marginBottom:24,background:'#fff',border:`1px solid ${C.line}`,borderRadius:4,overflow:'hidden'}}>
      {steps.map((s,i)=>{
        const done=i+1<current, active=i+1===current;
        return (
          <div key={s} style={{flex:1,padding:'12px 16px',borderRight:i<steps.length-1?`1px solid ${C.line}`:'none',background:active?color:done?C.blueXlt:'#fff',transition:'background .2s'}}>
            <div style={{fontSize:11,fontWeight:700,color:active?'#fff':done?color:C.inkLt,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:2}}>{`Step ${i+1}`}</div>
            <div style={{fontSize:13,fontWeight:active?600:400,color:active?'#fff':done?color:C.inkMd}}>{s}</div>
          </div>
        );
      })}
    </div>
  );
}

function Grid2({ children, gap='0 16px' }) {
  return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap}}>{children}</div>;
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{background:'none',border:'none',color:C.blue,cursor:'pointer',fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:5,marginBottom:20,padding:0,fontFamily:'Inter,sans-serif'}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Home
    </button>
  );
}

function Divider({ label }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0 18px'}}>
      <div style={{flex:1,height:1,background:C.lineLt}}/>
      {label&&<span style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.08em',flexShrink:0}}>{label}</span>}
      {label&&<div style={{flex:1,height:1,background:C.lineLt}}/>}
    </div>
  );
}

/* ─── BELL SVG ───────────────────────────────────────────────── */
function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

/* ─── NOTIFICATION BELL ─────────────────────────────────────── */
function NotificationBell({ notifications, onMarkRead, onMarkAllRead }) {
  const [open,setOpen]=useState(false);
  const unread=notifications.filter(n=>!n.is_read).length;
  const typeCol={success:C.green,error:C.red,warning:C.amber,info:C.blue};
  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',width:38,height:38,borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',transition:'background .15s'}}>
        <BellIcon/>
        {unread>0&&<span style={{position:'absolute',top:-5,right:-5,background:C.red,color:'#fff',borderRadius:'50%',width:17,height:17,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>{unread>9?'9+':unread}</span>}
      </button>
      {open&&(
        <div className="notif-dropdown">
          <div style={{padding:'11px 15px',borderBottom:`1px solid ${C.lineLt}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,fontWeight:700,color:C.navy}}>Notifications</span>
            {unread>0&&<button onClick={()=>{onMarkAllRead();setOpen(false)}} style={{background:'none',border:'none',color:C.blue,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'Inter,sans-serif'}}>Mark all read</button>}
          </div>
          {notifications.length===0
            ?<div style={{padding:'28px 16px',textAlign:'center',color:C.inkLt,fontSize:13}}>No notifications.</div>
            :notifications.map(n=>(
              <div key={n.id} onClick={()=>onMarkRead(n.id)} style={{padding:'11px 15px',borderBottom:`1px solid ${C.lineLt}`,background:n.is_read?'#fff':'#FAFCFF',cursor:'pointer'}}>
                <div style={{display:'flex',gap:9,alignItems:'flex-start'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:typeCol[n.type]||C.blue,flexShrink:0,marginTop:5}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.ink,marginBottom:2}}>{n.title}</div>
                    <div style={{fontSize:12,color:C.inkMd,lineHeight:1.5}}>{n.message}</div>
                    <div style={{fontSize:11,color:C.inkLt,marginTop:3}}>{new Date(n.created_at).toLocaleString()}</div>
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
  const [index,setIndex]=useState(0);
  if(!popups.length||index>=popups.length)return null;
  const p=popups[index];
  const colMap={info:C.blue,success:C.green,warning:C.amber,error:C.red};
  return (
    <Modal title={p.title} onClose={async()=>{await DB.markPopupSeen(p.id,userId);setIndex(i=>i+1);onDismiss();}}>
      <div style={{borderTop:`3px solid ${colMap[p.type]||C.blue}`,marginTop:-24,paddingTop:24}}>
        <p style={{fontSize:15,color:C.inkMd,lineHeight:1.7,marginBottom:20}}>{p.body}</p>
        <Btn variant="primary" full size="lg" onClick={async()=>{await DB.markPopupSeen(p.id,userId);setIndex(i=>i+1);onDismiss();}}>Acknowledge</Btn>
      </div>
    </Modal>
  );
}

/* ─── TOP BAR ────────────────────────────────────────────────── */
function TopBar({ onHome, currentUser, userType, onLogout, notifications, onMarkRead, onMarkAllRead }) {
  return (
    <header style={{background:C.navy,borderBottom:`3px solid ${C.gold}`,color:'#fff',padding:'0 40px',height:62,display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,.2)',position:'sticky',top:0,zIndex:100}}>
      <div onClick={onHome} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:34,height:34,background:C.gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',letterSpacing:'.03em',flexShrink:0}}>TW</div>
        <div>
          <div style={{fontWeight:700,fontSize:14,letterSpacing:'.02em',lineHeight:1.2}}>TrustWallet</div>
          <div style={{fontSize:10,opacity:.55,letterSpacing:'.12em',textTransform:'uppercase',marginTop:1}}>Raffle Portal</div>
        </div>
      </div>
      {currentUser&&(
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <NotificationBell notifications={notifications} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead}/>
          <div style={{borderLeft:'1px solid rgba(255,255,255,.15)',paddingLeft:14,textAlign:'right'}}>
            <div style={{fontSize:13,fontWeight:600,lineHeight:1.2}}>{currentUser.first_name} {currentUser.last_name}</div>
            <div style={{fontSize:11,opacity:.5,textTransform:'capitalize',marginTop:1}}>{userType}</div>
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
  return (
    <div className="pe">
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg, ${C.navy} 0%, ${C.blue} 100%)`,color:'#fff',padding:'64px 40px 56px',textAlign:'center',borderBottom:`3px solid ${C.gold}`}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'.2em',textTransform:'uppercase',opacity:.6,marginBottom:14}}>TrustWallet Financial Services</div>
        <h1 style={{fontSize:32,fontWeight:800,marginBottom:12,letterSpacing:'-.02em',lineHeight:1.2}}>Raffle Prize Management Portal</h1>
        <p style={{fontSize:15,opacity:.75,maxWidth:480,margin:'0 auto 8px',lineHeight:1.7}}>Official portal for verified raffle prize winners and their appointed guarantors.</p>
        <p style={{fontSize:12,opacity:.45,letterSpacing:'.06em',textTransform:'uppercase',marginTop:10}}>Secure &nbsp;&bull;&nbsp; Encrypted &nbsp;&bull;&nbsp; FDIC-Compliant Processes</p>
      </div>

      {/* Notice bar */}
      <div style={{background:C.goldlt,borderBottom:`1px solid #E8D48A`,padding:'10px 40px',textAlign:'center',fontSize:13,color:C.goldTxt,fontWeight:500}}>
        All accounts are subject to identity verification. Please have your government-issued ID and raffle confirmation code ready.
      </div>

      {/* Service cards */}
      <div style={{maxWidth:980,margin:'48px auto',padding:'0 24px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
        {[
          {tag:'Raffle Winner',title:'Open an Account',desc:'Verified raffle winners may register here to establish their prize account and initiate the claims process.',cta:'Start Registration',action:onOpenAccount,accent:C.gold,v:'gold'},
          {tag:'Existing Member',title:'Member Sign In',desc:'Sign in to access your account dashboard, review your prize balance, and manage withdrawal requests.',cta:'Sign In',action:()=>onLogin('beneficiary'),accent:C.blue,v:'primary'},
          {tag:'Invited Guarantor',title:'Guarantor Registration',desc:'If you received an invitation from a prize winner, register here to serve as their guarantor and activate their account.',cta:'Register as Guarantor',action:onGuarantorSignup,accent:C.blue,v:'outline'},
        ].map(c=>(
          <div key={c.title} style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`3px solid ${c.accent}`,borderRadius:5,padding:'28px 24px',boxShadow:'0 1px 6px rgba(0,0,0,.05)',display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>{c.tag}</div>
            <h2 style={{fontSize:18,fontWeight:700,color:C.navy,marginBottom:10,letterSpacing:'-.01em'}}>{c.title}</h2>
            <p style={{fontSize:14,color:C.inkMd,lineHeight:1.7,marginBottom:24,flex:1}}>{c.desc}</p>
            <Btn variant={c.v} onClick={c.action}>{c.cta}</Btn>
          </div>
        ))}
      </div>

      {/* Info strip */}
      <div style={{maxWidth:980,margin:'0 auto 48px',padding:'0 24px'}}>
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderRadius:4,padding:'18px 24px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
          {[['256-bit Encryption','All data is secured with bank-grade encryption.'],['Identity Verified','Every account requires government-issued ID.'],['Regulated Process','Prize disbursements follow strict compliance protocols.']].map(([h,d])=>(
            <div key={h} style={{paddingLeft:14,borderLeft:`2px solid ${C.gold}`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:3}}>{h}</div>
              <div style={{fontSize:12,color:C.inkLt,lineHeight:1.5}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      <footer style={{background:'#0A1A3D',color:'rgba(255,255,255,.4)',padding:'18px 40px',textAlign:'center',fontSize:12,lineHeight:1.8}}>
        TrustWallet Raffle Management Portal &nbsp;&bull;&nbsp; Secure &amp; Encrypted &nbsp;&bull;&nbsp; &copy; {new Date().getFullYear()} TrustWallet Financial Services
        <span onClick={onAdmin} style={{marginLeft:28,cursor:'pointer',opacity:.3,fontSize:11}}>Admin</span>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIGNUP CONSTANTS
═══════════════════════════════════════════════════════════════ */
const ID_TYPES = ['Select ID Type',"Driver's License",'State ID Card','International Passport',"Voter's Registration Card",'Social Security Card'];
const EMP = ['Employed','Self-Employed','Retired','Other'];

/* ═══════════════════════════════════════════════════════════════
   BENEFICIARY SIGNUP
═══════════════════════════════════════════════════════════════ */
function BeneficiarySignup({ onSubmit, onBack }) {
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({firstName:'',lastName:'',dob:'',address:'',phone:'',email:'',idType:'',idNumber:'',ssn:'',state:'',raffleCode:'',username:'',password:'',confirmPassword:''});
  const [errs,setErrs]=useState({});
  const [loading,setLoading]=useState(false);
  const [serverErr,setServerErr]=useState('');
  const [showSsn,setShowSsn]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  function validate(){
    const e={};
    if(step===1){
      if(!form.firstName.trim())e.firstName='Required';
      if(!form.lastName.trim())e.lastName='Required';
      if(!form.dob)e.dob='Required';
      if(!form.address.trim())e.address='Required';
      if(!form.phone.trim())e.phone='Required';
      if(!form.email.trim())e.email='Required';
    }
    if(step===2){
      if(!form.idType||form.idType==='Select ID Type')e.idType='Select an ID type';
      if(!form.idNumber.trim())e.idNumber='Required';
      if(!form.ssn.trim())e.ssn='Required';
      if(!form.state.trim())e.state='Required';
      if(!form.raffleCode.trim())e.raffleCode='Required';
    }
    if(step===3){
      if(!form.username||form.username.length<4)e.username='Minimum 4 characters';
      if(!form.password||form.password.length<6)e.password='Minimum 6 characters';
      if(form.password!==form.confirmPassword)e.confirmPassword='Passwords do not match';
    }
    setErrs(e);return Object.keys(e).length===0;
  }

  async function next(){
    if(!validate())return;
    if(step<3){setStep(s=>s+1);return;}
    setLoading(true);setServerErr('');
    const{data,error}=await DB.signupBeneficiary(form);
    setLoading(false);
    if(error){setServerErr(error.message||'Username may already be taken. Please choose another.');return;}
    onSubmit({username:form.username,userType:'beneficiary'});
  }

  const steps=['Personal Information','Identity & Verification','Account Credentials'];
  return (
    <div className="pe">
      <div style={{maxWidth:680,margin:'0 auto',padding:'36px 24px 60px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:24,fontWeight:800,color:C.navy,marginBottom:4,letterSpacing:'-.01em'}}>Open a Prize Account</h1>
          <p style={{color:C.inkLt,fontSize:14}}>Complete all three steps to register as a raffle prize winner.</p>
        </div>
        <StepBar steps={steps} current={step}/>
        <FormCard title={steps[step-1]} topColor={C.blue}>
          {serverErr&&<AlertBox type="error">{serverErr}</AlertBox>}

          {step===1&&<>
            <SectionLabel>Full Legal Name</SectionLabel>
            <Grid2>
              <FormField label="First Name" required error={errs.firstName}><input placeholder="John" value={form.firstName} onChange={e=>set('firstName',e.target.value)}/></FormField>
              <FormField label="Last Name" required error={errs.lastName}><input placeholder="Doe" value={form.lastName} onChange={e=>set('lastName',e.target.value)}/></FormField>
            </Grid2>
            <Divider label="Contact & Address"/>
            <FormField label="Date of Birth" required error={errs.dob}><input type="date" value={form.dob} onChange={e=>set('dob',e.target.value)}/></FormField>
            <FormField label="Residential Address" required error={errs.address}><textarea placeholder="Street address, city, state, ZIP code" value={form.address} onChange={e=>set('address',e.target.value)}/></FormField>
            <Grid2>
              <FormField label="Phone Number" required error={errs.phone}><input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)}/></FormField>
              <FormField label="Email Address" required error={errs.email}><input type="email" placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)}/></FormField>
            </Grid2>
          </>}

          {step===2&&<>
            <SectionLabel>Government-Issued Identification</SectionLabel>
            <Grid2>
              <FormField label="ID Type" required error={errs.idType}>
                <select value={form.idType} onChange={e=>set('idType',e.target.value)}>
                  {ID_TYPES.map(o=><option key={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="ID Number" required error={errs.idNumber}><input placeholder="Enter your ID number" value={form.idNumber} onChange={e=>set('idNumber',e.target.value)}/></FormField>
            </Grid2>
            <Grid2>
              <FormField label="Social Security Number" required error={errs.ssn} hint="Your SSN is encrypted and used for identity verification only.">
                <div style={{position:'relative'}}>
                  <input type={showSsn?'text':'password'} placeholder="XXX-XX-XXXX" value={form.ssn} onChange={e=>set('ssn',e.target.value)} style={{paddingRight:48}}/>
                  <button type="button" onClick={()=>setShowSsn(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.inkLt,fontSize:12,fontWeight:600,fontFamily:'Inter,sans-serif',padding:0}}>{showSsn?'Hide':'Show'}</button>
                </div>
              </FormField>
              <FormField label="State / Province" required error={errs.state}><input placeholder="e.g. California" value={form.state} onChange={e=>set('state',e.target.value)}/></FormField>
            </Grid2>
            <Divider label="Raffle Verification"/>
            <FormField label="Raffle Confirmation Code" required error={errs.raffleCode} hint="Paste your complete raffle confirmation code exactly as received.">
              <textarea placeholder="Enter your full raffle confirmation code..." value={form.raffleCode} onChange={e=>set('raffleCode',e.target.value)} style={{minHeight:110}}/>
            </FormField>
          </>}

          {step===3&&<>
            <AlertBox type="info">Create the username and password you will use to access your account going forward.</AlertBox>
            <FormField label="Username" required error={errs.username} hint="Minimum 4 characters. Letters, numbers, and underscores only."><input placeholder="Choose a username" value={form.username} onChange={e=>set('username',e.target.value)}/></FormField>
            <Grid2>
              <FormField label="Password" required error={errs.password} hint="Minimum 6 characters."><input type="password" placeholder="Create a password" value={form.password} onChange={e=>set('password',e.target.value)}/></FormField>
              <FormField label="Confirm Password" required error={errs.confirmPassword}><input type="password" placeholder="Repeat your password" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)}/></FormField>
            </Grid2>
          </>}

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:16,borderTop:`1px solid ${C.lineLt}`}}>
            {step>1?<Btn variant="outline" onClick={()=>setStep(s=>s-1)}>Previous Step</Btn>:<span/>}
            <Btn variant="primary" size="lg" onClick={next} disabled={loading}>{loading?'Submitting...':(step<3?'Continue':'Submit Application')}</Btn>
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
  const [form,setForm]=useState({firstName:'',lastName:'',dob:'',address:'',phone:'',email:'',idType:'',idNumber:'',ssn:'',state:'',empStatus:'Employed',occupation:'',employer:'',username:'',password:'',confirmPassword:''});
  const [errs,setErrs]=useState({});
  const [loading,setLoading]=useState(false);
  const [serverErr,setServerErr]=useState('');
  const [showSsn,setShowSsn]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  function validate(){
    const e={};
    if(step===1){
      if(!form.firstName.trim())e.firstName='Required';
      if(!form.lastName.trim())e.lastName='Required';
      if(!form.dob)e.dob='Required';
      if(!form.address.trim())e.address='Required';
      if(!form.phone.trim())e.phone='Required';
      if(!form.email.trim())e.email='Required';
      if(!form.idType||form.idType==='Select ID Type')e.idType='Select an ID type';
      if(!form.idNumber.trim())e.idNumber='Required';
      if(!form.ssn.trim())e.ssn='Required';
      if(!form.state.trim())e.state='Required';
    }
    if(step===2){
      if(!form.occupation.trim())e.occupation='Required';
      if(!form.employer.trim())e.employer='Required';
    }
    if(step===3){
      if(!form.username||form.username.length<4)e.username='Minimum 4 characters';
      if(!form.password||form.password.length<6)e.password='Minimum 6 characters';
      if(form.password!==form.confirmPassword)e.confirmPassword='Passwords do not match';
    }
    setErrs(e);return Object.keys(e).length===0;
  }

  async function next(){
    if(!validate())return;
    if(step<3){setStep(s=>s+1);return;}
    setLoading(true);setServerErr('');
    const{data,error}=await DB.signupGuarantor(form);
    setLoading(false);
    if(error){setServerErr(error.message||'Username may already be taken. Please choose another.');return;}
    onSubmit({username:form.username,userType:'guarantor'});
  }

  const steps=['Personal & Identity','Employment','Account Credentials'];
  return (
    <div className="pe">
      <div style={{maxWidth:680,margin:'0 auto',padding:'36px 24px 60px'}}>
        <BackBtn onClick={onBack}/>
        <AlertBox type="info">If you received an invitation, register using the same email address — your account will be linked automatically.</AlertBox>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:24,fontWeight:800,color:C.navy,marginBottom:4,letterSpacing:'-.01em'}}>Guarantor Registration</h1>
          <p style={{color:C.inkLt,fontSize:14}}>Complete all steps to register as a guarantor and activate the associated account.</p>
        </div>
        <StepBar steps={steps} current={step} color={C.gold}/>
        <FormCard title={steps[step-1]} topColor={C.gold}>
          {serverErr&&<AlertBox type="error">{serverErr}</AlertBox>}

          {step===1&&<>
            <SectionLabel>Full Legal Name</SectionLabel>
            <Grid2>
              <FormField label="First Name" required error={errs.firstName}><input placeholder="John" value={form.firstName} onChange={e=>set('firstName',e.target.value)}/></FormField>
              <FormField label="Last Name" required error={errs.lastName}><input placeholder="Doe" value={form.lastName} onChange={e=>set('lastName',e.target.value)}/></FormField>
            </Grid2>
            <Divider label="Contact & Address"/>
            <FormField label="Date of Birth" required error={errs.dob}><input type="date" value={form.dob} onChange={e=>set('dob',e.target.value)}/></FormField>
            <FormField label="Residential Address" required error={errs.address}><textarea placeholder="Street address, city, state, ZIP code" value={form.address} onChange={e=>set('address',e.target.value)}/></FormField>
            <Grid2>
              <FormField label="Phone Number" required error={errs.phone}><input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)}/></FormField>
              <FormField label="Email Address" required error={errs.email}><input type="email" placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)}/></FormField>
            </Grid2>
            <Divider label="Government-Issued Identification"/>
            <Grid2>
              <FormField label="ID Type" required error={errs.idType}>
                <select value={form.idType} onChange={e=>set('idType',e.target.value)}>
                  {ID_TYPES.map(o=><option key={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="ID Number" required error={errs.idNumber}><input placeholder="Your ID number" value={form.idNumber} onChange={e=>set('idNumber',e.target.value)}/></FormField>
            </Grid2>
            <Grid2>
              <FormField label="Social Security Number" required error={errs.ssn} hint="Encrypted and used for identity verification only.">
                <div style={{position:'relative'}}>
                  <input type={showSsn?'text':'password'} placeholder="XXX-XX-XXXX" value={form.ssn} onChange={e=>set('ssn',e.target.value)} style={{paddingRight:48}}/>
                  <button type="button" onClick={()=>setShowSsn(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.inkLt,fontSize:12,fontWeight:600,fontFamily:'Inter,sans-serif',padding:0}}>{showSsn?'Hide':'Show'}</button>
                </div>
              </FormField>
              <FormField label="State / Province" required error={errs.state}><input placeholder="e.g. Texas" value={form.state} onChange={e=>set('state',e.target.value)}/></FormField>
            </Grid2>
          </>}

          {step===2&&<>
            <SectionLabel>Employment Information</SectionLabel>
            <FormField label="Employment Status" required>
              <select value={form.empStatus} onChange={e=>set('empStatus',e.target.value)}>
                {EMP.map(o=><option key={o}>{o}</option>)}
              </select>
            </FormField>
            <Grid2>
              <FormField label="Occupation / Job Title" required error={errs.occupation}><input placeholder="e.g. Registered Nurse, Project Manager" value={form.occupation} onChange={e=>set('occupation',e.target.value)}/></FormField>
              <FormField label={form.empStatus==='Self-Employed'?'Business Name':'Employer Name'} required error={errs.employer}><input placeholder={form.empStatus==='Self-Employed'?'Your business name':'Your employer'} value={form.employer} onChange={e=>set('employer',e.target.value)}/></FormField>
            </Grid2>
          </>}

          {step===3&&<>
            <AlertBox type="info">Create the login credentials you will use to access your guarantor portal.</AlertBox>
            <FormField label="Username" required error={errs.username} hint="Minimum 4 characters."><input placeholder="Choose a username" value={form.username} onChange={e=>set('username',e.target.value)}/></FormField>
            <Grid2>
              <FormField label="Password" required error={errs.password} hint="Minimum 6 characters."><input type="password" placeholder="Create a password" value={form.password} onChange={e=>set('password',e.target.value)}/></FormField>
              <FormField label="Confirm Password" required error={errs.confirmPassword}><input type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)}/></FormField>
            </Grid2>
          </>}

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:16,borderTop:`1px solid ${C.lineLt}`}}>
            {step>1?<Btn variant="outline" onClick={()=>setStep(s=>s-1)}>Previous Step</Btn>:<span/>}
            <Btn variant="gold" size="lg" onClick={next} disabled={loading}>{loading?'Submitting...':(step<3?'Continue':'Complete Registration')}</Btn>
          </div>
        </FormCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, onBack, userType, onForgotPassword }) {
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
      <div style={{maxWidth:440,margin:'56px auto',padding:'0 24px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`3px solid ${isG?C.gold:C.blue}`,borderRadius:5,padding:'36px 32px',boxShadow:'0 1px 8px rgba(0,0,0,.07)'}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>{isG?'Guarantor Access':'Member Access'}</div>
            <h1 style={{fontSize:22,fontWeight:800,color:C.navy,letterSpacing:'-.01em'}}>Sign In to Your Account</h1>
          </div>
          {err&&<AlertBox type="error">{err}</AlertBox>}
          <FormField label="Username"><input placeholder="Your username" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username"/></FormField>
          <FormField label="Password"><input type="password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()} autoComplete="current-password"/></FormField>
          <Btn variant="primary" size="lg" full onClick={attempt} disabled={loading}>{loading?'Signing in...':'Sign In'}</Btn>
          <div style={{marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <button onClick={onForgotPassword} style={{color:C.blue,background:'none',border:'none',cursor:'pointer',fontWeight:500,fontFamily:'Inter,sans-serif',fontSize:13,padding:0}}>Forgot your password?</button>
            {!isG&&<button onClick={()=>onBack('g-login')} style={{color:C.inkLt,background:'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:13,padding:0}}>Guarantor sign in</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORGOT PASSWORD
═══════════════════════════════════════════════════════════════ */
function ForgotPasswordPage({ onBack }) {
  const [email,setEmail]=useState('');
  const [loading,setLoading]=useState(false);
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState('');

  async function submit(){
    if(!email.trim()){setErr('Please enter your email address.');return;}
    setLoading(true);setErr('');
    try{
      const res=await fetch('/api/request-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim()})});
      if(!res.ok)throw new Error('Request failed');
      setSent(true);
    }catch{
      setErr('Something went wrong. Please try again.');
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="pe">
      <div style={{maxWidth:440,margin:'56px auto',padding:'0 24px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`3px solid ${C.blue}`,borderRadius:5,padding:'36px 32px',boxShadow:'0 1px 8px rgba(0,0,0,.07)'}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Account Recovery</div>
            <h1 style={{fontSize:22,fontWeight:800,color:C.navy,letterSpacing:'-.01em'}}>Reset Your Password</h1>
          </div>
          {sent?(
            <>
              <AlertBox type="success">If that email address is registered, a password reset link has been sent. Please check your inbox and spam folder.</AlertBox>
              <Btn variant="outline" full onClick={onBack}>Return to Sign In</Btn>
            </>
          ):(
            <>
              <p style={{fontSize:14,color:C.inkMd,marginBottom:20,lineHeight:1.6}}>Enter the email address associated with your account and we will send you a reset link.</p>
              {err&&<AlertBox type="error">{err}</AlertBox>}
              <FormField label="Email Address"><input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/></FormField>
              <Btn variant="primary" size="lg" full onClick={submit} disabled={loading||!email.trim()}>{loading?'Sending...':'Send Reset Link'}</Btn>
              <div style={{textAlign:'center',marginTop:14}}>
                <button onClick={onBack} style={{color:C.inkLt,background:'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:13,padding:0}}>Return to Sign In</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESET PASSWORD
═══════════════════════════════════════════════════════════════ */
function ResetPasswordPage({ token, onDone }) {
  const [form,setForm]=useState({password:'',confirm:''});
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const [err,setErr]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  async function submit(){
    if(form.password.length<6){setErr('Password must be at least 6 characters.');return;}
    if(form.password!==form.confirm){setErr('Passwords do not match.');return;}
    setLoading(true);setErr('');
    try{
      const res=await fetch('/api/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,newPassword:form.password})});
      const json=await res.json();
      if(!res.ok)throw new Error(json.error||'Reset failed');
      setDone(true);
    }catch(e){
      setErr(e.message);
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="pe">
      <div style={{maxWidth:440,margin:'56px auto',padding:'0 24px'}}>
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`3px solid ${C.blue}`,borderRadius:5,padding:'36px 32px',boxShadow:'0 1px 8px rgba(0,0,0,.07)'}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Account Recovery</div>
            <h1 style={{fontSize:22,fontWeight:800,color:C.navy,letterSpacing:'-.01em'}}>Set a New Password</h1>
          </div>
          {done?(
            <>
              <AlertBox type="success">Your password has been updated. You may now sign in with your new credentials.</AlertBox>
              <Btn variant="primary" size="lg" full onClick={onDone}>Proceed to Sign In</Btn>
            </>
          ):(
            <>
              {err&&<AlertBox type="error">{err}</AlertBox>}
              <FormField label="New Password" hint="Minimum 6 characters."><input type="password" placeholder="New password" value={form.password} onChange={e=>set('password',e.target.value)}/></FormField>
              <FormField label="Confirm New Password"><input type="password" placeholder="Repeat new password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/></FormField>
              <Btn variant="primary" size="lg" full onClick={submit} disabled={loading||!form.password||!form.confirm}>{loading?'Saving...':'Update Password'}</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD MODALS
═══════════════════════════════════════════════════════════════ */
function WithdrawalModal({ onClose, balance, onSubmit }) {
  const [form,setForm]=useState({accountName:'',accountNumber:'',routing:'',bankName:'',amount:''});
  const [done,setDone]=useState(false);
  const [loading,setLoading]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ready=form.accountName&&form.accountNumber&&form.routing&&form.bankName&&form.amount&&parseFloat(form.amount)>0&&parseFloat(form.amount)<=balance;
  return (
    <Modal title="Request Withdrawal" onClose={onClose}>
      {done?(
        <>
          <AlertBox type="success"><strong>Request submitted.</strong> Your withdrawal is under review. Processing takes 3–5 business days. You will be notified once processed.</AlertBox>
          <Btn variant="primary" full onClick={onClose}>Close</Btn>
        </>
      ):(
        <>
          <div style={{background:C.blueXlt,border:`1px solid ${C.line}`,borderRadius:4,padding:'14px 18px',marginBottom:22,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:12,color:C.inkLt,marginBottom:2,fontWeight:500}}>Available Balance</div><div style={{fontSize:26,fontWeight:800,color:C.navy,letterSpacing:'-.01em'}}>${balance.toLocaleString()}<span style={{fontSize:15,fontWeight:500}}>.00</span></div></div>
            <div style={{fontSize:12,color:C.inkLt}}>USD</div>
          </div>
          <FormField label="Account Holder Name" required><input placeholder="Name as it appears on the account" value={form.accountName} onChange={e=>set('accountName',e.target.value)}/></FormField>
          <Grid2>
            <FormField label="Account Number" required><input placeholder="Account number" value={form.accountNumber} onChange={e=>set('accountNumber',e.target.value)}/></FormField>
            <FormField label="Routing Number" required><input placeholder="9-digit routing number" value={form.routing} onChange={e=>set('routing',e.target.value)}/></FormField>
          </Grid2>
          <FormField label="Bank Name" required><input placeholder="e.g. Chase Bank, Bank of America" value={form.bankName} onChange={e=>set('bankName',e.target.value)}/></FormField>
          <FormField label="Withdrawal Amount (USD)" required hint={`Maximum: $${balance.toLocaleString()}.00`}><input type="number" placeholder="0.00" min={1} max={balance} value={form.amount} onChange={e=>set('amount',e.target.value)}/></FormField>
          <Btn variant="primary" size="lg" full disabled={!ready||loading} onClick={async()=>{setLoading(true);await onSubmit(form);setLoading(false);setDone(true);}}>{loading?'Submitting...':'Submit Withdrawal Request'}</Btn>
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
      {done?(
        <>
          <AlertBox type="success">Bank account saved and is pending verification.</AlertBox>
          <Btn variant="primary" full onClick={onClose}>Done</Btn>
        </>
      ):(
        <>
          <FormField label="Bank Name" required><input placeholder="e.g. Bank of America" value={form.bankName} onChange={e=>set('bankName',e.target.value)}/></FormField>
          <Grid2>
            <FormField label="Account Number" required><input placeholder="Account number" value={form.accountNumber} onChange={e=>set('accountNumber',e.target.value)}/></FormField>
            <FormField label="Routing Number" required><input placeholder="Routing number" value={form.routing} onChange={e=>set('routing',e.target.value)}/></FormField>
          </Grid2>
          <FormField label="Account Type">
            <select value={form.accountType} onChange={e=>set('accountType',e.target.value)}><option>Checking</option><option>Savings</option></select>
          </FormField>
          <Btn variant="primary" size="lg" full disabled={!form.bankName||!form.accountNumber||!form.routing||loading} onClick={async()=>{setLoading(true);await onSave(form);setLoading(false);setDone(true);}}>{loading?'Saving...':'Save Account'}</Btn>
        </>
      )}
    </Modal>
  );
}

function HistoryModal({ onClose, history }) {
  const statusStyle={approved:{color:C.green,bg:C.greenBg,label:'Approved'},rejected:{color:C.red,bg:C.redBg,label:'Rejected'},pending:{color:C.amber,bg:C.amberBg,label:'Pending'}};
  return (
    <Modal title="Transaction History" onClose={onClose}>
      {history.length===0
        ?<div style={{textAlign:'center',padding:'36px 0',color:C.inkLt,fontSize:14}}>No transactions on record.</div>
        :history.map((tx,i)=>{
          const s=statusStyle[tx.status]||statusStyle.pending;
          return (
            <div key={i} style={{padding:'12px 0',borderBottom:i<history.length-1?`1px solid ${C.lineLt}`:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>Withdrawal Request</div>
                <div style={{fontSize:12,color:C.inkLt}}>{new Date(tx.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} &bull; {tx.bank_name}</div>
                {tx.admin_note&&<div style={{fontSize:12,color:C.amber,marginTop:3}}>{tx.admin_note}</div>}
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>${parseFloat(tx.amount).toLocaleString()}</div>
                <span style={{fontSize:11,fontWeight:600,background:s.bg,color:s.color,padding:'2px 9px',borderRadius:2}}>{s.label}</span>
              </div>
            </div>
          );
        })
      }
      <div style={{marginTop:20}}><Btn variant="outline" full onClick={onClose}>Close</Btn></div>
    </Modal>
  );
}

function InviteGuarantorModal({ beneficiaryId, beneficiaryName, alreadyInvited, onInvited, onClose }) {
  const [form,setForm]=useState({name:'',email:'',phone:''});
  const [sent,setSent]=useState(false);const [loading,setLoading]=useState(false);const [err,setErr]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="Invite a Guarantor" onClose={onClose}>
      {sent?(
        <>
          <AlertBox type="success"><strong>Invitation sent.</strong> {form.name} will receive an email with registration instructions. Once they register with the same email address, your account will be fully activated.</AlertBox>
          <Btn variant="primary" full onClick={onClose}>Done</Btn>
        </>
      ):(
        <>
          {alreadyInvited
            ?<AlertBox type="warning">An invitation was previously sent. You may resend it below.</AlertBox>
            :<AlertBox type="info">Your guarantor will receive an email with step-by-step registration instructions. They must use this exact email address to be linked automatically.</AlertBox>
          }
          {err&&<AlertBox type="error">{err}</AlertBox>}
          <FormField label="Guarantor Full Name" required><input placeholder="Full legal name" value={form.name} onChange={e=>set('name',e.target.value)}/></FormField>
          <FormField label="Guarantor Email Address" required><input type="email" placeholder="guarantor@example.com" value={form.email} onChange={e=>set('email',e.target.value)}/></FormField>
          <FormField label="Guarantor Phone Number" required><input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)}/></FormField>
          <Btn variant="primary" size="lg" full disabled={!form.name||!form.email||!form.phone||loading} onClick={async()=>{setLoading(true);const{error}=await DB.createInvite(beneficiaryId,{...form,beneficiaryName});setLoading(false);if(error){setErr(error.message);return;}onInvited();setSent(true);}}>{loading?'Sending...':'Send Invitation'}</Btn>
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
    DB.refreshBeneficiary(user.id).then(d=>{if(d)setUser(d)});
  },[user.id]);

  const statusMap={
    'not-invited': {lbl:'Pending Guarantor Invitation',col:C.amber,bg:C.amberBg},
    'invited':     {lbl:'Guarantor Invited — Awaiting Registration',col:C.blue,bg:C.blueXlt},
    'signed-up':   {lbl:'Account Active',col:C.green,bg:C.greenBg},
  };
  const sm=statusMap[user.guarantor_status];

  return (
    <div className="pe">
      {!isActive&&<div style={{background:C.amberBg,borderBottom:`1px solid #E8D48A`,padding:'9px 40px',textAlign:'center',fontSize:13,color:C.amber,fontWeight:500}}>Your account requires a guarantor to be fully activated. Invite your guarantor below to unlock withdrawals.</div>}
      <div style={{maxWidth:1060,margin:'0 auto',padding:'36px 24px'}}>

        {/* Page header */}
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:22,fontWeight:800,color:C.navy,letterSpacing:'-.01em',marginBottom:4}}>Welcome back, {user.first_name} {user.last_name}</h1>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:C.inkLt}}>TrustWallet Raffle Portal</span>
            <span style={{fontSize:12,color:C.line}}>|</span>
            <span className="status-badge" style={{background:sm.bg,color:sm.col,border:`1px solid ${sm.col}22`}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:sm.col,flexShrink:0,display:'inline-block'}}/>
              {sm.lbl}
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:20}}>

          {/* Balance card */}
          <div style={{background:C.navy,color:'#fff',padding:'30px 28px',borderBottom:`3px solid ${C.gold}`,borderRadius:4}}>
            <div style={{fontSize:11,fontWeight:600,opacity:.55,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Total Prize Balance</div>
            <div style={{fontSize:42,fontWeight:800,letterSpacing:'-.02em',marginBottom:4,lineHeight:1}}>${balance.toLocaleString()}<span style={{fontSize:20,fontWeight:400,opacity:.7}}>.00</span></div>
            <div style={{fontSize:12,opacity:.5,marginBottom:24}}>USD &bull; TrustWallet Raffle Prize Account</div>
            <div style={{paddingTop:18,borderTop:'1px solid rgba(255,255,255,.12)',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              {[['Account ID',user.account_id],['Status',user.account_status],['Member Since',new Date(user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'})]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,opacity:.45,marginBottom:3,textTransform:'uppercase',letterSpacing:'.07em'}}>{l}</div><div style={{fontSize:13,fontWeight:600,textTransform:'capitalize'}}>{v}</div></div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{background:'#fff',border:`1px solid ${C.line}`,borderRadius:4,padding:'22px 20px'}}>
            <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:16}}>Quick Actions</div>
            {[
              {lbl:'Request Withdrawal',action:()=>setModal('withdrawal'),dis:!isActive},
              {lbl:'Add Bank Account',action:()=>setModal('addAccount'),dis:!isActive},
              {lbl:'Transaction History',action:()=>setModal('history'),dis:false},
            ].map(a=>(
              <div key={a.lbl} style={{marginBottom:10}}>
                <Btn variant={a.dis?'outline':'primary'} full disabled={a.dis} onClick={a.action} size="sm">{a.lbl}</Btn>
              </div>
            ))}
          </div>
        </div>

        {/* Linked accounts */}
        {accounts.length>0&&(
          <div style={{background:'#fff',border:`1px solid ${C.line}`,borderRadius:4,padding:'22px 24px',marginBottom:20}}>
            <h3 style={{fontWeight:700,color:C.navy,fontSize:14,marginBottom:16,textTransform:'uppercase',letterSpacing:'.06em'}}>Linked Bank Accounts</h3>
            {accounts.map((a,i)=>(
              <div key={i} style={{padding:'10px 14px',background:C.bg,border:`1px solid ${C.lineLt}`,borderRadius:3,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <span style={{fontWeight:600,fontSize:14,color:C.navy}}>{a.bank_name}</span>
                  <span style={{color:C.inkLt,fontSize:12,marginLeft:10}}>···· {a.account_number.slice(-4)} &bull; {a.account_type}</span>
                </div>
                <span style={{fontSize:11,fontWeight:700,background:a.status==='verified'?C.greenBg:C.amberBg,color:a.status==='verified'?C.green:C.amber,padding:'3px 10px',borderRadius:2,textTransform:'capitalize'}}>{a.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Guarantor section */}
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderLeft:`4px solid ${isActive?C.green:C.gold}`,borderRadius:'0 4px 4px 0',padding:'22px 24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Guarantor Status</div>
              <p style={{fontSize:14,color:C.inkMd,lineHeight:1.6,maxWidth:460}}>
                {isActive?'Your guarantor has completed registration. Your account is fully active and all features are enabled.':'A guarantor must complete registration before your account is fully activated and withdrawals are processed.'}
              </p>
              {pokeMsg&&<p style={{fontSize:13,color:C.green,marginTop:8,fontWeight:500}}>Reminder sent to your guarantor.</p>}
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              {user.guarantor_status==='invited'&&<Btn variant="outline" size="sm" onClick={()=>{setPokeMsg(true);setTimeout(()=>setPokeMsg(false),4000)}}>Send Reminder</Btn>}
              {!isActive&&<Btn variant="gold" onClick={()=>setModal('invite')}>{user.guarantor_status==='not-invited'?'Invite Guarantor':'Re-send Invitation'}</Btn>}
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
  const statusStyle={approved:{color:C.green,bg:C.greenBg,label:'Approved'},rejected:{color:C.red,bg:C.redBg,label:'Rejected'},pending:{color:C.amber,bg:C.amberBg,label:'Pending'}};

  return (
    <div className="pe">
      <div style={{maxWidth:1060,margin:'0 auto',padding:'36px 24px'}}>

        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:22,fontWeight:800,color:C.navy,letterSpacing:'-.01em',marginBottom:4}}>Guarantor Dashboard</h1>
          <p style={{color:C.inkLt,fontSize:14}}>
            Signed in as {user.first_name} {user.last_name} &bull; Acting as guarantor for <strong style={{color:C.navy}}>{beneficiary?`${beneficiary.first_name} ${beneficiary.last_name}`:'the account holder'}</strong>
          </p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>

          {/* Beneficiary details */}
          <div style={{background:'#fff',border:`1px solid ${C.line}`,borderRadius:4,padding:'24px'}}>
            <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:18}}>Beneficiary Account</div>
            {[
              ['Beneficiary Name',beneficiary?`${beneficiary.first_name} ${beneficiary.last_name}`:'Not linked'],
              ['Prize Amount',`$${balance.toLocaleString()}.00 USD`],
              ['Account Status',beneficiary?.account_status||'—'],
              ['Account ID',beneficiary?.account_id||'—'],
            ].map(([l,v])=>(
              <div key={l} className="data-row">
                <span style={{color:C.inkLt,fontSize:13}}>{l}</span>
                <span style={{fontWeight:600,fontSize:14,textTransform:'capitalize'}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Balance + action */}
          <div style={{background:C.navy,color:'#fff',padding:'24px',borderBottom:`3px solid ${C.gold}`,borderRadius:4,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,opacity:.5,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Account Balance</div>
              <div style={{fontSize:38,fontWeight:800,letterSpacing:'-.02em',lineHeight:1}}>${balance.toLocaleString()}<span style={{fontSize:18,fontWeight:400,opacity:.6}}>.00</span></div>
              <div style={{fontSize:12,opacity:.45,marginTop:6}}>USD &bull; Available for Disbursement</div>
            </div>
            <div style={{marginTop:28}}>
              <Btn variant="gold" size="lg" full onClick={()=>setModal('withdrawal')}>Request Withdrawal on Behalf</Btn>
            </div>
          </div>
        </div>

        {/* Transaction history */}
        <div style={{background:'#fff',border:`1px solid ${C.line}`,borderRadius:4,padding:'22px 24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:C.inkLt,textTransform:'uppercase',letterSpacing:'.1em'}}>Transaction History</div>
            {history.length>0&&<Btn variant="ghost" size="sm" onClick={()=>setModal('history')}>View All</Btn>}
          </div>
          {history.length===0
            ?<p style={{color:C.inkLt,fontSize:14}}>No transactions on record.</p>
            :history.slice(0,3).map((tx,i)=>{
              const s=statusStyle[tx.status]||statusStyle.pending;
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<2&&i<history.length-1?`1px solid ${C.lineLt}`:'none'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:C.ink}}>Withdrawal &bull; {tx.bank_name}</div>
                    <div style={{fontSize:12,color:C.inkLt,marginTop:2}}>{new Date(tx.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:14,fontWeight:700}}>${parseFloat(tx.amount).toLocaleString()}</div>
                    <span style={{fontSize:11,fontWeight:600,background:s.bg,color:s.color,padding:'2px 8px',borderRadius:2}}>{s.label}</span>
                  </div>
                </div>
              );
            })
          }
        </div>

      </div>
      {modal==='withdrawal'&&<WithdrawalModal onClose={()=>setModal(null)} balance={balance} onSubmit={async form=>{await DB.createTransaction(user.id,'guarantor',beneficiary?.id||null,form);setHistory(await DB.getTransactions(user.id));}}/>}
      {modal==='history'&&<HistoryModal onClose={()=>setModal(null)} history={history}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIGNUP SUCCESS
═══════════════════════════════════════════════════════════════ */
function SignupSuccess({ username, userType, onGoToLogin }) {
  const isG=userType==='guarantor';
  return (
    <div className="pe" style={{maxWidth:520,margin:'72px auto',padding:'0 24px'}}>
      <div style={{background:'#fff',border:`1px solid ${C.line}`,borderTop:`3px solid ${C.green}`,borderRadius:5,padding:'44px 36px',textAlign:'center',boxShadow:'0 1px 8px rgba(0,0,0,.07)'}}>
        <div style={{width:48,height:48,borderRadius:'50%',background:C.greenBg,border:`2px solid ${C.green}`,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{fontSize:22,fontWeight:800,color:C.navy,marginBottom:8,letterSpacing:'-.01em'}}>{isG?'Registration Complete':'Application Submitted'}</h2>
        <p style={{color:C.inkMd,fontSize:14,marginBottom:8,lineHeight:1.7}}>{isG?'Your guarantor account is active. The beneficiary will be notified automatically.':'Your registration is under review. You will be notified once your account is verified.'}</p>
        <p style={{color:C.inkLt,fontSize:13,marginBottom:28}}>Username: <strong style={{color:C.ink}}>{username}</strong></p>
        <Btn variant="primary" size="lg" full onClick={onGoToLogin}>Proceed to Sign In</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [page,setPage]               = useState('landing');
  const [currentUser,setCurrentUser] = useState(null);
  const [userType,setUserType]       = useState(null);
  const [notifications,setNotifs]    = useState([]);
  const [popups,setPopups]           = useState([]);
  const [successData,setSuccess]     = useState(null);
  const [showPopup,setShowPopup]     = useState(false);
  const [resetToken,setResetToken]   = useState(null);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const token=params.get('token');
    if(token){setResetToken(token);setPage('reset-password');}
  },[]);

  function logout(){setCurrentUser(null);setUserType(null);setNotifs([]);setPopups([]);setPage('landing');}

  async function afterLogin(user,type){
    setCurrentUser(user);setUserType(type);
    const{data:notifs}=await DB.getNotifications(user.id,type);
    setNotifs(notifs||[]);
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

  if(page==='admin')return <AdminPanel onBack={()=>setPage('landing')}/>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <TopBar onHome={()=>{setCurrentUser(null);setUserType(null);setPage('landing');}} currentUser={currentUser} userType={userType} onLogout={logout} notifications={notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}/>
      {showPopup&&currentUser&&<PopupManager popups={popups} userId={currentUser.id} onDismiss={()=>setShowPopup(false)}/>}
      <main>
        {page==='landing'         &&<Landing onOpenAccount={()=>setPage('b-signup')} onLogin={t=>{setUserType(t);setPage('login');}} onGuarantorSignup={()=>setPage('g-signup')} onAdmin={()=>setPage('admin')}/>}
        {page==='b-signup'        &&<BeneficiarySignup onSubmit={d=>{setSuccess(d);setPage('signup-success');}} onBack={()=>setPage('landing')}/>}
        {page==='g-signup'        &&<GuarantorSignup onSubmit={d=>{setSuccess(d);setPage('signup-success');}} onBack={()=>setPage('landing')}/>}
        {page==='login'           &&<LoginPage onLogin={u=>afterLogin(u,userType)} onBack={p=>{if(p==='g-login'){setUserType('guarantor');}else setPage('landing');}} userType={userType||'beneficiary'} onForgotPassword={()=>setPage('forgot-password')}/>}
        {page==='forgot-password' &&<ForgotPasswordPage onBack={()=>setPage('login')}/>}
        {page==='reset-password'  &&<ResetPasswordPage token={resetToken} onDone={()=>{window.history.replaceState({},'','/');setPage('landing');}}/>}
        {page==='b-dashboard'     &&currentUser&&<BeneficiaryDashboard user={currentUser}/>}
        {page==='g-dashboard'     &&currentUser&&<GuarantorDashboard user={currentUser}/>}
        {page==='signup-success'  &&successData&&<SignupSuccess username={successData.username} userType={successData.userType} onGoToLogin={()=>{setUserType(successData.userType);setPage('login');}}/>}
      </main>
    </>
  );
}

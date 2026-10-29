import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, AlertTriangle, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Bell, Box, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock3, Command, Copy, Cpu, Download, ExternalLink, FileCheck2, FileClock, FileText, Fingerprint, Gauge, HardDrive, Hash, LayoutDashboard, Link2, ListFilter, LockKeyhole, LogOut, Menu, MoreHorizontal, Package, Plus, Radio, RefreshCw, Search, Shield, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, Terminal, Truck, UserCheck, Users, Wallet, Wrench, X, XCircle, Zap } from 'lucide-react'
import { mockApprovals, mockAssets, mockTransactions } from './data/mock'
import { config, integrationReady } from './lib/config'
import { api } from './lib/api'
import type { Approval, DashboardSummary } from './types'
import type { Asset, AssetStatus, EventType, TransactionRecord, UserRole } from './types'
import { connectDefenceContract, registerAssetOnChain } from './lib/contract';

 type Page = 'Overview' | 'Assets' | 'Approvals' | 'Transactions' | 'Register asset' | 'Record event'
const nav = [
 { label:'Overview', icon:LayoutDashboard, group:'WORKSPACE' },
 { label:'Assets', icon:Package, group:'WORKSPACE' },
 { label:'Approvals', icon:ClipboardCheck, group:'WORKSPACE', count:7 },
 { label:'Transactions', icon:Activity, group:'NETWORK' },
]
const roles: UserRole[] = ['Supplier','Depot officer','Logistics officer','Maintenance engineer','Auditor','Administrator']
const statuses: AssetStatus[] = ['Operational','In transit','Maintenance','Awaiting approval','Retired']
const fmt = (value: string) => new Intl.DateTimeFormat('en', { month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(value))
const shortHash = (value: string) => `${value.slice(0, 10)}…${value.slice(-6)}`
function StatusPill({ status }: { status: string }) { const cls = status.toLowerCase().replaceAll(' ','-'); return <span className={`status-pill ${cls}`}><span className="status-dot" />{status}</span> }
function IconBox({ children, tone='violet' }: {children:React.ReactNode;tone?:string}) { return <span className={`icon-box ${tone}`}>{children}</span> }
function Button({ children, onClick, variant='primary', size='normal', disabled=false }: {children:React.ReactNode;onClick?:()=>void;variant?:'primary'|'secondary'|'ghost'|'danger';size?:'normal'|'small';disabled?:boolean}) { return <button className={`btn ${variant} ${size}`} onClick={onClick} disabled={disabled}>{children}</button> }
function App() {
 const [page,setPage] = useState<Page>('Overview')
 const [role,setRole] = useState<UserRole>('Administrator')
 const [roleOpen,setRoleOpen] = useState(false)
 const [mobileNav,setMobileNav] = useState(false)
 const [search,setSearch] = useState('')
 const [statusFilter,setStatusFilter] = useState('All statuses')
 const [selected,setSelected] = useState<Asset | null>(null)
 const [assetRows,setAssetRows] = useState<Asset[]>(config.mockDataEnabled ? mockAssets : [])
 const [approvalRows,setApprovalRows] = useState(config.mockDataEnabled ? mockApprovals : [])
 const [txRows,setTxRows] = useState<TransactionRecord[]>(config.mockDataEnabled ? mockTransactions : [])
 const [toast,setToast] = useState('')
 const [dashboardData,setDashboardData] = useState<DashboardSummary | null>(null)
 const [apiConnected,setApiConnected] = useState(false)
 const [apiError,setApiError] = useState('')
 const [wallet,setWallet] = useState('')
 const [txModal,setTxModal] = useState<TransactionRecord | null>(null)
 const [registerForm,setRegisterForm] = useState({name:'',category:'Power systems',serial:'',supplier:'',notes:''})
 const [eventForm,setEventForm] = useState({assetId:'EQ-2048',type:'Inspection' as EventType,summary:'',custodian:'',documentHash:''})
 const [approving,setApproving] = useState<string | null>(null)
 const demo = config.mockDataEnabled
 useEffect(() => {
  if (demo) {
    setApiConnected(false);
    return;
  }

  let cancelled = false;

  Promise.all([
    api.assets(),
    api.approvals(),
    api.dashboard(),
    api.transactions(),
  ])
    .then(([assetResult, approvalResult, dashboardResult, transactionResult]) => {
      if (cancelled) return;

      setAssetRows(assetResult.items);
      setApprovalRows(approvalResult);
      setDashboardData(dashboardResult);
      setTxRows(transactionResult);
      setApiConnected(true);
      setApiError('');
    })
    .catch((error: unknown) => {
      if (cancelled) return;

      setApiConnected(false);
      setApiError(
        error instanceof Error
          ? error.message
          : 'Could not reach the backend.',
      );
    });

  return () => {
    cancelled = true;
  };
}, [demo]);
 const notify = (message:string) => { setToast(message); window.setTimeout(()=>setToast(''),3600) }
 const filteredAssets = useMemo(()=>assetRows.filter(a => `${a.id} ${a.name} ${a.category} ${a.supplier} ${a.serial}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter==='All statuses'||a.status===statusFilter)),[assetRows,search,statusFilter])
 const connectWallet = async () => {
  try {
    const { walletAddress } = await connectDefenceContract();
    setWallet(walletAddress);
    notify(
      `BridgeKey connected: ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`,
    );
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not connect BridgeKey.');
  }
};
 const addAsset = async (e: React.FormEvent) => {
  e.preventDefault();

  const name = registerForm.name.trim();
  const serial = registerForm.serial.trim();
  const supplier = registerForm.supplier.trim();

  if (!name || !serial || !supplier) {
    notify('Complete the required fields first.');
    return;
  }

  if (demo) {
    notify('Turn off demo mode to send a real Testnet transaction.');
    return;
  }

  let result: Awaited<ReturnType<typeof registerAssetOnChain>>;

  try {
    result = await registerAssetOnChain(name, registerForm.category);
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Blockchain registration failed.');
    return;
  }

  const transaction: TransactionRecord = {
    hash: result.transactionHash,
    assetId: result.assetId,
    action: 'Asset registered on MST Testnet',
    submittedAt: new Date().toISOString(),
    state: 'Confirmed',
    demoOnly: false,
    confirmations: 1,
    blockNumber: result.blockNumber,
    from: result.walletAddress,
    to: config.contractAddress,
    explorerUrl: `${config.explorerUrl}/tx/${result.transactionHash}`,
  };

  setTxRows((previous) => [transaction, ...previous]);

  try {
    await api.createAssetDraft({
      assetCode: serial,
      equipmentType: name,
      manufacturer: supplier,
      supplierWallet: result.walletAddress,
      chainAssetId: result.assetId,
      registrationTxHash: result.transactionHash,
      chainId: config.chainId!,
      contractAddress: config.contractAddress,
    });
  } catch (error) {
    setPage('Transactions');
    notify(
      `The chain transaction succeeded, but the database save failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
    return;
  }

  try {
    const [assetResult, approvalResult, dashboardResult] = await Promise.all([
      api.assets(),
      api.approvals(),
      api.dashboard(),
    ]);

    setAssetRows(assetResult.items);
    setApprovalRows(approvalResult);
    setDashboardData(dashboardResult);
  } catch {
    // The asset and approval were saved; the next page refresh will reload them.
  }

  setRegisterForm({
    name: '',
    category: 'Power systems',
    serial: '',
    supplier: '',
    notes: '',
  });

  setPage('Approvals');
  notify('Testnet registration confirmed and approval request saved.');
};
 const recordEvent = (e:React.FormEvent) => { e.preventDefault(); if(!demo){notify('Mock mode is disabled. Recording events requires the agreed backend and contract integration.');return} if(!eventForm.summary.trim()){notify('Add an event description before submitting.');return} const eventId=`EV-${Math.floor(1000+Math.random()*8999)}`; const row:TransactionRecord={hash:`0x${eventId.toLowerCase().replace(/[^a-f0-9]/g,'a').padEnd(64,'c')}`,assetId:eventForm.assetId,action:`${eventForm.type}: ${eventForm.summary}`,submittedAt:new Date().toISOString(),state:'Submitted',demoOnly:true,confirmations:0,from:wallet?`${wallet.slice(0,6)}…${wallet.slice(-4)}`:'Demo operator'};setTxRows(prev=>[row,...prev]);setAssetRows(prev=>prev.map(a=>a.id===eventForm.assetId?{...a,events:[{id:eventId,type:eventForm.type,title:eventForm.type,description:eventForm.summary,actorRole:role,actorLabel:role,timestamp:new Date().toISOString(),state:'Submitted'},...a.events]}:a));setPage('Transactions');notify('Demo event queued locally. Backend/contract integration is not connected.') }
 const handleApproval = async (
  id: string,
  action: 'Approved' | 'Rejected',
) => {
  if (demo) {
    setApproving(id);

    window.setTimeout(() => {
      setApprovalRows((previous) =>
        previous.map((approval) =>
          approval.id === id ? { ...approval, status: action } : approval,
        ),
      );

      setApproving(null);
      notify(`Demo approval marked ${action.toLowerCase()} locally.`);
    }, 350);

    return;
  }

  setApproving(id);

  try {
    await api.updateApproval(id, action);

    setApprovalRows((previous) =>
      previous.map((approval) =>
        approval.id === id ? { ...approval, status: action } : approval,
      ),
    );

    notify(`Approval ${action.toLowerCase()} and saved.`);
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not save approval.');
  } finally {
    setApproving(null);
  }
};
 const openAsset = (asset:Asset) => {setSelected(asset);setPage('Assets')}
 const currentAsset = selected ? assetRows.find(a=>a.id===selected.id) ?? selected : null
 return <div className="app-shell">
  <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
   <div className="brand"><div className="brand-mark"><img src="/armourchain-logo.png" alt="ArmourChain AC shield logo" /><span /></div><div><div className="brand-name">ARMOUR<span>CHAIN</span></div><div className="brand-caption">EQUIPMENT ASSURANCE</div></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
   <div className="workspace-switch"><div className="workspace-icon"><Fingerprint size={17}/></div><div className="workspace-text"><b>Field systems</b><span>Prototype workspace</span></div><ChevronDown size={14}/></div>
   <div className="nav-label">WORKSPACE</div>
   <nav className="nav-list">{nav.filter(n=>n.group==='WORKSPACE').map(item=><button key={item.label} onClick={()=>{setPage(item.label as Page);setSelected(null);setMobileNav(false)}} className={`nav-item ${page===item.label?'active':''}`}><item.icon size={17}/><span>{item.label}</span>{demo&&item.count&&<span className="nav-count">{item.count}</span>}</button>)}</nav>
   <div className="nav-label nav-gap">OPERATIONS</div>
   <nav className="nav-list"><button className={`nav-item ${page==='Register asset'?'active':''}`} onClick={()=>{setPage('Register asset');setSelected(null);setMobileNav(false)}}><Plus size={17}/><span>Register asset</span></button><button className={`nav-item ${page==='Record event'?'active':''}`} onClick={()=>{setPage('Record event');setSelected(null);setMobileNav(false)}}><Radio size={17}/><span>Record event</span></button><button className={`nav-item ${page==='Transactions'?'active':''}`} onClick={()=>{setPage('Transactions');setSelected(null);setMobileNav(false)}}><Activity size={17}/><span>Transaction log</span></button></nav>
   <div className="sidebar-spacer" />
   <div className="network-card"><div className="network-top"><span className="network-light"/><span>NETWORK STATUS</span><span className="network-live">DEMO</span></div><div className="network-name">MST Testnet</div><div className="network-desc">Chain configuration pending confirmation</div><div className="network-divider"/><div className="network-detail"><span>RPC connection</span><span className="network-wait"><span/> Not configured</span></div><div className="network-detail"><span>Contract address</span><span className="network-wait">Pending</span></div></div>
   <div className="sidebar-footer"><div className="avatar">AC</div><div className="footer-user"><b>Prototype operator</b><span>Local demo session</span></div><button className="icon-button" title="Session options" onClick={()=>notify('Demo session settings are not connected.')}><MoreHorizontal size={18}/></button></div>
  </aside>
  {mobileNav&&<button className="nav-backdrop" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
  <main className="main-area">
   <header className="topbar"><div className="top-left"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)}><Menu size={19}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/><span>{currentAsset&&page==='Assets'?currentAsset.id:page}</span></div></div><div className="top-actions"><div className="environment-tag"><span className="environment-dot"/> DEVELOPMENT MODE</div><Button variant="secondary" size="small" onClick={connectWallet}>{wallet ? `BridgeKey ${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect BridgeKey'}</Button><button className="icon-button notification-button" onClick={()=>{setPage('Approvals');setSelected(null)}} title="View notifications"><Bell size={17}/><i/></button><div className="role-wrap"><button className="role-switch" onClick={()=>setRoleOpen(!roleOpen)}><span className="role-avatar"><Users size={14}/></span><span><b>{role}</b><small>Active role</small></span><ChevronDown size={14}/></button>{roleOpen&&<div className="role-menu">{roles.map(r=><button key={r} onClick={()=>{setRole(r);setRoleOpen(false);notify(`Role preview changed to ${r}. Authorization is not enforced in this frontend.`)}}>{r}{r===role&&<Check size={14}/>}</button>)}</div>}</div></div></header>
   <div className="page-wrap">
    {page==='Overview'&&<Overview onPage={setPage} onOpenAsset={openAsset} onOpenTx={setTxModal} assets={assetRows} approvals={approvalRows.filter(a=>a.status==='Pending')} transactions={txRows} notify={notify} demo={demo} dashboard={dashboardData} apiConnected={apiConnected} apiError={apiError}/>}
    {page==='Assets'&&<AssetsPage assets={filteredAssets} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} selected={currentAsset} apiConnected={apiConnected} onSelect={setSelected} onRegister={()=>setPage('Register asset')} onRecord={()=>setPage('Record event')} onOpenTx={setTxModal}/>}
    {page==='Approvals'&&<ApprovalsPage approvals={approvalRows} onAction={handleApproval} approving={approving} role={role} notify={notify}/>}
    {page==='Transactions'&&<TransactionsPage transactions={txRows} onOpen={setTxModal} explorerUrl={config.explorerUrl}/>}
    {page==='Register asset'&&<RegisterPage form={registerForm} setForm={setRegisterForm} onSubmit={addAsset} onCancel={()=>setPage('Assets')} />}
    {page==='Record event'&&<EventPage form={eventForm} setForm={setEventForm} assets={assetRows} onSubmit={recordEvent} onCancel={()=>setPage('Assets')} role={role}/>}
   </div>
   <footer className="app-footer"><span><Shield size={13}/> ARMOURCHAIN <span className="footer-dot">·</span> DEFENCE EQUIPMENT TRACEABILITY</span><span>Prototype build <b>0.1.0</b><span className="footer-dot">·</span> Demo data only</span></footer>
  </main>
  <AnimatePresence>{txModal&&<TransactionModal tx={txModal} onClose={()=>setTxModal(null)} explorerUrl={config.explorerUrl}/>}</AnimatePresence>
  <AnimatePresence>{toast&&<motion.div className="toast" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}><CheckCircle2 size={17}/>{toast}</motion.div>}</AnimatePresence>
 </div>
}

function PageHeading({eyebrow,title,description,actions}:{eyebrow:string;title:string;description:string;actions?:React.ReactNode}){return <div className="page-heading"><div><div className="eyebrow"><span/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions&&<div className="heading-actions">{actions}</div>}</div>}
function Overview({onPage,onOpenAsset,onOpenTx,assets,approvals,transactions,notify,demo,dashboard,apiConnected,apiError}:{onPage:(p:Page)=>void;onOpenAsset:(a:Asset)=>void;onOpenTx:(t:TransactionRecord)=>void;assets:Asset[];approvals:Approval[];transactions:TransactionRecord[];notify:(s:string)=>void;demo:boolean;dashboard:DashboardSummary|null;apiConnected:boolean;apiError:string}){
 const stats=[{label:'Tracked assets',value:demo?'1,284':dashboard?.totalAssets ?? '—',change:demo?'+ 6.8%':apiConnected?'Live from backend':'API not connected',icon:Package,tone:'violet',note:'Across all registered categories'},{label:'Verified records',value:demo?'96.8%':'—',change:demo?'+ 2.4%':apiConnected?'Awaiting API data':'API not connected',icon:BadgeCheck,tone:'cyan',note:'Proofs verified in the index'},{label:'Pending approvals',value:demo?String(approvals.length+4).padStart(2,'0'):dashboard?.pendingApprovals ?? approvals.length,change:apiConnected?'Needs review':'API not connected',icon:ClipboardCheck,tone:'amber',note:'Awaiting authorized review'},{label:'Open maintenance',value:demo?'11':dashboard?.maintenance ?? '—',change:demo?'3 elevated':apiConnected?'Awaiting API data':'API not connected',icon:Wrench,tone:'rose',note:'Service records requiring closure'}]
 const bars=[{label:'MON',value:42},{label:'TUE',value:58},{label:'WED',value:45},{label:'THU',value:78},{label:'FRI',value:62},{label:'SAT',value:91},{label:'SUN',value:70}]
 return <>
  <PageHeading eyebrow="CONTROL CENTRE / 01" title="Equipment overview" description="A unified view of equipment records, custody events and verification status." actions={<><Button variant="secondary" onClick={()=>notify('Report export will be enabled after API integration.')}><Download size={15}/> Export report</Button><Button onClick={()=>onPage('Register asset')}><Plus size={16}/> Register asset</Button></>}/>
  <div className="demo-banner"><div className="demo-banner-icon"><AlertTriangle size={17}/></div><div><b>Prototype environment</b><span>{demo?'Sample data only · No classified or operational records · Blockchain integration not yet connected':apiConnected?'Live database records · Blockchain integration not yet connected':apiError||'Connecting to backend…'}</span></div><span className="banner-badge">DEMO DATA</span></div>
  <section className="stat-grid">{stats.map((s,i)=><motion.div className="stat-card" key={s.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}><div className="stat-head"><span>{s.label}</span><IconBox tone={s.tone}><s.icon size={17}/></IconBox></div><div className="stat-value">{s.value}</div><div className={`stat-change ${i===2||i===3?'attention':''}`}>{i===2?<Clock3 size={12}/>:i===3?<AlertTriangle size={12}/>:<ArrowUpRight size={12}/>} {s.change}</div><div className="stat-note">{s.note}</div></motion.div>)}</section>
  <section className="overview-grid"><div className="panel activity-panel"><div className="panel-heading"><div><h2>Trace activity</h2><p>Record events across the last 7 days</p></div><button className="subtle-link" onClick={()=>onPage('Transactions')}>View transaction log <ArrowRight size={14}/></button></div><div className="chart-summary"><div><span className="chart-total">{demo?'342':dashboard?.totalAssets ?? '—'}</span><span className="chart-caption">{demo?'events indexed':apiConnected?'Live index':'API not connected'}</span></div><span className="chart-period"><span/> LIVE INDEX <span className="period-divider">/</span> 7D</span></div><div className="bar-chart">{demo?bars.map((b,i)=><div className="bar-column" key={b.label}><div className="bar-track"><motion.div className={`bar-fill ${i===5?'highlight':''}`} initial={{height:0}} animate={{height:`${b.value}%`}} transition={{duration:.6,delay:i*.05}}/></div><span>{b.label}</span></div>):<div className="chart-empty">Connect the indexed API to view activity</div>}</div><div className="chart-foot"><span><i className="legend-dot"/> Registered events</span><span>Activity is illustrative demo data</span></div></div>
   <div className="panel integrity-panel"><div className="panel-heading"><div><h2>Record integrity</h2><p>Proof metadata overview</p></div><button className="icon-button" onClick={()=>notify('Integrity metrics refresh after API integration.')}><RefreshCw size={15}/></button></div><div className="integrity-visual"><div className="integrity-ring" style={{background:demo?'conic-gradient(#a18cff 0 66%,#5bd4e4 66% 96.8%,#282e3e 96.8%)':'conic-gradient(#282e3e 0 100%)'}}><div className="ring-inner"><ShieldCheck size={24}/><strong>{demo?'96.8':'—'}{demo&&<span>%</span>}</strong><small>{demo?'VERIFIED':'NO API DATA'}</small></div></div><div className="integrity-caption"><span><i className="legend-dot violet-dot"/> Verified proofs <b>{demo?'1,244':'—'}</b></span><span><i className="legend-dot amber-dot"/> Pending review <b>{demo?'27':'—'}</b></span><span><i className="legend-dot rose-dot"/> Exceptions <b>{demo?'13':'—'}</b></span></div></div><div className="integrity-note"><LockKeyhole size={14}/> Hash integrity is not proof of document authenticity.</div></div></section>
  <section className="lower-grid"><div className="panel table-panel"><div className="panel-heading"><div><h2>Recently updated assets</h2><p>Latest changes in the equipment registry</p></div><button className="subtle-link" onClick={()=>onPage('Assets')}>All assets <ArrowRight size={14}/></button></div><div className="table-scroll"><table><thead><tr><th>ASSET</th><th>STATUS</th><th>CUSTODIAN</th><th>PROOFS</th><th/></tr></thead><tbody>{assets.slice(0,4).map(a=><tr key={a.id} onClick={()=>onOpenAsset(a)} className="click-row"><td><div className="asset-cell"><div className="asset-mini"><Cpu size={16}/></div><div><b>{a.name}</b><span>{a.id} <i/> {a.category}</span></div></div></td><td><StatusPill status={a.status}/></td><td><div className="custodian-cell">{a.custodian}<small>{a.custodianRole}</small></div></td><td><span className="proof-count"><FileCheck2 size={13}/>{a.certificateCount}</span></td><td><ChevronRight size={15} className="row-chevron"/></td></tr>)}</tbody></table>{assets.length===0&&<div className="empty-state"><Package size={22}/><b>No indexed assets yet</b><span>Enable demo mode or connect the agreed backend API.</span></div>}</div></div>
   <div className="panel approval-panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Items requiring an action</p></div><span className="small-count">{approvals.length.toString().padStart(2,'0')}</span></div><div className="attention-list">{approvals.slice(0,3).map(a=><button className="attention-item" key={a.id} onClick={()=>onPage('Approvals')}><span className={`attention-icon ${a.priority==='Elevated'?'elevated':''}`}>{a.priority==='Elevated'?<ShieldAlert size={16}/>:<Clock3 size={16}/>}</span><span className="attention-content"><b>{a.action}</b><small>{a.assetId} <i/> {a.requestedBy}</small><em>{fmt(a.requestedAt)}</em></span><ChevronRight size={15}/></button>)}</div><Button variant="secondary" onClick={()=>onPage('Approvals')}>Review pending approvals <ArrowRight size={14}/></Button></div></section>
  <div className="bottom-note"><div className="bottom-note-icon"><Zap size={15}/></div><span><b>Audit-ready by design.</b> Every event is designed to retain its actor role, timestamp, evidence hash and transaction reference when confirmed.</span><button onClick={()=>notify('Integration guide is in the README.')}>Integration notes <ArrowUpRight size={13}/></button></div>
 </>
}
function AssetsPage({assets,search,setSearch,statusFilter,setStatusFilter,selected,onSelect,onRegister,onRecord,onOpenTx,apiConnected}:{assets:Asset[];search:string;setSearch:(s:string)=>void;statusFilter:string;setStatusFilter:(s:string)=>void;selected:Asset|null;onSelect:(a:Asset|null)=>void;onRegister:()=>void;onRecord:()=>void;onOpenTx:(t:TransactionRecord)=>void;apiConnected:boolean}){
 if(selected) return <AssetDetail asset={selected} onBack={()=>onSelect(null)} onRecord={onRecord} onOpenTx={onOpenTx}/>
 return <><PageHeading eyebrow="REGISTRY / 02" title="Equipment registry" description="Search equipment records and inspect the full custody and evidence history." actions={<Button onClick={onRegister}><Plus size={16}/> Register asset</Button>}/><div className="filter-row"><div className="search-field"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by asset, serial, supplier…"/><kbd>⌘ K</kbd></div><div className="filter-select"><ListFilter size={15}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={14}/></div><span className="result-count">{assets.length} records</span></div><div className="panel table-panel registry-table"><div className="table-scroll"><table><thead><tr><th>ASSET IDENTIFIER</th><th>SUPPLIER</th><th>STATUS</th><th>CUSTODIAN</th><th>PROOFS</th><th>REGISTERED</th><th/></tr></thead><tbody>{assets.map(a=><tr key={a.id} className="click-row" onClick={()=>onSelect(a)}><td><div className="asset-cell"><div className="asset-mini"><Cpu size={16}/></div><div><b>{a.name}</b><span>{a.id} <i/> {a.serial}</span></div></div></td><td>{a.supplier}</td><td><StatusPill status={a.status}/></td><td><div className="custodian-cell">{a.custodian}<small>{a.custodianRole}</small></div></td><td><span className="proof-count"><FileCheck2 size={13}/>{a.certificateCount}</span></td><td className="date-cell">{fmt(a.registeredAt)}</td><td><ChevronRight size={15} className="row-chevron"/></td></tr>)}</tbody></table>{assets.length===0&&<div className="empty-state"><Search size={24}/><b>No matching assets</b><span>Try a different keyword or status filter.</span></div>}</div><div className="table-bottom"><span>Showing {assets.length} matching {apiConnected?'database':'demo'} records</span><span><span className="live-dot"/> Indexed view <i/> {apiConnected?'API connected':'API not connected'}</span></div></div><div className="privacy-callout"><LockKeyhole size={16}/><span><b>Privacy by default.</b> This prototype uses fictional equipment records. Never enter classified details, operational locations, personnel data or real document content.</span></div></>
}
function AssetDetail({asset,onBack,onRecord,onOpenTx}:{asset:Asset;onBack:()=>void;onRecord:()=>void;onOpenTx:(t:TransactionRecord)=>void}){
 return <><div className="detail-back"><button className="back-link" onClick={onBack}><ArrowLeft size={15}/> Back to registry</button><span className="detail-id"><Hash size={13}/>{asset.id}</span></div><PageHeading eyebrow="ASSET RECORD / VERIFIED HISTORY" title={asset.name} description={`${asset.id} · ${asset.category} · Demo-only record`} actions={<>{config.mockDataEnabled&&<Button variant="secondary" onClick={()=>onOpenTx(mockTransactions[0])}><Activity size={15}/> View transactions</Button>}<Button onClick={onRecord}><Plus size={15}/> Record event</Button></>}/><div className="asset-hero panel"><div className="asset-hero-icon"><Cpu size={27}/><span/></div><div className="asset-hero-info"><div className="asset-title-line"><h2>{asset.name}</h2><StatusPill status={asset.status}/></div><div className="asset-hero-meta"><span><Hash size={13}/>{asset.id}</span><span><Box size={13}/>{asset.category}</span><span><Truck size={13}/>{asset.supplier}</span></div></div><div className="asset-health"><span>RECORD HEALTH</span><b>{asset.health}%</b><div className="health-track"><span style={{width:`${asset.health}%`}}/></div><small>Metadata completeness score</small></div></div>
 <div className="detail-metrics"><div className="detail-metric"><span>CURRENT CUSTODIAN</span><b><Users size={15}/>{asset.custodian}</b><small>{asset.custodianRole}</small></div><div className="detail-metric"><span>SUPPLIER SERIAL</span><b><Fingerprint size={15}/>{asset.serial}</b><small>Fictional demo identifier</small></div><div className="detail-metric"><span>DOCUMENT PROOFS</span><b><FileCheck2 size={15}/>{asset.documents.length} proof records</b><small>{asset.documents.filter(d=>d.verified).length} marked verified in demo</small></div><div className="detail-metric"><span>REGISTERED</span><b><Clock3 size={15}/>{fmt(asset.registeredAt)}</b><small>Timestamp from demo data</small></div></div>
 <div className="detail-columns"><div className="panel timeline-panel"><div className="panel-heading"><div><h2>Auditable timeline</h2><p>Chronological custody and lifecycle events</p></div><span className="timeline-count">{asset.events.length} EVENTS</span></div>{asset.events.length? <div className="timeline">{[...asset.events].sort((a,b)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime()).map((e,i)=><div className="timeline-item" key={e.id}><div className={`timeline-icon ${e.state==='Confirmed'?'confirmed':'pending'}`}>{e.type==='Custody transfer'?<Truck size={15}/>:e.type==='Maintenance'?<Wrench size={15}/>:e.type==='Audit review'?<ShieldCheck size={15}/>:e.type==='Registration'?<Package size={15}/>:<FileCheck2 size={15}/>}</div><div className="timeline-body"><div className="timeline-title-row"><b>{e.title}</b><StatusPill status={e.state}/></div><p>{e.description}</p><div className="timeline-meta"><span>{e.actorLabel}</span><i/>{e.actorRole}<i/><span>{fmt(e.timestamp)}</span></div>{e.from&&e.to&&<div className="handoff-row"><span>{e.from}</span><ArrowRight size={13}/><span>{e.to}</span></div>}{e.txHash&&<button className="hash-link" onClick={()=>onOpenTx({hash:e.txHash!,assetId:asset.id,action:e.title,submittedAt:e.timestamp,state:e.state,demoOnly:config.mockDataEnabled,confirmations:e.state==='Confirmed'?12:0,from:'0x3c12…92f1'})}><Link2 size={12}/>{shortHash(e.txHash)}<ExternalLink size={11}/></button>}</div></div>)}</div>:<div className="empty-state"><FileClock size={23}/><b>No events recorded yet</b><span>Record the first lifecycle event for this asset.</span></div>}</div>
 <div className="side-detail"><div className="panel proofs-panel"><div className="panel-heading"><div><h2>Document proofs</h2><p>Safe metadata only · files remain off-chain</p></div><span className="small-count">{asset.documents.length}</span></div>{asset.documents.length?asset.documents.map(d=><div className="proof-item" key={d.id}><div className={`proof-icon ${d.verified?'ok':''}`}><FileText size={16}/></div><div className="proof-main"><b>{d.type}</b><span>{d.issuedBy} <i/> {d.id}</span><code>{d.hash}</code><small>{d.metadata}</small></div><span className={`verify-icon ${d.verified?'verified':'unverified'}`} title={d.verified?'Demo flag: marked verified':'Pending verification'}>{d.verified?<CheckCircle2 size={16}/>:<Clock3 size={16}/>}</span></div>):<div className="empty-inline">No document proofs attached.</div>}<div className="proof-warning"><AlertTriangle size={14}/><span>Verification labels are demo flags. Live verification must compare the expected hash using the agreed API or contract.</span></div></div>
 <div className="panel chain-panel"><div className="panel-heading"><div><h2>Chain record</h2><p>Integration status</p></div><IconBox tone="cyan"><Link2 size={16}/></IconBox></div><div className="chain-field"><span>NETWORK</span><b>MST Testnet</b></div><div className="chain-field"><span>CONTRACT</span><b className="muted-value">Awaiting teammate config</b></div><div className="chain-field"><span>CONFIRMATION</span><StatusPill status="Not connected"/></div><div className="chain-bottom"><ShieldAlert size={14}/> No live chain reads in this prototype.</div></div></div></div>
 <div className="privacy-callout"><LockKeyhole size={16}/><span><b>Evidence handling.</b> Only hashes and safe metadata belong here. Store full documents in the approved off-chain system.</span></div></>
}
function ApprovalsPage({approvals,onAction,approving,role,notify}:{approvals:typeof mockApprovals;onAction:(id:string,a:'Approved'|'Rejected')=>void;approving:string|null;role:UserRole;notify:(s:string)=>void}){
 const pending=approvals.filter(a=>a.status==='Pending')
 return <><PageHeading eyebrow="GOVERNANCE / 03" title="Approval queue" description="Review registration, custody and maintenance actions awaiting an authorized decision." actions={<Button variant="secondary" onClick={()=>notify('Approval list refreshes when the API is integrated.')}><RefreshCw size={15}/> Refresh queue</Button>}/><div className="demo-banner"><div className="demo-banner-icon"><ShieldAlert size={17}/></div><div><b>Role preview: {role}</b><span>UI role selection is illustrative. Real authorization must be enforced by the API and contract.</span></div><span className="banner-badge">ROLE PREVIEW</span></div><div className="approval-summary-grid"><div className="approval-summary"><IconBox tone="amber"><Clock3 size={17}/></IconBox><div><span>Pending review</span><b>{pending.length.toString().padStart(2,'0')}</b></div></div><div className="approval-summary"><IconBox tone="cyan"><CheckCircle2 size={17}/></IconBox><div><span>Approved in demo</span><b>{approvals.filter(a=>a.status==='Approved').length.toString().padStart(2,'0')}</b></div></div><div className="approval-summary"><IconBox tone="rose"><XCircle size={17}/></IconBox><div><span>Rejected in demo</span><b>{approvals.filter(a=>a.status==='Rejected').length.toString().padStart(2,'0')}</b></div></div></div><div className="approval-list">{approvals.map(a=><div className="panel approval-card" key={a.id}><div className={`approval-priority ${a.priority==='Elevated'?'high':''}`}><ShieldCheck size={18}/></div><div className="approval-card-main"><div className="approval-title"><b>{a.action}</b><StatusPill status={a.status}/>{a.priority==='Elevated'&&<span className="priority-tag">ELEVATED</span>}</div><div className="approval-description">{a.assetName} <i/> {a.assetId}</div><div className="approval-meta"><span><Users size={13}/>{a.requestedBy}</span><i/><span>{a.role}</span><i/><span><Clock3 size={13}/>{fmt(a.requestedAt)}</span><i/><code>{a.id}</code></div></div>{a.status==='Pending'?<div className="approval-actions"><Button variant="secondary" size="small" onClick={()=>onAction(a.id,'Rejected')} disabled={approving===a.id}><X size={14}/> Reject</Button><Button size="small" onClick={()=>onAction(a.id,'Approved')} disabled={approving===a.id}>{approving===a.id?<RefreshCw size={14} className="spin"/>:<Check size={14}/>} Approve</Button></div>:<span className="resolved-label"><CheckCircle2 size={15}/> Demo decision saved locally</span>}</div>)}{!approvals.length&&<div className="panel empty-state"><ClipboardCheck size={24}/><b>Nothing awaiting review</b><span>New requests will appear here when indexed by the API.</span></div>}</div><div className="privacy-callout"><LockKeyhole size={16}/><span><b>Approvals are consequential.</b> Current buttons update local demo state only; connect real approval actions only after role permissions and contract methods are confirmed.</span></div></>
}
function TransactionsPage({transactions,onOpen,explorerUrl}:{transactions:TransactionRecord[];onOpen:(t:TransactionRecord)=>void;explorerUrl:string}){
 return <><PageHeading eyebrow="NETWORK / 04" title="Transaction log" description="Inspect lifecycle state and confirmation metadata for traceability actions." actions={<Button variant="secondary" onClick={()=>window.location.reload()}><RefreshCw size={15}/> Refresh view</Button>}/><div className="demo-banner"><div className="demo-banner-icon"><Activity size={17}/></div><div><b>Blockchain connection pending</b><span>MSTScan links are enabled only after the explorer URL is confirmed by your contract teammate.</span></div><span className="banner-badge">NOT LIVE</span></div><div className="tx-summary-row"><div className="tx-summary"><span>VISIBLE TRANSACTIONS</span><b>{transactions.length.toString().padStart(2,'0')}</b></div><div className="tx-summary"><span>CONFIRMED</span><b>{transactions.filter(t=>t.state==='Confirmed').length.toString().padStart(2,'0')}</b></div><div className="tx-summary"><span>PENDING / SUBMITTED</span><b>{transactions.filter(t=>t.state==='Submitted'||t.state==='Wallet approval').length.toString().padStart(2,'0')}</b></div><div className="tx-summary"><span>FAILED</span><b>{transactions.filter(t=>t.state==='Failed').length.toString().padStart(2,'0')}</b></div></div><div className="panel table-panel"><div className="panel-heading"><div><h2>On-chain activity</h2><p>Wallet and chain transaction lifecycle</p></div><span className="small-count">{transactions.length}</span></div><div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>ACTION</th><th>ASSET</th><th>STATE</th><th>CONFIRMATIONS</th><th>SUBMITTED</th><th/></tr></thead><tbody>{transactions.map(t=><tr key={t.hash} className="click-row" onClick={()=>onOpen(t)}><td><span className="tx-hash"><Hash size={13}/>{shortHash(t.hash)}</span></td><td>{t.action}</td><td><span className="mono-chip">{t.assetId}</span></td><td><StatusPill status={t.state}/>{t.demoOnly&&<span className="demo-chip">DEMO</span>}</td><td><span className="confirmation-count">{t.state==='Confirmed'?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {t.confirmations}</span></td><td className="date-cell">{fmt(t.submittedAt)}</td><td><ChevronRight size={15} className="row-chevron"/></td></tr>)}</tbody></table></div><div className="table-bottom"><span>Showing local demo transaction records</span><span><span className="live-dot"/> {explorerUrl?'Explorer configured':'Explorer URL not configured'}</span></div></div><div className="tx-lifecycle panel"><div className="panel-heading"><div><h2>Transaction lifecycle</h2><p>Expected UI states for wallet-signed actions</p></div></div><div className="lifecycle-steps"><div><span className="lifecycle-icon"><Wallet size={17}/></span><b>Wallet approval</b><small>User reviews and signs in their wallet</small></div><span className="lifecycle-arrow"><ArrowRight size={16}/></span><div><span className="lifecycle-icon"><Radio size={17}/></span><b>Submitted</b><small>Transaction hash received</small></div><span className="lifecycle-arrow"><ArrowRight size={16}/></span><div><span className="lifecycle-icon confirmed"><CheckCircle2 size={17}/></span><b>Confirmed</b><small>Receipt verified on the network</small></div><span className="lifecycle-or">OR</span><div><span className="lifecycle-icon failed"><XCircle size={17}/></span><b>Failed</b><small>Failure surfaced with reason</small></div></div></div></>
}
function RegisterPage({form,setForm,onSubmit,onCancel}:{form:{name:string;category:string;serial:string;supplier:string;notes:string};setForm:(f:{name:string;category:string;serial:string;supplier:string;notes:string})=>void;onSubmit:(e:React.FormEvent)=>void;onCancel:()=>void}){
 const change=(key:keyof typeof form,value:string)=>setForm({...form,[key]:value})
 return <><PageHeading eyebrow="ASSET INTAKE / 05" title="Register equipment" description="Create a traceability record using safe demo metadata. Full documents remain off-chain."/><form className="form-layout" onSubmit={onSubmit}><div className="panel form-panel"><div className="form-section-head"><IconBox><Package size={17}/></IconBox><div><h2>Asset identity</h2><p>Identify the equipment without adding sensitive operational details.</p></div><span className="required-note">* REQUIRED</span></div><div className="form-grid"><label className="field full"><span>Equipment name <i>*</i></span><input required value={form.name} onChange={e=>change('name',e.target.value)} placeholder="e.g. Portable diagnostic instrument" maxLength={100}/><small>Use a general equipment description only.</small></label><label className="field"><span>Equipment category <i>*</i></span><select value={form.category} onChange={e=>change('category',e.target.value)}>{['Power systems','Monitoring equipment','Mechanical systems','Communications','Test equipment','General equipment'].map(v=><option key={v}>{v}</option>)}</select></label><label className="field"><span>Supplier serial / reference <i>*</i></span><input required value={form.serial} onChange={e=>change('serial',e.target.value)} placeholder="DEMO-SERIAL-0001" maxLength={80}/><small>Do not use a real classified serial number.</small></label><label className="field full"><span>Supplier / manufacturer <i>*</i></span><input required value={form.supplier} onChange={e=>change('supplier',e.target.value)} placeholder="Supplier organisation name" maxLength={100}/></label><label className="field full"><span>Additional safe notes</span><textarea value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder="Optional non-sensitive description…" rows={3} maxLength={400}/></label></div></div><div className="panel form-panel"><div className="form-section-head"><IconBox tone="cyan"><FileCheck2 size={17}/></IconBox><div><h2>Supplier proof metadata</h2><p>Attach proof hashes later through the approved document workflow.</p></div></div><div className="upload-placeholder"><div className="upload-symbol"><FileText size={20}/></div><div><b>Document upload is not enabled</b><span>Full documents are intentionally not accepted in this prototype.</span><small>When integrated, store files off-chain and submit only hash + safe metadata.</small></div><span className="disabled-tag">DISABLED</span></div><div className="chain-preview"><div><span>RECORD ID</span><b>Generated on submit</b></div><div><span>INITIAL STATUS</span><b><StatusPill status="Awaiting approval"/></b></div><div><span>BLOCKCHAIN WRITE</span><b className="muted-value">Not connected</b></div></div></div><div className="form-footer"><div className="form-safe-note"><ShieldCheck size={15}/><span>Local demo only. Submitting will not write to the API or blockchain.</span></div><div><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button><Plus size={15}/> Create demo record</Button></div></div></form></>
}
function EventPage({form,setForm,assets,onSubmit,onCancel,role}:{form:{assetId:string;type:EventType;summary:string;custodian:string;documentHash:string};setForm:(f:{assetId:string;type:EventType;summary:string;custodian:string;documentHash:string})=>void;assets:Asset[];onSubmit:(e:React.FormEvent)=>void;onCancel:()=>void;role:UserRole}){
 const change=(key:keyof typeof form,value:string)=>setForm({...form,[key]:value})
 const eventTypes:EventType[]=['Delivery','Inspection','Custody transfer','Maintenance','Audit review']
 return <><PageHeading eyebrow="LIFECYCLE / 06" title="Record an event" description="Append a traceability event to an asset's lifecycle record."/><form className="form-layout" onSubmit={onSubmit}><div className="panel form-panel"><div className="form-section-head"><IconBox><Activity size={17}/></IconBox><div><h2>Event details</h2><p>Capture a minimal, auditable event description.</p></div></div><div className="form-grid"><label className="field full"><span>Equipment record <i>*</i></span><select value={form.assetId} onChange={e=>change('assetId',e.target.value)}>{assets.map(a=><option key={a.id} value={a.id}>{a.id} — {a.name}</option>)}</select></label><label className="field"><span>Event type <i>*</i></span><select value={form.type} onChange={e=>change('type',e.target.value)}>{eventTypes.map(v=><option key={v}>{v}</option>)}</select></label><label className="field"><span>Actor role</span><input value={role} readOnly/></label><label className="field full"><span>Event summary <i>*</i></span><textarea required value={form.summary} onChange={e=>change('summary',e.target.value)} rows={4} maxLength={500} placeholder="Describe the event using non-sensitive details…"/><small>Do not include personnel identifiers, exact operational locations, mission details or classified content.</small></label>{form.type==='Custody transfer'&&<label className="field full"><span>Receiving custodian (safe label)</span><input value={form.custodian} onChange={e=>change('custodian',e.target.value)} placeholder="e.g. Central equipment depot" maxLength={100}/></label>}<label className="field full"><span>Evidence hash (optional)</span><input value={form.documentHash} onChange={e=>change('documentHash',e.target.value)} placeholder="0x… (hash only; never paste a document)" maxLength={100}/><small>Hash format and verification rules must be confirmed with the backend/contract teammate.</small></label></div></div><div className="panel tx-signing-panel"><div className="signing-icon"><Wallet size={19}/></div><div><b>Wallet-signed transaction</b><span>Final integration will request a signature directly from the user's wallet and show each transaction state.</span><div className="signing-states"><span><span/> Wallet approval</span><ArrowRight size={12}/><span><span/> Submitted</span><ArrowRight size={12}/><span><span/> Confirmed</span></div></div><span className="disabled-tag">NOT CONNECTED</span></div><div className="form-footer"><div className="form-safe-note"><ShieldCheck size={15}/><span>Submitting creates local demo history only; no blockchain write occurs.</span></div><div><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button><Activity size={15}/> Queue demo event</Button></div></div></form></>
}
function TransactionModal({tx,onClose,explorerUrl}:{tx:TransactionRecord;onClose:()=>void;explorerUrl:string}){
 const url=explorerUrl&&tx.state==='Confirmed'?`${explorerUrl}/tx/${tx.hash}`:''
 return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}><motion.div className="tx-modal panel" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} onClick={e=>e.stopPropagation()}><div className="modal-header"><div><div className="eyebrow"><span/> TRANSACTION DETAIL</div><h2>Transaction status</h2></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div><div className="tx-modal-status"><div className={`tx-state-icon ${tx.state.toLowerCase().replaceAll(' ','-')}`}>{tx.state==='Confirmed'?<CheckCircle2 size={22}/>:tx.state==='Failed'?<XCircle size={22}/>:tx.state==='Submitted'?<Radio size={22}/>:<Wallet size={22}/>}</div><div><b>{tx.state}</b><span>{tx.state==='Confirmed'?'Receipt confirmed by network':tx.state==='Failed'?'The transaction did not complete':tx.state==='Submitted'?'Transaction hash received; waiting for receipt':'Waiting for wallet signature'}</span></div><StatusPill status={tx.state}/></div><div className="tx-detail-list"><div><span>TRANSACTION HASH</span><code>{tx.hash}</code><button className="copy-button" onClick={()=>navigator.clipboard?.writeText(tx.hash)} title="Copy hash"><Copy size={14}/></button></div><div><span>ASSET</span><b>{tx.assetId}</b></div><div><span>ACTION</span><b>{tx.action}</b></div><div><span>SUBMITTED AT</span><b>{fmt(tx.submittedAt)}</b></div><div><span>FROM WALLET</span><code>{tx.from}</code></div><div><span>CONFIRMATIONS</span><b>{tx.confirmations}</b></div>{tx.blockNumber&&<div><span>BLOCK NUMBER</span><b>{tx.blockNumber}</b></div>}{tx.error&&<div><span>FAILURE REASON</span><b className="error-text">{tx.error}</b></div>}</div>{tx.state==='Confirmed'&&url&&!tx.demoOnly?<a className="explorer-button" href={url} target="_blank" rel="noreferrer">View on MSTScan <ExternalLink size={14}/></a>:<div className="explorer-unavailable"><AlertTriangle size={14}/>{tx.demoOnly?'This is a fictional demo record. Explorer links are disabled to avoid implying a real chain transaction.':tx.state!=='Confirmed'?'Explorer link appears after confirmation and receipt verification.':'Explorer URL not configured; confirm the MSTScan base URL with the contract teammate.'}</div>}<div className="modal-disclaimer"><ShieldAlert size={14}/> This transaction is confirmed on MST Testnet. Use “View on MSTScan” to verify it.. Never treat local mock records as chain-confirmed.</div><div className="modal-footer"><Button variant="secondary" onClick={onClose}>Close details</Button></div></motion.div></motion.div>
}

export default App;




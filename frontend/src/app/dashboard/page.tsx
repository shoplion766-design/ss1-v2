'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { affiliateApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  LayoutDashboard, Users, DollarSign, Bell, LogOut, Copy, Check,
  TrendingUp, Wallet, Menu, ShoppingBag, Coins, User, Star,
  Camera, Package, Zap, RefreshCw, X, Plus, Minus, ShoppingCart,
  Award, Clock, Shield
} from 'lucide-react';

const G = '#c9961a';
const GL = '#e8b830';
const FD = '#051a0c';
const FM = '#0c2914';
const FB = '#163d1e';
const PIE_COLORS = ['#2d8a46','#c9961a','#5cc87a','#e8b830','#4caf6b','#a07810'];

const CURRENCIES = [
  { code:'USD', symbol:'$',    flag:'🇺🇸', name:'US Dollar' },
  { code:'EUR', symbol:'€',    flag:'🇪🇺', name:'Euro' },
  { code:'XAF', symbol:'FCFA', flag:'🌍', name:'Franc CFA' },
  { code:'GBP', symbol:'£',    flag:'🇬🇧', name:'British Pound' },
  { code:'AED', symbol:'AED',  flag:'🇦🇪', name:'UAE Dirham' },
  { code:'MAD', symbol:'MAD',  flag:'🇲🇦', name:'Dirham Marocain' },
];

const RANKS = ['INVEST','KING','STOCKIST','AMBASSADOR'];

export default function DashboardPage() {
  const { user, logout, lang, loading: authLoading } = useAuth();
  const router = useRouter();
  const isRtl = lang === 'ar';

  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [referrals, setReferrals] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [summary, setSummary] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [myTokens, setMyTokens] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buyMsg, setBuyMsg] = useState('');
  const [buying, setBuying] = useState(false);
  const [tokenCurrency, setTokenCurrency] = useState('USD');
  const [tokenAmount, setTokenAmount] = useState('');
  const [genToken, setGenToken] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [profileForm, setProfileForm] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!authLoading && !user) router.push('/auth/login'); }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    Promise.all([affiliateApi.dashboard(), affiliateApi.earningsSummary()])
      .then(([d, s]) => { setData(d.data); setSummary(s.data.summary || []); })
      .catch(console.error).finally(() => setLoading(false));
    affiliateApi.products().then(r => setProducts(r.data.products || [])).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (tab === 'referrals' && !referrals)
      affiliateApi.referrals(3).then(r => setReferrals(r.data)).catch(console.error);
    if (tab === 'earnings' && !earnings)
      affiliateApi.earnings().then(r => setEarnings(r.data)).catch(console.error);
    if (tab === 'notif' && notifs.length === 0)
      affiliateApi.notifications(lang).then(r => setNotifs(r.data.notifications || [])).catch(console.error);
    if (tab === 'ecommerce' && orders.length === 0)
      affiliateApi.orders().then(r => setOrders(r.data.orders || [])).catch(console.error);
    if (tab === 'tokens' && myTokens.length === 0)
      affiliateApi.myTokens().then(r => setMyTokens(r.data.tokens || [])).catch(console.error);
    if (tab === 'profile' && user)
      setProfileForm({ firstName: user.firstName, lastName: user.lastName });
  }, [tab]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/auth/register?ref=${user?.referralCode}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const cartItems = Object.entries(cart).filter(([,q]) => q > 0);
  const cartTotal = cartItems.reduce((acc, [id, qty]) => {
    const p = products.find(p => p.id === id);
    return acc + (p ? p.price_usd * qty : 0);
  }, 0);
  const cartPv = cartItems.reduce((acc, [id, qty]) => {
    const p = products.find(p => p.id === id);
    return acc + (p ? parseFloat(p.pv_points) * qty : 0);
  }, 0);

  const handleBuy = async () => {
    if (cartItems.length === 0) return;
    setBuying(true); setBuyMsg('');
    try {
      const items = cartItems.map(([productId, qty]) => ({ productId, qty }));
      const res = await affiliateApi.createOrder(items);
      setBuyMsg(`✅ Commande confirmée ! Bonus PV: $${res.data.pvBonus?.toFixed(2)}`);
      setCart({});
      affiliateApi.orders().then(r => setOrders(r.data.orders || []));
      affiliateApi.dashboard().then(r => setData(r.data));
    } catch (e: any) { setBuyMsg('❌ ' + (e.response?.data?.error || 'Erreur')); }
    finally { setBuying(false); }
  };

  const handleGenToken = async () => {
    if (!tokenAmount || parseFloat(tokenAmount) <= 0) return;
    setGenToken(true); setGenMsg('');
    try {
      const res = await affiliateApi.generateToken(parseFloat(tokenAmount), tokenCurrency);
      setGenMsg(`✅ Jeton généré: ${res.data.code}`);
      setMyTokens(prev => [res.data, ...prev]);
      setTokenAmount('');
    } catch (e: any) { setGenMsg('❌ ' + (e.response?.data?.error || 'Erreur')); }
    finally { setGenToken(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      try { await affiliateApi.updateAvatar(base64); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await affiliateApi.updateProfile({ ...profileForm, language: lang });
    } catch {}
    setSavingProfile(false);
  };

  if (authLoading || !user) return (
    <div style={{ minHeight:'100vh', background: FD, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, border:`2px solid ${FB}`, borderTop:`2px solid ${GL}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );

  const balance = parseFloat(data?.earnings?.confirmed_usd || 0);
  const pending = parseFloat(data?.earnings?.pending_usd || 0);
  const lifetime = parseFloat(data?.user?.lifetime_earnings || 0);
  const tokenBal = parseFloat(data?.user?.token_balance || 0);
  const monthly = data?.monthlyEarnings || [];
  const top = data?.topPerformer;

  const NAV = [
    { id:'overview',   icon: LayoutDashboard, label: lang==='fr'?'Vue d\'ensemble':lang==='ar'?'نظرة عامة':'Overview' },
    { id:'ecommerce',  icon: ShoppingBag,      label: lang==='fr'?'Boutique':lang==='ar'?'المتجر':'Shop' },
    { id:'referrals',  icon: Users,            label: lang==='fr'?'Mon Réseau':lang==='ar'?'شبكتي':'Network' },
    { id:'earnings',   icon: DollarSign,       label: lang==='fr'?'Gains':lang==='ar'?'الأرباح':'Earnings' },
    { id:'tokens',     icon: Coins,            label: lang==='fr'?'Jetons':lang==='ar'?'الرموز':'Tokens' },
    { id:'profile',    icon: User,             label: lang==='fr'?'Profil':lang==='ar'?'الملف':'Profile' },
    { id:'notif',      icon: Bell,             label: lang==='fr'?'Notifications':lang==='ar'?'الإشعارات':'Alerts', badge: data?.unreadNotifications },
  ];

  const Sidebar = ({ mobile = false }) => (
    <aside style={{ width: mobile ? '100%' : 220, background: '#040f08', borderRight: `1px solid ${FB}`,
      display:'flex', flexDirection:'column', height: mobile ? 'auto' : '100vh',
      position: mobile ? 'relative' : 'fixed', top:0, left: isRtl ? 'auto' : 0, right: isRtl ? 0 : 'auto', zIndex:50 }}>
      <div style={{ padding:'22px 18px 16px', borderBottom:`1px solid ${FB}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:`linear-gradient(135deg,${G},${GL})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:17, color:'#040f08' }}>S</div>
          <div>
            <div style={{ fontFamily:'Playfair Display,serif', fontWeight:700, fontSize:15, color:GL }}>SS1</div>
            <div style={{ fontSize:9, color:'rgba(200,220,202,0.3)', letterSpacing:'.12em' }}>PLATFORM</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 14px', borderBottom:`1px solid ${FB}` }}>
        <div style={{ position:'relative', width:44, height:44, marginBottom:8 }}>
          <div style={{ width:44, height:44, borderRadius:12, overflow:'hidden', border:`1px solid ${FB}`,
            background: FM, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {(avatarPreview || data?.user?.avatar_url) ? (
              <img src={avatarPreview || data?.user?.avatar_url} alt="avatar"
                style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <span style={{ fontFamily:'Playfair Display,serif', fontSize:18, fontWeight:700, color:GL }}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
            )}
          </div>
          <button onClick={() => fileRef.current?.click()}
            style={{ position:'absolute', bottom:-4, right:-4, width:18, height:18, borderRadius:'50%',
              background: G, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Camera size={10} color="#040f08" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarChange} />
        </div>
        <div style={{ fontSize:13, fontWeight:600, color:'rgba(232,240,233,0.9)' }}>{user.firstName} {user.lastName}</div>
        <div style={{ fontSize:10, color: G, fontWeight:600, letterSpacing:'.08em' }}>{data?.user?.rank || 'INVEST'}</div>
        <div style={{ fontSize:10, color:'rgba(200,220,202,0.35)', marginTop:1 }}>{user.referralCode}</div>
      </div>

      <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(({ id, icon: Icon, label, badge }) => (
          <button key={id} onClick={() => { setTab(id); setSidebarOpen(false); }}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px',
              borderRadius:9, border:'none', cursor:'pointer', textAlign:'left',
              background: tab===id ? `rgba(201,150,26,0.13)` : 'transparent',
              color: tab===id ? GL : 'rgba(200,220,202,0.45)',
              fontSize:13, fontWeight: tab===id ? 600 : 400, transition:'all .15s', position:'relative' }}>
            <Icon size={16} />
            {label}
            {badge ? <span style={{ marginLeft:'auto', background:G, color:'#040f08', fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:100 }}>{badge}</span> : null}
          </button>
        ))}
      </nav>

      <div style={{ padding:'12px 10px', borderTop:`1px solid ${FB}` }}>
        <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 10px',
          borderRadius:9, border:'none', cursor:'pointer', background:'transparent', color:'rgba(200,220,202,0.3)', fontSize:13 }}>
          <LogOut size={15} /> {lang==='fr'?'Déconnexion':lang==='ar'?'خروج':'Logout'}
        </button>
      </div>
    </aside>
  );

  return (
    <div dir={isRtl?'rtl':'ltr'} style={{ minHeight:'100vh', background: FD, display:'flex' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .hover-card:hover{border-color:rgba(201,150,26,0.35)!important;}`}</style>

      {/* Sidebar desktop */}
      <div className="hidden-mobile" style={{ width:220, flexShrink:0 }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100 }} onClick={() => setSidebarOpen(false)}>
          <div style={{ width:240, height:'100vh', background:'#040f08' }} onClick={e => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <main style={{ flex:1, marginLeft:0, padding:'28px 24px', minHeight:'100vh', overflowY:'auto',
        maxWidth:'calc(100vw - 220px)' }}>

        {/* Mobile topbar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background:'none', border:'none', color:GL, cursor:'pointer' }}>
            <Menu size={22} />
          </button>
          <div style={{ fontFamily:'Playfair Display,serif', fontSize:18, fontWeight:700, color:GL }}>SS1</div>
          <div style={{ width:22 }} />
        </div>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:26, fontWeight:700, marginBottom:4 }}>
                {lang==='fr'?'Bonjour':lang==='ar'?'مرحباً':'Hello'},{' '}
                <span style={{ background:`linear-gradient(135deg,${G},${GL})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {user.firstName}
                </span>
              </h1>
              <p style={{ fontSize:12, color:'rgba(200,220,202,0.35)' }}>
                {user.referralCode} · {data?.user?.package_name || '—'}
                {data?.user?.bogo_eligible && (
                  <span style={{ marginLeft:8, background:'rgba(34,138,70,0.15)', color:'#5cc87a',
                    fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, border:'1px solid rgba(34,138,70,0.3)' }}>
                    🎁 BOGO
                  </span>
                )}
              </p>
            </div>

            {/* KPI Row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12 }}>
              {[
                { label: lang==='fr'?'Solde dispo':lang==='ar'?'الرصيد':'Balance', value:`$${balance.toFixed(2)}`, color:GL, icon: Wallet },
                { label: lang==='fr'?'En attente':lang==='ar'?'معلق':'Pending', value:`$${pending.toFixed(2)}`, color:G, icon: Clock },
                { label: lang==='fr'?'Gains totaux':lang==='ar'?'المجموع':'Lifetime', value:`$${lifetime.toFixed(2)}`, color:'#5cc87a', icon: TrendingUp },
                { label: lang==='fr'?'Jetons':lang==='ar'?'الرموز':'Tokens', value:tokenBal.toFixed(2), color:'#a78bfa', icon: Coins },
                { label: lang==='fr'?'Filleuls directs':lang==='ar'?'الإحالات':'Direct', value: data?.directReferrals || 0, color:'#60a5fa', icon: Users },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="hover-card" style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, padding:18, transition:'border-color .2s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ fontSize:10, color:'rgba(200,220,202,0.4)', textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</div>
                    <div style={{ width:28, height:28, borderRadius:7, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={13} color={color} />
                    </div>
                  </div>
                  <div style={{ fontSize:24, fontWeight:700, color, fontFamily:'Playfair Display,serif', lineHeight:1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Referral link */}
            <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, padding:18 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'rgba(200,220,202,0.6)', marginBottom:10 }}>
                {lang==='fr'?'Mon lien de parrainage':lang==='ar'?'رابط الإحالة':'Referral Link'}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, background:'#0c2914', border:`1px solid ${FB}`, borderRadius:8,
                  padding:'10px 14px', fontSize:12, color:'rgba(200,220,202,0.5)', fontFamily:'monospace',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  ss1.io/ref/{user.referralCode}
                </div>
                <button onClick={copyLink} style={{ background:`linear-gradient(135deg,${G},${GL})`, color:'#040f08',
                  border:'none', borderRadius:8, padding:'10px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600 }}>
                  {copied ? <Check size={14}/> : <Copy size={14}/>}
                  {copied ? 'Copié!' : 'Copier'}
                </button>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
              <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(200,220,202,0.7)', marginBottom:16 }}>
                  {lang==='fr'?'Évolution mensuelle (net après retenue 2%)':'Monthly (net after 2% retention)'}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={monthly.length ? monthly : [{ month:'—', total:0 }]}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={G} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={G} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,61,30,0.8)" />
                    <XAxis dataKey="month" tick={{ fill:'rgba(200,220,202,0.3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'rgba(200,220,202,0.3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:8, fontSize:12 }}/>
                    <Area type="monotone" dataKey="total" stroke={GL} strokeWidth={2} fill="url(#grad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(200,220,202,0.7)', marginBottom:14 }}>
                  {lang==='fr'?'Sources de gains':'Earnings sources'}
                </div>
                {summary.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={summary} dataKey="total_net" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                          {summary.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:8, fontSize:11 }}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:8 }}>
                      {summary.slice(0,4).map((s: any, i: number) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(200,220,202,0.5)' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <span style={{ width:7, height:7, borderRadius:2, background:PIE_COLORS[i], display:'inline-block' }}/>
                            {s.type.replace(/_/g,' ')}
                          </span>
                          <span style={{ color:GL, fontWeight:600 }}>${parseFloat(s.total_net).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:'center', color:'rgba(200,220,202,0.25)', fontSize:12, paddingTop:40 }}>Aucun gain</div>
                )}
              </div>
            </div>

            {/* Top Performer du mois */}
            {top && (
              <div style={{ background:'linear-gradient(135deg,rgba(45,138,70,0.12),rgba(201,150,26,0.08))',
                border:`1px solid rgba(45,138,70,0.25)`, borderRadius:12, padding:20,
                display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:`linear-gradient(135deg,${G},${GL})`,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Award size={24} color="#040f08" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'rgba(200,220,202,0.4)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>
                    🏆 {lang==='fr'?'Top Performer du mois':'Top Performer of the Month'}
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, color:GL, fontFamily:'Playfair Display,serif' }}>
                    {top.first_name} {top.last_name}
                  </div>
                  <div style={{ fontSize:12, color:'rgba(200,220,202,0.5)', marginTop:2 }}>
                    ${parseFloat(top.earnings_usd).toFixed(2)} gains · {top.new_referrals} filleuls · {top.country}
                  </div>
                </div>
                <div style={{ fontSize:24, fontWeight:800, color:G, fontFamily:'Playfair Display,serif' }}>
                  #{1}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOUTIQUE E-COMMERCE ───────────────────────── */}
        {tab === 'ecommerce' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div>
              <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:22, fontWeight:700, marginBottom:4 }}>
                <span style={{ background:`linear-gradient(135deg,${G},${GL})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {lang==='fr'?'Boutique SS1':lang==='ar'?'متجر SS1':'SS1 Shop'}
                </span>
              </h2>
              <p style={{ fontSize:12, color:'rgba(200,220,202,0.4)' }}>
                {lang==='fr'?'Achetez directement — débité sur votre solde, +20% des PV en bonus':'Direct purchase — debited from balance, +20% PV bonus'}
              </p>
            </div>

            {/* Products grid — placeholders si pas d'images */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
              {products.map((p: any) => (
                <div key={p.id} style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:14, overflow:'hidden',
                  transition:'border-color .2s', cursor:'pointer' }}
                  className="hover-card">
                  <div style={{ height:160, background:'#0c2914', position:'relative', overflow:'hidden' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name}
                        style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
                    ) : (
                      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                        flexDirection:'column', gap:8 }}>
                        <Package size={40} color={FB} />
                        <span style={{ fontSize:11, color:'rgba(200,220,202,0.2)' }}>Photo à venir</span>
                      </div>
                    )}
                    <div style={{ position:'absolute', top:8, right:8, background:'rgba(201,150,26,0.9)',
                      color:'#040f08', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6 }}>
                      {p.pv_points} PV
                    </div>
                  </div>
                  <div style={{ padding:14 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:'rgba(200,220,202,0.45)', marginBottom:4 }}>{p.tagline}</div>
                    {p.ingredients && <div style={{ fontSize:10, color:'rgba(200,220,202,0.3)', lineHeight:1.4, marginBottom:10 }}>{p.ingredients}</div>}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontFamily:'Playfair Display,serif', fontSize:18, fontWeight:700, color:GL }}>${p.price_usd}</div>
                        <div style={{ fontSize:10, color:'rgba(200,220,202,0.3)' }}>{p.price_fcfa ? `≈ ${parseInt(p.price_fcfa).toLocaleString()} FCFA` : ''}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <button onClick={() => setCart(c => ({ ...c, [p.id]: Math.max(0,(c[p.id]||0)-1) }))}
                          style={{ width:26, height:26, borderRadius:6, border:`1px solid ${FB}`, background:'transparent',
                            color:'rgba(200,220,202,0.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Minus size={12}/>
                        </button>
                        <span style={{ fontSize:14, fontWeight:600, color:GL, minWidth:20, textAlign:'center' }}>{cart[p.id]||0}</span>
                        <button onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id]||0)+1 }))}
                          style={{ width:26, height:26, borderRadius:6, background:`linear-gradient(135deg,${G},${GL})`,
                            border:'none', color:'#040f08', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Plus size={12}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Placeholder pour photos à venir */}
              {products.length === 0 && [1,2,3,4].map(i => (
                <div key={i} style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:14, padding:20, textAlign:'center', color:'rgba(200,220,202,0.2)' }}>
                  <Package size={40} style={{ margin:'0 auto 8px' }}/>
                  <div style={{ fontSize:12 }}>Photo à venir</div>
                </div>
              ))}
            </div>

            {/* Cart summary */}
            {cartItems.length > 0 && (
              <div style={{ background:'rgba(201,150,26,0.08)', border:`1px solid rgba(201,150,26,0.25)`, borderRadius:12, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:600, color:GL }}>
                    <ShoppingCart size={16} style={{ display:'inline', marginRight:6 }}/>
                    Panier ({cartItems.length} article{cartItems.length>1?'s':''})
                  </div>
                  <div style={{ fontSize:13, color:'rgba(200,220,202,0.5)' }}>
                    PV total: <span style={{ color:'#5cc87a', fontWeight:600 }}>{cartPv.toFixed(1)}</span>
                    {' '}→ Bonus: <span style={{ color:GL, fontWeight:600 }}>${(cartPv * 0.20).toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontFamily:'Playfair Display,serif', fontSize:22, fontWeight:700, color:GL }}>
                    Total: ${cartTotal.toFixed(2)}
                  </div>
                  <button onClick={handleBuy} disabled={buying}
                    style={{ background:`linear-gradient(135deg,${G},${GL})`, color:'#040f08', border:'none',
                      borderRadius:8, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    {buying ? 'Traitement...' : '✓ Confirmer la commande'}
                  </button>
                </div>
                {buyMsg && <div style={{ marginTop:10, fontSize:13, color: buyMsg.startsWith('✅') ? '#5cc87a' : '#f87171' }}>{buyMsg}</div>}
              </div>
            )}

            {/* Historique commandes */}
            {orders.length > 0 && (
              <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:`1px solid ${FB}`, fontSize:13, fontWeight:600, color:'rgba(200,220,202,0.7)' }}>
                  {lang==='fr'?'Mes commandes':'My Orders'}
                </div>
                {orders.map((o: any) => (
                  <div key={o.id} style={{ padding:'12px 18px', borderBottom:`1px solid rgba(22,61,30,0.5)`,
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500 }}>Commande #{o.id.substring(0,8)}</div>
                      <div style={{ fontSize:11, color:'rgba(200,220,202,0.35)' }}>{new Date(o.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:GL }}>${parseFloat(o.total_usd).toFixed(2)}</div>
                      <div style={{ fontSize:10, color:'#5cc87a' }}>+${parseFloat(o.pv_bonus_usd||0).toFixed(2)} PV bonus</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RÉSEAU ────────────────────────────────────── */}
        {tab === 'referrals' && (
          <div>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:22, fontWeight:700, marginBottom:20 }}>
              <span style={{ background:`linear-gradient(135deg,${G},${GL})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                {lang==='fr'?'Mon Réseau':lang==='ar'?'شبكتي':'My Network'}
              </span>
            </h2>
            {!referrals ? <div style={{ textAlign:'center', padding:40, color:'rgba(200,220,202,0.3)' }}>Chargement...</div> : (
              <>
                <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
                  {Object.entries(referrals.byLevel||{}).map(([d, s]: any) => (
                    <div key={d} style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:10, padding:'12px 18px' }}>
                      <div style={{ fontSize:10, color:'rgba(200,220,202,0.4)' }}>Niveau {d}</div>
                      <div style={{ fontSize:20, fontWeight:700, color:GL }}>{s.count}</div>
                      <div style={{ fontSize:10, color:'rgba(200,220,202,0.3)' }}>{s.total_bv} BV</div>
                    </div>
                  ))}
                  <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:10, padding:'12px 18px' }}>
                    <div style={{ fontSize:10, color:'rgba(200,220,202,0.4)' }}>Total réseau</div>
                    <div style={{ fontSize:20, fontWeight:700, color:G }}>{referrals.total}</div>
                  </div>
                </div>
                <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, overflow:'hidden' }}>
                  {(referrals.tree||[]).map((m: any) => (
                    <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'12px 18px', borderBottom:`1px solid rgba(22,61,30,0.5)` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:9, background:FM, border:`1px solid ${FB}`,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:GL }}>
                          {m.first_name?.[0]}{m.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500 }}>{m.first_name} {m.last_name}</div>
                          <div style={{ fontSize:10, color:'rgba(200,220,202,0.35)' }}>{m.package_name||'—'} · {m.total_bv} BV</div>
                        </div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100,
                        background: m.status==='active'?'rgba(92,200,122,0.1)':'rgba(248,113,113,0.1)',
                        color: m.status==='active'?'#5cc87a':'#f87171' }}>{m.status}</span>
                    </div>
                  ))}
                  {(referrals.tree||[]).length===0 && (
                    <div style={{ padding:40, textAlign:'center', color:'rgba(200,220,202,0.3)', fontSize:13 }}>
                      Partagez votre lien pour recruter vos premiers filleuls
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── GAINS ─────────────────────────────────────── */}
        {tab === 'earnings' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:22, fontWeight:700 }}>
                <span style={{ background:`linear-gradient(135deg,${G},${GL})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {lang==='fr'?'Historique des Gains':'Earnings History'}
                </span>
              </h2>
              <div style={{ fontSize:11, color:'rgba(200,220,202,0.4)', background:'rgba(45,138,70,0.08)',
                padding:'6px 12px', borderRadius:8, border:`1px solid ${FB}` }}>
                <Shield size={11} style={{ display:'inline', marginRight:4 }}/>
                Retenue 2% sur chaque bonus
              </div>
            </div>
            <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, overflow:'hidden' }}>
              {!earnings ? <div style={{ padding:40, textAlign:'center', color:'rgba(200,220,202,0.3)' }}>Chargement...</div> : (
                (earnings.earnings||[]).map((e: any) => (
                  <div key={e.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'13px 18px', borderBottom:`1px solid rgba(22,61,30,0.4)` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                        background: e.status==='confirmed'?'#5cc87a':e.status==='paid'?'#60a5fa':'#f59e0b' }}/>
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, textTransform:'capitalize' }}>{e.type.replace(/_/g,' ')}</div>
                        <div style={{ fontSize:10, color:'rgba(200,220,202,0.3)' }}>{new Date(e.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:GL }}>${parseFloat(e.amount_net||e.amount_usd).toFixed(4)}</div>
                      {e.amount_retained > 0 && <div style={{ fontSize:10, color:'rgba(200,220,202,0.3)' }}>-${parseFloat(e.amount_retained).toFixed(4)} retenu</div>}
                    </div>
                  </div>
                ))
              )}
              {earnings?.earnings?.length === 0 && (
                <div style={{ padding:40, textAlign:'center', color:'rgba(200,220,202,0.3)', fontSize:13 }}>Aucun gain</div>
              )}
            </div>
          </div>
        )}

        {/* ── JETONS ────────────────────────────────────── */}
        {tab === 'tokens' && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:22, fontWeight:700 }}>
              <span style={{ background:`linear-gradient(135deg,${G},${GL})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                {lang==='fr'?'Mes Jetons':lang==='ar'?'رموزي':'My Tokens'}
              </span>
            </h2>

            <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, padding:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'rgba(200,220,202,0.6)', marginBottom:14 }}>
                {lang==='fr'?'Générer un jeton':'Generate a Token'}
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <select value={tokenCurrency} onChange={e => setTokenCurrency(e.target.value)}
                  style={{ background:'#0c2914', border:`1px solid ${FB}`, color:'rgba(200,220,202,0.8)', borderRadius:8,
                    padding:'10px 12px', fontSize:13, cursor:'pointer' }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                </select>
                <input type="number" value={tokenAmount} onChange={e => setTokenAmount(e.target.value)}
                  placeholder="Montant en USD" min="1" step="0.01"
                  style={{ flex:1, minWidth:140, background:'#0c2914', border:`1px solid ${FB}`,
                    color:'rgba(200,220,202,0.8)', borderRadius:8, padding:'10px 12px', fontSize:13 }}/>
                <button onClick={handleGenToken} disabled={genToken || !tokenAmount}
                  style={{ background:`linear-gradient(135deg,${G},${GL})`, color:'#040f08', border:'none',
                    borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                  {genToken ? <RefreshCw size={14}/> : <Zap size={14} style={{ display:'inline', marginRight:4 }}/>}
                  {lang==='fr'?'Générer':'Generate'}
                </button>
              </div>
              {genMsg && <div style={{ marginTop:10, fontSize:12, color: genMsg.startsWith('✅')?'#5cc87a':'#f87171' }}>{genMsg}</div>}
              <div style={{ marginTop:10, fontSize:11, color:'rgba(200,220,202,0.35)' }}>
                Taux: 1 USD = 1 jeton · 1 EUR ≈ 1.08 jetons · 1 FCFA ≈ 0.00161 jetons
              </div>
            </div>

            <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'13px 18px', borderBottom:`1px solid ${FB}`, fontSize:13, fontWeight:600, color:'rgba(200,220,202,0.7)' }}>
                {lang==='fr'?'Mes jetons générés':'Generated Tokens'} ({myTokens.length})
              </div>
              {myTokens.map((t: any) => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 18px', borderBottom:`1px solid rgba(22,61,30,0.4)` }}>
                  <div>
                    <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:600, color:GL }}>{t.code}</div>
                    <div style={{ fontSize:10, color:'rgba(200,220,202,0.35)' }}>
                      {t.amount} jetons · {t.currency} · expire {new Date(t.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100,
                      background: t.status==='active'?'rgba(92,200,122,0.1)':'rgba(156,163,175,0.1)',
                      color: t.status==='active'?'#5cc87a':'#9ca3af' }}>{t.status}</span>
                    <button onClick={() => { navigator.clipboard.writeText(t.code); setCopiedToken(t.code); setTimeout(()=>setCopiedToken(''),1500); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(200,220,202,0.4)' }}>
                      {copiedToken===t.code ? <Check size={14} color="#5cc87a"/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>
              ))}
              {myTokens.length === 0 && <div style={{ padding:32, textAlign:'center', color:'rgba(200,220,202,0.3)', fontSize:13 }}>Aucun jeton généré</div>}
            </div>
          </div>
        )}

        {/* ── PROFIL ────────────────────────────────────── */}
        {tab === 'profile' && (
          <div style={{ maxWidth:480 }}>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:22, fontWeight:700, marginBottom:20 }}>
              <span style={{ background:`linear-gradient(135deg,${G},${GL})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                {lang==='fr'?'Mon Profil':lang==='ar'?'ملفي':'My Profile'}
              </span>
            </h2>
            <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:14, padding:24, display:'flex', flexDirection:'column', gap:16 }}>
              {/* Avatar */}
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:4 }}>
                <div style={{ position:'relative' }}>
                  <div style={{ width:72, height:72, borderRadius:16, overflow:'hidden', border:`2px solid ${FB}`,
                    background:FM, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {(avatarPreview || data?.user?.avatar_url) ? (
                      <img src={avatarPreview || data?.user?.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    ) : (
                      <span style={{ fontFamily:'Playfair Display,serif', fontSize:24, fontWeight:700, color:GL }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ position:'absolute', bottom:-4, right:-4, width:24, height:24, borderRadius:'50%',
                      background:`linear-gradient(135deg,${G},${GL})`, border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Camera size={12} color="#040f08"/>
                  </button>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{user.firstName} {user.lastName}</div>
                  <div style={{ fontSize:12, color:G, fontWeight:600 }}>{data?.user?.rank || 'INVEST'} · {data?.user?.package_name}</div>
                  <div style={{ fontSize:11, color:'rgba(200,220,202,0.3)' }}>{user.email}</div>
                </div>
              </div>

              {[
                { key:'firstName', label:lang==='fr'?'Prénom':'First Name', type:'text' },
                { key:'lastName',  label:lang==='fr'?'Nom':'Last Name',    type:'text' },
                { key:'phone',     label:lang==='fr'?'Téléphone':'Phone',  type:'tel' },
                { key:'country',   label:lang==='fr'?'Pays':'Country',     type:'text' },
                { key:'city',      label:lang==='fr'?'Ville':'City',        type:'text' },
                { key:'locality',  label:lang==='fr'?'Localité (pour stockiste)':'Locality', type:'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label style={{ fontSize:10, color:'rgba(200,220,202,0.45)', display:'block', marginBottom:5, letterSpacing:'.08em', textTransform:'uppercase' }}>{label}</label>
                  <input type={type} value={profileForm[key]||''} onChange={e => setProfileForm((f: any) => ({...f, [key]: e.target.value}))}
                    style={{ width:'100%', background:'#0c2914', border:`1px solid ${FB}`, borderRadius:8,
                      color:'rgba(200,220,202,0.85)', padding:'10px 12px', fontSize:13, outline:'none' }}/>
                </div>
              ))}

              <div>
                <label style={{ fontSize:10, color:'rgba(200,220,202,0.45)', display:'block', marginBottom:5, letterSpacing:'.08em', textTransform:'uppercase' }}>
                  Devise préférée
                </label>
                <select value={profileForm.preferredCurrency||'USD'} onChange={e => setProfileForm((f: any) => ({...f, preferredCurrency: e.target.value}))}
                  style={{ width:'100%', background:'#0c2914', border:`1px solid ${FB}`, borderRadius:8,
                    color:'rgba(200,220,202,0.85)', padding:'10px 12px', fontSize:13, cursor:'pointer' }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                </select>
              </div>

              <button onClick={handleSaveProfile} disabled={savingProfile}
                style={{ background:`linear-gradient(135deg,${G},${GL})`, color:'#040f08', border:'none',
                  borderRadius:8, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {savingProfile ? 'Sauvegarde...' : lang==='fr'?'Enregistrer':'Save Profile'}
              </button>

              {/* Stats profil */}
              <div style={{ borderTop:`1px solid ${FB}`, paddingTop:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { label:'Gains totaux', value:`$${lifetime.toFixed(2)}` },
                  { label:'Total BV', value: data?.user?.total_bv || 0 },
                  { label:'Membre depuis', value: data?.user?.created_at ? new Date(data.user.created_at).toLocaleDateString('fr', {month:'short', year:'numeric'}) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign:'center', background:FM, borderRadius:8, padding:'10px 6px' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:GL }}>{value}</div>
                    <div style={{ fontSize:9, color:'rgba(200,220,202,0.35)', marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ─────────────────────────────── */}
        {tab === 'notif' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:22, fontWeight:700 }}>
                <span style={{ background:`linear-gradient(135deg,${G},${GL})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  Notifications
                </span>
              </h2>
              {notifs.some(n => !n.is_read) && (
                <button onClick={() => { affiliateApi.markRead('all'); setNotifs(ns => ns.map(n => ({...n, is_read:true}))); }}
                  style={{ background:'transparent', border:`1px solid ${FB}`, color:G, borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer' }}>
                  Tout lire
                </button>
              )}
            </div>
            <div style={{ background:'#081f10', border:`1px solid ${FB}`, borderRadius:12, overflow:'hidden' }}>
              {notifs.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', color:'rgba(200,220,202,0.3)', fontSize:13 }}>Aucune notification</div>
              ) : notifs.map((n: any) => (
                <div key={n.id} style={{ padding:'14px 18px', borderBottom:`1px solid rgba(22,61,30,0.4)`,
                  background: n.is_read?'transparent':'rgba(201,150,26,0.04)', display:'flex', gap:10 }}>
                  {!n.is_read && <div style={{ width:6, height:6, borderRadius:'50%', background:GL, flexShrink:0, marginTop:6 }}/>}
                  <div>
                    <div style={{ fontSize:13, fontWeight: n.is_read?400:600, marginBottom:3 }}>{n.title||n.type}</div>
                    <div style={{ fontSize:12, color:'rgba(200,220,202,0.45)', lineHeight:1.5 }}>{n.message}</div>
                    <div style={{ fontSize:10, color:'rgba(200,220,202,0.25)', marginTop:5 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

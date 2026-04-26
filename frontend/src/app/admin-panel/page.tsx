'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/lib/translations';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard, Users, Wallet, Bell, LogOut,
  Search, TrendingUp, UserCheck, AlertCircle, ChevronDown,
} from 'lucide-react';

export default function AdminPanel() {
  const { user, logout, lang, loading: authLoading } = useAuth();
  const t = (translations[lang as keyof typeof translations] || translations.fr).admin;
  const router = useRouter();

  const [tab, setTab] = useState<'stats'|'users'|'withdrawals'|'notify'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [wStatus, setWStatus] = useState('pending');
  const [notifForm, setNotifForm] = useState({ target: 'all', titleFr: '', titleEn: '', titleAr: '', msgFr: '', msgEn: '', msgAr: '' });
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !['admin','superadmin'].includes(user.role))) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && ['admin','superadmin'].includes(user.role)) {
      adminApi.stats().then(r => setStats(r.data)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'users') {
      adminApi.users({ search, page: 1 }).then(r => setUsers(r.data)).catch(console.error);
    }
    if (tab === 'withdrawals') {
      adminApi.withdrawals(wStatus).then(r => setWithdrawals(r.data)).catch(console.error);
    }
  }, [tab, search, wStatus]);

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'suspended' : 'active';
    await adminApi.setStatus(id, next);
    setUsers((u: any) => ({ ...u, users: u.users.map((m: any) => m.id === id ? { ...m, status: next } : m) }));
  };

  const updateWithdrawal = async (id: string, status: string) => {
    await adminApi.updateWithdrawal(id, { status });
    setWithdrawals((w: any) => ({ ...w, withdrawals: w.withdrawals.filter((ww: any) => ww.id !== id) }));
  };

  const sendNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await adminApi.notify({
        userId: notifForm.target,
        type: 'admin_broadcast',
        titleFr: notifForm.titleFr, titleEn: notifForm.titleEn, titleAr: notifForm.titleAr,
        msgFr: notifForm.msgFr, msgEn: notifForm.msgEn, msgAr: notifForm.msgAr,
      });
      setSentOk(true);
      setTimeout(() => setSentOk(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  if (authLoading || !user) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '2px solid rgba(212,160,23,0.2)', borderTop: '2px solid #f5c842', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const navItems = [
    { id: 'stats', icon: LayoutDashboard, label: t.stats },
    { id: 'users', icon: Users, label: t.users },
    { id: 'withdrawals', icon: Wallet, label: t.withdrawals },
    { id: 'notify', icon: Bell, label: t.notifications },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, flexShrink: 0, background: '#0d0d0d', borderRight: '1px solid rgba(212,160,23,0.1)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(212,160,23,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#d4a017,#f5c842)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Playfair Display', fontWeight: 900, fontSize: 17, color: '#0a0a0a' }}>Φ</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 15, color: '#f5c842' }}>SS1</div>
              <div style={{ fontSize: 9, color: 'rgba(232,224,208,0.3)', letterSpacing: '0.12em' }}>ADMIN PANEL</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(212,160,23,0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f5c842' }}>{user.firstName} {user.lastName}</div>
          <div style={{ fontSize: 10, color: 'rgba(232,224,208,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {user.role}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px',
                borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: tab === id ? 'rgba(212,160,23,0.12)' : 'transparent',
                color: tab === id ? '#f5c842' : 'rgba(232,224,208,0.5)',
                fontSize: 14, fontWeight: tab === id ? 600 : 400, transition: 'all 0.15s' }}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(212,160,23,0.08)' }}>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
            borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(232,224,208,0.35)', fontSize: 14 }}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, marginLeft: 240, padding: '40px', minHeight: '100vh', overflowY: 'auto' }}>

        {/* ─ Stats ─ */}
        {tab === 'stats' && (
          <div>
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: 28, fontWeight: 700, marginBottom: 32 }}>
              <span className="gradient-text">{t.title}</span>
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              {[
                { label: t.totalMembers, value: stats?.stats?.total_members || '—', icon: Users, color: '#f5c842' },
                { label: t.activeMembers, value: stats?.stats?.active_members || '—', icon: UserCheck, color: '#22c55e' },
                { label: t.totalEarnings, value: stats ? `$${parseFloat(stats.stats.total_earnings_usd).toFixed(0)}` : '—', icon: TrendingUp, color: '#d4a017' },
                { label: t.pendingWithdrawals, value: stats?.stats?.pending_withdrawals || '—', icon: AlertCircle, color: '#ef4444' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card-dark" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                    <Icon size={16} color={color} />
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: 'Playfair Display' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Growth chart */}
            {stats?.growth && (
              <div className="card-dark" style={{ padding: 28, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'rgba(232,224,208,0.8)' }}>
                  Croissance des membres (12 mois)
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(232,224,208,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(232,224,208,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#d4a017" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top earners */}
            {stats?.topEarners && (
              <div className="card-dark" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(212,160,23,0.08)', fontSize: 13, fontWeight: 600, color: 'rgba(232,224,208,0.7)' }}>
                  Top 10 Earners
                </div>
                {stats.topEarners.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', borderBottom: '1px solid rgba(212,160,23,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: i < 3 ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 3 ? '#f5c842' : 'rgba(232,224,208,0.3)' }}>
                        {i+1}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.first_name} {m.last_name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)' }}>{m.rank}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f5c842' }}>${parseFloat(m.total_earned).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─ Users ─ */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 700 }}>
                <span className="gradient-text">{t.users}</span>
              </h2>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(232,224,208,0.35)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t.search} className="input-dark"
                  style={{ paddingLeft: 36, width: 240, fontSize: 13 }} />
              </div>
            </div>

            <div className="card-dark" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(212,160,23,0.1)' }}>
                    {['Membre', 'Package', 'Rang', 'BV', 'Balance', 'Filleuls', 'Statut', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11,
                        color: 'rgba(232,224,208,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(users?.users || []).map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(212,160,23,0.04)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.first_name} {m.last_name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)' }}>{m.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(232,224,208,0.6)' }}>{m.package_name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#f5c842', fontWeight: 600 }}>{m.rank}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(232,224,208,0.6)' }}>{m.total_bv}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#d4a017' }}>${parseFloat(m.balance || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(232,224,208,0.6)' }}>{m.direct_count}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
                          background: m.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: m.status === 'active' ? '#22c55e' : '#ef4444' }}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => toggleStatus(m.id, m.status)}
                          style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(212,160,23,0.3)',
                            background: 'transparent', color: '#f5c842', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {m.status === 'active' ? t.suspend : t.activate}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(users?.users || []).length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(232,224,208,0.3)', fontSize: 14 }}>
                  {search ? 'Aucun résultat' : 'Chargement...'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─ Withdrawals ─ */}
        {tab === 'withdrawals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 700 }}>
                <span className="gradient-text">{t.withdrawals}</span>
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {['pending','approved','paid','rejected'].map(s => (
                  <button key={s} onClick={() => setWStatus(s)}
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: '1px solid', textTransform: 'capitalize', cursor: 'pointer',
                      borderColor: wStatus === s ? 'rgba(212,160,23,0.6)' : 'rgba(212,160,23,0.15)',
                      background: wStatus === s ? 'rgba(212,160,23,0.1)' : 'transparent',
                      color: wStatus === s ? '#f5c842' : 'rgba(232,224,208,0.4)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-dark" style={{ overflow: 'hidden' }}>
              {(withdrawals?.withdrawals || []).map((w: any) => (
                <div key={w.id} style={{ padding: '18px 20px', borderBottom: '1px solid rgba(212,160,23,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{w.first_name} {w.last_name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.4)' }}>{w.email} · {w.method}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.3)', marginTop: 2 }}>
                      {new Date(w.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f5c842', fontFamily: 'Playfair Display' }}>
                    ${parseFloat(w.amount_usd).toFixed(2)}
                  </div>
                  {w.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => updateWithdrawal(w.id, 'approved')} className="btn-gold" style={{ padding: '7px 14px', fontSize: 12 }}>
                        {t.approve}
                      </button>
                      <button onClick={() => updateWithdrawal(w.id, 'rejected')} className="btn-outline" style={{ padding: '7px 14px', fontSize: 12, color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}>
                        {t.reject}
                      </button>
                    </div>
                  )}
                  {w.status === 'approved' && (
                    <button onClick={() => updateWithdrawal(w.id, 'paid')} className="btn-gold" style={{ padding: '7px 16px', fontSize: 12 }}>
                      {t.markPaid}
                    </button>
                  )}
                </div>
              ))}
              {(withdrawals?.withdrawals || []).length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(232,224,208,0.3)', fontSize: 14 }}>
                  Aucun retrait {wStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─ Notify ─ */}
        {tab === 'notify' && (
          <div style={{ maxWidth: 640 }}>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
              <span className="gradient-text">{t.sendNotif}</span>
            </h2>
            <form onSubmit={sendNotif} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card-dark" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Destinataires</label>
                  <select className="input-dark" value={notifForm.target}
                    onChange={e => setNotifForm(f => ({ ...f, target: e.target.value }))}>
                    <option value="all">Tous les membres</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {(['Fr','En','Ar'] as const).map(l => (
                    <div key={l}>
                      <label style={labelStyle}>Titre ({l})</label>
                      <input className="input-dark" value={(notifForm as any)[`title${l}`]}
                        onChange={e => setNotifForm(f => ({ ...f, [`title${l}`]: e.target.value }))}
                        placeholder={`Titre en ${l === 'Fr' ? 'français' : l === 'En' ? 'anglais' : 'arabe'}`} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {(['Fr','En','Ar'] as const).map(l => (
                    <div key={l}>
                      <label style={labelStyle}>Message ({l})</label>
                      <textarea className="input-dark" rows={3} value={(notifForm as any)[`msg${l}`]}
                        onChange={e => setNotifForm(f => ({ ...f, [`msg${l}`]: e.target.value }))}
                        style={{ resize: 'vertical' }}
                        placeholder={`Message en ${l === 'Fr' ? 'français' : l === 'En' ? 'anglais' : 'arabe'}`} />
                    </div>
                  ))}
                </div>
              </div>
              {sentOk && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#86efac' }}>
                  ✓ Notification envoyée avec succès !
                </div>
              )}
              <button type="submit" disabled={sending} className="btn-gold" style={{ padding: '14px', fontSize: 15 }}>
                {sending ? 'Envoi...' : t.sendNotif}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'rgba(232,224,208,0.5)', marginBottom: 6,
  display: 'block', letterSpacing: '0.08em', textTransform: 'uppercase',
};

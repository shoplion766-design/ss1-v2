'use client';
import { Suspense, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/lib/translations';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

const PACKAGES = [
  { id: 'invest', name: 'INVEST', price: 200, fcfa: '120 000', desc: 'Package d\'entrée — 200 BV' },
  { id: 'king', name: 'KING', price: 1760, fcfa: '1 056 000', desc: 'Package premium — 1760 BV', popular: true },
  { id: 'stockist', name: 'STOCKIST', price: 4650, fcfa: '2 790 000', desc: 'Promo stockiste — 4650 BV' },
  { id: 'ambassador', name: 'AMBASSADOR', price: 7700, fcfa: '4 620 000', desc: 'Ambassadeur — 7700 BV' },
];

const COUNTRIES = ['Côte d\'Ivoire','Sénégal','Mali','Burkina Faso','Guinée','Cameroun','Togo','Bénin',
  'Niger','Mauritanie','Congo','Gabon','France','Belgique','Maroc','Algérie','Tunisie','Autre'];

function RegisterContent() {
  const { register, lang } = useAuth();
  const t = (translations[lang as keyof typeof translations] || translations.fr).auth;
  const isRtl = lang === 'ar';
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', country: '', referralCode: params.get('ref') || '',
    packageId: params.get('package') || 'invest',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true); setError('');
    try {
      await register({ ...form, language: lang });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,160,23,0.07) 0%, transparent 60%), #0a0a0a',
      padding: '24px',
    }}>
      <div style={{ position: 'fixed', top: 24, left: 24 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 7,
            background: 'linear-gradient(135deg, #d4a017, #f5c842)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Playfair Display', fontWeight: 900, fontSize: 16, color: '#0a0a0a' }}>Φ</div>
          <span style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 15, color: '#f5c842' }}>SS1</span>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: step === 2 ? 700 : 460 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step >= s ? 'linear-gradient(135deg,#d4a017,#f5c842)' : 'rgba(255,255,255,0.05)',
                border: step >= s ? 'none' : '1px solid rgba(212,160,23,0.2)',
                color: step >= s ? '#0a0a0a' : 'rgba(232,224,208,0.3)', fontSize: 12, fontWeight: 700 }}>
                {step > s ? <CheckCircle size={14} /> : s}
              </div>
              <span style={{ fontSize: 12, color: step >= s ? '#f5c842' : 'rgba(232,224,208,0.3)' }}>
                {s === 1 ? 'Informations' : 'Package'}
              </span>
              {s < 2 && <div style={{ width: 40, height: 1, background: step > 1 ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(212,160,23,0.2)', padding: 40, boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              <span className="gradient-text">{t.register}</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(232,224,208,0.4)' }}>
              {t.haveAccount}{' '}
              <Link href="/auth/login" style={{ color: '#f5c842', textDecoration: 'none', fontWeight: 500 }}>{t.login}</Link>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#fca5a5', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t.firstName}</label>
                    <input className="input-dark" value={form.firstName} onChange={set('firstName')} required placeholder="Jean" />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.lastName}</label>
                    <input className="input-dark" value={form.lastName} onChange={set('lastName')} required placeholder="Dupont" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t.email}</label>
                  <input type="email" className="input-dark" value={form.email} onChange={set('email')} required placeholder="jean@email.com" />
                </div>
                <div>
                  <label style={labelStyle}>{t.password}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} className="input-dark" value={form.password}
                      onChange={set('password')} required minLength={8} placeholder="Min. 8 caractères" style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,224,208,0.4)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t.phone}</label>
                    <input className="input-dark" value={form.phone} onChange={set('phone')} placeholder="+225 07..." />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.country}</label>
                    <select className="input-dark" value={form.country} onChange={set('country')}
                      style={{ appearance: 'none', cursor: 'pointer' }}>
                      <option value="">— Sélectionner —</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t.referral}</label>
                  <input className="input-dark" value={form.referralCode} onChange={set('referralCode')} placeholder={t.referralPlaceholder} />
                </div>
                <button type="submit" className="btn-gold" style={{ marginTop: 8, fontSize: 15, padding: '14px' }}>
                  Continuer →
                </button>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={{ color: 'rgba(232,224,208,0.55)', fontSize: 14, textAlign: 'center' }}>
                  Choisissez le package qui correspond à vos ambitions
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  {PACKAGES.map(pkg => (
                    <div key={pkg.id} onClick={() => setForm(f => ({ ...f, packageId: pkg.id }))}
                      style={{ cursor: 'pointer', borderRadius: 12, padding: '18px 16px',
                        border: form.packageId === pkg.id ? '1px solid rgba(212,160,23,0.7)' : '1px solid rgba(212,160,23,0.12)',
                        background: form.packageId === pkg.id ? 'rgba(212,160,23,0.08)' : '#1a1a1a',
                        position: 'relative', transition: 'all 0.2s', boxShadow: form.packageId === pkg.id ? '0 0 20px rgba(212,160,23,0.1)' : 'none' }}>
                      {pkg.popular && (
                        <div style={{ position: 'absolute', top: -8, right: 12, background: 'linear-gradient(135deg,#d4a017,#f5c842)',
                          color: '#0a0a0a', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                          ★ POPULAIRE
                        </div>
                      )}
                      {form.packageId === pkg.id && (
                        <div style={{ position: 'absolute', top: 10, right: 10 }}>
                          <CheckCircle size={16} color="#f5c842" />
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: form.packageId === pkg.id ? '#f5c842' : '#e8e0d0' }}>
                        {pkg.name}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#f5c842', lineHeight: 1.2 }}>${pkg.price.toLocaleString("en-US")}</div>
                      <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.4)', marginTop: 2 }}>≈ {pkg.fcfa} FCFA</div>
                      <div style={{ fontSize: 11, color: 'rgba(232,224,208,0.35)', marginTop: 6 }}>{pkg.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" onClick={() => setStep(1)} className="btn-outline" style={{ flex: 1, padding: '13px' }}>
                    ← Retour
                  </button>
                  <button type="submit" disabled={loading} className="btn-gold"
                    style={{ flex: 2, padding: '13px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {t.registerBtn}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense 
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
          <div style={{ color: '#f5c842' }}>Chargement...</div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'rgba(232,224,208,0.5)', marginBottom: 6,
  display: 'block', letterSpacing: '0.08em', textTransform: 'uppercase',
};

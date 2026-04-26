'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/lib/translations';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, lang } = useAuth();
  const t = (translations[lang as keyof typeof translations] || translations.fr).auth;
  const isRtl = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erreur de connexion');
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
      {/* Logo */}
      <div style={{ position: 'fixed', top: 24, left: 24 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 7,
            background: 'linear-gradient(135deg, #d4a017, #f5c842)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Playfair Display', fontWeight: 900, fontSize: 16, color: '#0a0a0a' }}>Φ</div>
          <span style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 15, color: '#f5c842' }}>SS1</span>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Card */}
        <div style={{
          background: '#111', borderRadius: 20,
          border: '1px solid rgba(212,160,23,0.2)',
          padding: 40, boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              <span className="gradient-text">{t.login}</span>
            </div>
            <div style={{ fontSize: 14, color: 'rgba(232,224,208,0.45)' }}>
              {t.noAccount}{' '}
              <Link href="/auth/register" style={{ color: '#f5c842', textDecoration: 'none', fontWeight: 500 }}>
                {t.register}
              </Link>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#fca5a5', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)', marginBottom: 6, display: 'block', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t.email}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-dark" placeholder="votre@email.com" required />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: 'rgba(232,224,208,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {t.password}
                </label>
                <Link href="/auth/forgot" style={{ fontSize: 12, color: 'rgba(212,160,23,0.7)', textDecoration: 'none' }}>
                  {t.forgotPassword}
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-dark" placeholder="••••••••" required
                  style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,224,208,0.4)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold"
              style={{ marginTop: 8, fontSize: 15, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {t.loginBtn}
            </button>
          </form>
        </div>

        {/* Decorative */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(232,224,208,0.2)' }}>
          © 2024 ss1
        </div>
      </div>
    </div>
  );
}

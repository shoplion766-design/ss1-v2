'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../lib/translations';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦' },
];

export default function Navbar() {
  const { user, logout, lang, setLang } = useAuth();
  const t = translations[lang as keyof typeof translations] || translations.en;
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const isRtl = lang === 'ar';

  const links = [
    { href: '/',          label: t.nav.home },
    { href: '/#products', label: t.nav.products },
    { href: '/#plan',     label: t.nav.plan },
    { href: '/#packages', label: t.nav.join },
  ];

  return (
    <nav dir={isRtl ? 'rtl' : 'ltr'} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(5,14,8,0.88)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--forest-border)',
    }}>
      <div className="max-w-7xl mx-auto px-4 py-3.5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/ss1-logo.jpg" alt="SS1"
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid rgba(201,150,26,0.45)',
              boxShadow: '0 0 14px rgba(45,138,70,0.25)' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 17, color: 'var(--gold-light)', lineHeight: 1.05, letterSpacing: '0.04em' }}>SS1</div>
            <div style={{ fontSize: 8.5, color: 'var(--text-faint)', letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1 }}>Support Système One</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden md:flex">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}
              style={{ color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-light)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="hidden md:flex">
          {/* Lang switcher */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setLangOpen(l => !l)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7,
                border: '1px solid var(--forest-border)', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
              <Globe size={13} />
              <span>{LANGS.find(l => l.code === lang)?.flag}</span>
              <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{lang}</span>
              <ChevronDown size={11} />
            </button>
            {langOpen && (
              <div style={{ position: 'absolute', top: '110%', right: 0, minWidth: 150,
                background: 'var(--forest-mid)', border: '1px solid var(--forest-border)',
                borderRadius: 10, overflow: 'hidden', zIndex: 200,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
                      background: lang === l.code ? 'rgba(201,150,26,0.1)' : 'transparent',
                      color: lang === l.code ? 'var(--gold-light)' : 'var(--text-muted)',
                      border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>
                    <span>{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href={['admin','superadmin'].includes(user.role) ? '/admin-panel' : '/dashboard'}
                className="btn-outline" style={{ padding: '7px 16px', fontSize: 13 }}>
                {t.nav.dashboard}
              </Link>
              <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 12 }}>
                {t.dashboard.logout}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/auth/login" style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>{t.nav.login}</Link>
              <Link href="/auth/register" className="btn-gold" style={{ padding: '8px 18px', fontSize: 13 }}>{t.nav.join}</Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)} style={{ color: 'var(--gold-light)', background: 'none', border: 'none', cursor: 'pointer' }} className="md:hidden">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: 'var(--forest-mid)', borderTop: '1px solid var(--forest-border)', padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {links.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>{label}</Link>
            ))}
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                  style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11,
                    background: lang === l.code ? 'rgba(201,150,26,0.15)' : 'transparent',
                    color: lang === l.code ? 'var(--gold-light)' : 'var(--text-muted)',
                    border: '1px solid var(--forest-border)', cursor: 'pointer', fontWeight: 600 }}>
                  {l.flag} {l.code.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="divider-green" />
            {user ? (
              <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-gold" style={{ textAlign: 'center' }}>{t.nav.dashboard}</Link>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setOpen(false)} className="btn-outline" style={{ textAlign: 'center' }}>{t.nav.login}</Link>
                <Link href="/auth/register" onClick={() => setOpen(false)} className="btn-gold" style={{ textAlign: 'center' }}>{t.nav.join}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

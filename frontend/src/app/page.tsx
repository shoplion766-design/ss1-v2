'use client';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../lib/translations';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import {
  CheckCircle, TrendingUp, Users, Globe, Award, Zap, Shield, Leaf,
  ShoppingBag, Gift, Star, Coins, ArrowRight, Package
} from 'lucide-react';

const G = 'var(--gold)';
const GL = 'var(--gold-light)';
const FD = 'var(--forest-deep)';
const FM = 'var(--forest-mid)';
const FB = 'var(--forest-border)';

const ICONS = [Shield, Leaf, Users, Globe, Award, Zap];

const PACKAGES = [
  {
    slug: 'invest', name: 'INVEST', price: 200, fcfa: '120 000', bv: 200,
    color: '#2d8a46', bogo: false,
    features: ['Retail Bonus', 'Direct Sponsorship', 'Upgrade Bonus', 'Matching Bonus', 'Personal Purchase 15%'],
  },
  {
    slug: 'king', name: 'KING', price: 1760, fcfa: '1 056 000', bv: 1760,
    color: '#c9961a', popular: true, bogo: false,
    features: ['All INVEST benefits', 'SS1-Cycle Bonus', 'SEAT KIT', 'SEAT Product', 'SEAT Stockist', 'Pool Bonus (3%)', 'SEAT Cosmetic'],
  },
  {
    slug: 'stockist', name: 'STOCKIST', price: 4650, fcfa: '2 790 000', bv: 4650,
    color: '#9333ea', bogo: true,
    features: ['All KING benefits', 'Legal representative (locality)', '6% on local purchases', 'Voucher redistribution', 'SEAT STOCKIST bonus'],
  },
  {
    slug: 'ambassador', name: 'AMBASSADOR', price: 7700, fcfa: '4 620 000', bv: 7700,
    color: '#dc2626', bogo: true,
    features: ['All STOCKIST benefits', 'Hall of Fame eligible', 'All award categories', 'Buy One Get One eligible', 'Priority support'],
  },
];

const PRODUCTS = [
  { name: 'GLUCO-GUARD', tagline: 'Glycemic Balance', ingredients: 'Berberine, Cinnamon, Chromium, Alpha-Lipoic Acid, Zinc', color: '#7c3aed', accent: '#a855f7', image: '/product-gluco-guard.jpg' },
  { name: 'PROSTA-CARE', tagline: 'Prostate Support', ingredients: 'Saw Palmetto, Nettle, Zinc, Selenium, Lycopene', color: '#1d4ed8', accent: '#3b82f6', image: '/product-prosta-care.jpg' },
  { name: 'RENAL-RESTORE', tagline: 'Kidney & Detox', ingredients: 'Cranberry, Dandelion, Nettle, Magnesium', color: '#92400e', accent: '#c9961a', image: '/product-renal-restore.jpg' },
  { name: 'CELL-SHIELD', tagline: 'Immune Defense', ingredients: 'Saw Palmetto, Nettle, Zinc, Selenium', color: '#374151', accent: '#9ca3af', image: '/product-cell-shield.jpg' },
];

const BG = `linear-gradient(180deg, var(--forest-deep) 0%, #061410 100%)`;

export default function HomePage() {
  const { lang } = useAuth();
  const t = translations[lang as keyof typeof translations] || translations.en;
  const isRtl = lang === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: BG }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="leaf-bg" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        paddingTop: 88, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '15%', right: '8%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(45,138,70,0.07) 0%, transparent 65%)',
          borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '8%', left: '3%', width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(201,150,26,0.05) 0%, transparent 60%)',
          borderRadius: '50%', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-4 w-full">
          <div style={{ maxWidth: 720 }}>
            <div className="badge-green animate-fade-up" style={{ marginBottom: 28 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5cc87a', animation: 'pulse-gold 2s infinite' }} />
              {t.hero.badge}
            </div>

            <h1 className="animate-fade-up stagger-1" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 6.5vw, 5.2rem)',
              fontWeight: 900, lineHeight: 1.06, marginBottom: 24, whiteSpace: 'pre-line',
            }}>
              <span className="gradient-text">{t.hero.title}</span>
            </h1>

            <p className="animate-fade-up stagger-2" style={{
              fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.75,
              maxWidth: 580, marginBottom: 44,
            }}>{t.hero.subtitle}</p>

            <div className="animate-fade-up stagger-3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/auth/register" className="btn-gold" style={{ fontSize: 16, padding: '14px 34px' }}>
                {t.hero.cta} <ArrowRight size={16} />
              </Link>
              <a href="#products" className="btn-outline-green" style={{ fontSize: 16, padding: '14px 34px' }}>
                {t.hero.cta2}
              </a>
            </div>

            {/* Stats */}
            <div className="animate-fade-up stagger-4" style={{ display: 'flex', gap: 48, marginTop: 64, flexWrap: 'wrap' }}>
              {[
                { value: '12K+', label: t.hero.stat1, color: '#5cc87a' },
                { value: '18', label: t.hero.stat2, color: GL },
                { value: '$2M+', label: t.hero.stat3, color: '#5cc87a' },
              ].map(({ value, label, color }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BOGO BANNER ────────────────────────────────── */}
      <section style={{ padding: '0 0 0', position: 'relative' }}>
        <div style={{
          margin: '0 auto', maxWidth: 1200, padding: '0 16px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(45,138,70,0.12) 0%, rgba(201,150,26,0.12) 50%, rgba(45,138,70,0.08) 100%)',
            border: '1px solid rgba(201,150,26,0.3)',
            borderRadius: 20, padding: '36px 48px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 24,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* BG decoration */}
            <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200,
              background: 'radial-gradient(circle, rgba(201,150,26,0.08) 0%, transparent 70%)',
              borderRadius: '50%', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(201,150,26,0.2), rgba(45,138,70,0.15))',
                border: '1px solid rgba(201,150,26,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Gift size={28} color={GL} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: GL }}>
                    🎁 Buy One, Get One Free
                  </h3>
                  <span className="badge-gold" style={{ fontSize: 10 }}>STOCKIST & AMBASSADOR</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 520 }}>
                  {t.bogo.desc}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f87171' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                {t.bogo.exclude1}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f87171' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                {t.bogo.exclude2}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f87171' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                {t.bogo.exclude3}
              </div>
              <Link href="/auth/register?package=stockist" className="btn-gold" style={{ marginTop: 4, padding: '10px 24px', fontSize: 13 }}>
                {t.bogo.cta} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY SS1 ─────────────────────────────────────── */}
      <section id="why" style={{ padding: '100px 0', borderTop: '1px solid var(--forest-border)', marginTop: 60 }}>
        <div className="max-w-7xl mx-auto px-4">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 14 }}>
              <span className="gradient-text">{t.why.title}</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>{t.why.subtitle}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }}>
            {t.why.items.map(({ title, desc }: any, i: number) => {
              const Icon = ICONS[i];
              return (
                <div key={title} className="card-dark" style={{ padding: 26 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(45,138,70,0.15), rgba(201,150,26,0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                    border: '1px solid rgba(45,138,70,0.25)' }}>
                    <Icon size={20} color="#4caf6b" />
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 7, fontSize: 15 }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65 }}>{desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BOUTIQUE ──────────────────────────────────── */}
      <section id="products" style={{ padding: '100px 0', background: 'rgba(5,14,8,0.5)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div className="badge-green" style={{ marginBottom: 16, display: 'inline-flex' }}>
              <ShoppingBag size={12} /> SS1 Boutique
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 14 }}>
              <span className="gradient-text">{t.products.title}</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>{t.products.subtitle}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 26 }}>
            {t.products.items.map((product: any) => (
              <div key={product.name} style={{
                background: 'var(--forest-dark)',
                borderRadius: 18, border: `1px solid ${product.color}28`,
                overflow: 'hidden', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 50px ${product.color}20`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ height: 230, overflow: 'hidden', position: 'relative' }}>
                  <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12, background: `${product.color}cc`, backdropFilter: 'blur(8px)', borderRadius: 100, padding: '4px 12px', fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{product.badge}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'linear-gradient(to top, var(--forest-dark), transparent)' }} />
                </div>
                <div style={{ padding: '22px 22px 26px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: product.accent, marginBottom: 3 }}>{product.name}</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{product.tagline}</p>
                  <div style={{ height: 1, background: `linear-gradient(to right, ${product.color}35, transparent)`, marginBottom: 14 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 14 }}>{product.description}</p>
                  <div style={{ background: `${product.color}0e`, border: `1px solid ${product.color}22`, borderRadius: 9, padding: '9px 13px', marginBottom: 18 }}>
                    <div style={{ fontSize: 10, color: product.accent, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{t.products.ingredients}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{product.ingredients}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{t.products.capsules}</div>
                      <div style={{ fontSize: 10, color: product.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.products.naturalFormula}</div>
                    </div>
                    <Link href="/auth/register" style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: `linear-gradient(135deg, ${product.color}, ${product.accent})`,
                      color: '#fff', textDecoration: 'none',
                    }}>{t.products.orderNow} →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PACKAGE LEVELS ──────────────────────────────── */}
      <section id="packages" style={{ padding: '100px 0' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="badge-gold" style={{ marginBottom: 16, display: 'inline-flex' }}>
              <Package size={12} /> {t.packages.levels}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 14 }}>
              <span className="gradient-text">{t.packages.title}</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>{t.packages.subtitle}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 22 }}>
            {PACKAGES.map((pkg) => (
              <div key={pkg.name} style={{
                background: 'var(--forest-dark)', borderRadius: 18, padding: 30,
                border: pkg.popular ? `1px solid rgba(201,150,26,0.55)` : '1px solid var(--forest-border)',
                position: 'relative',
                boxShadow: pkg.popular ? '0 0 40px rgba(201,150,26,0.10)' : 'none',
              }}>
                {pkg.popular && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #a07810, #c9961a, #e8b830)',
                    color: '#050e08', fontSize: 10, fontWeight: 800, padding: '4px 16px',
                    borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: '0.08em' }}>
                    ★ {t.packages.popular}
                  </div>
                )}
                {pkg.bogo && (
                  <div style={{ position: 'absolute', top: 14, right: 14,
                    background: 'rgba(45,138,70,0.15)', border: '1px solid rgba(45,138,70,0.3)',
                    color: '#5cc87a', fontSize: 9, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 6, letterSpacing: '0.06em' }}>
                    🎁 BOGO
                  </div>
                )}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: pkg.color, marginBottom: 14, boxShadow: `0 0 14px ${pkg.color}` }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, marginBottom: 4 }}>{pkg.name}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: GL, marginBottom: 3 }}>${pkg.price.toLocaleString('en-US')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 6 }}>≈ {pkg.fcfa} FCFA</div>
                <div style={{ fontSize: 12, color: 'rgba(201,150,26,0.7)', marginBottom: 22 }}>{pkg.bv} BV Points</div>
                <div className="divider-gold" style={{ margin: '0 0 20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
                  {pkg.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      <CheckCircle size={13} color="#4caf6b" style={{ flexShrink: 0 }} /> {f}
                    </div>
                  ))}
                </div>
                <Link href={`/auth/register?package=${pkg.slug}`}
                  style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    background: pkg.popular ? 'linear-gradient(135deg, #a07810, #c9961a, #e8b830)' : 'transparent',
                    color: pkg.popular ? '#050e08' : GL,
                    border: pkg.popular ? 'none' : '1px solid rgba(201,150,26,0.35)',
                    textDecoration: 'none' }}>
                  {t.packages.join}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STOCKIST SPOTLIGHT ──────────────────────────── */}
      <section style={{ padding: '80px 0', background: 'rgba(5,14,8,0.4)', borderTop: '1px solid var(--forest-border)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {/* Stockist card */}
            <div className="card-dark" style={{ padding: 32 }}>
              <div className="badge-green" style={{ marginBottom: 16, display: 'inline-flex' }}>
                <Star size={11} /> {t.stockist.badge}
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
                <span className="gradient-text">{t.stockist.title}</span>
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>{t.stockist.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.stockist.perks.map((p: string) => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    <CheckCircle size={13} color="#4caf6b" /> {p}
                  </div>
                ))}
              </div>
            </div>
            {/* 2% retention card */}
            <div className="card-dark" style={{ padding: 32 }}>
              <div className="badge-gold" style={{ marginBottom: 16, display: 'inline-flex' }}>
                <Shield size={11} /> {t.retention.badge}
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
                <span className="gradient-text">{t.retention.title}</span>
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>{t.retention.desc}</p>
              <div style={{ background: 'rgba(201,150,26,0.06)', border: '1px solid rgba(201,150,26,0.2)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: GL, fontFamily: 'var(--font-display)' }}>2%</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.retention.sub}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMP PLAN ────────────────────────────────────── */}
      <section id="plan" style={{ padding: '100px 0' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 14 }}>
              <span className="gradient-text">{t.comp.title}</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>{t.comp.subtitle}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
            {t.comp.levels.map((level: any, i: number) => (
              <div key={i} className="card-dark" style={{ padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(45,138,70,0.2), rgba(201,150,26,0.1))',
                  border: '1px solid rgba(45,138,70,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 11, color: '#5cc87a',
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{level.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>{level.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--forest-border)' }}>
        <div className="max-w-7xl mx-auto px-4" style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, marginBottom: 16 }}>
            <span className="gradient-text">{t.cta.title}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>{t.cta.subtitle}</p>
          <Link href="/auth/register" className="btn-gold" style={{ fontSize: 17, padding: '15px 48px', display: 'inline-flex' }}>
            {t.hero.cta} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--forest-border)', padding: '44px 0', background: 'var(--forest-deep)' }}>
        <div className="max-w-7xl mx-auto px-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ss1-logo.jpg" alt="SS1" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(201,150,26,0.35)' }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: GL, lineHeight: 1.1 }}>SS1</div>
              <div style={{ fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Support Système One</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t.footer.rights}</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {t.footer.links.map((l: string) => (
              <span key={l} style={{ fontSize: 12, color: 'var(--text-faint)', cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

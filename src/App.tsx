import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ADMIN_ROLES,
  DEFAULT_BRAND_CONFIG,
  DEFAULT_LEGAL_CONFIG,
  applyBrandTheme,
  mergeBrandConfig,
} from './config/brand.ts';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { AuthView } from './components/AuthView.tsx';
import { BrandLogo } from './components/BrandLogo.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { ConsumerAreaView } from './components/ConsumerAreaView.tsx';
import { LegalAndAboutModal } from './components/LegalAndAboutModal.tsx';
import { PartnerPortalView } from './components/PartnerPortalView.tsx';
import { PlansView } from './components/PlansView.tsx';
import { PublicHomeView } from './components/PublicHomeView.tsx';
import { apiRequest } from './lib/api.ts';
import type {
  AuthUser,
  BrandConfig,
  Campaign,
  Category,
  Company,
  InstitutionalBootstrap,
  LegalConfig,
  Offer,
} from './types.ts';

type ActiveRoute = 'home' | 'catalog' | 'plans' | 'auth' | 'consumer' | 'partner' | 'admin';

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>('home');
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'recovery' | 'admin'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG);
  const [legal, setLegal] = useState<LegalConfig>(DEFAULT_LEGAL_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredCompanies, setFeaturedCompanies] = useState<Company[]>([]);
  const [featuredOffers, setFeaturedOffers] = useState<Offer[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const [catalogCategoryId, setCatalogCategoryId] = useState<number | undefined>(undefined);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [offerModal, setOfferModal] = useState<Offer | null>(null);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'about' | null>(null);

  async function loadBootstrap() {
    try {
      const data = await apiRequest<InstitutionalBootstrap>('/api/public/bootstrap');
      setBrand(mergeBrandConfig(data.brand));
      setLegal(data.legal);
      setCategories(data.categories);
      setFeaturedCompanies(data.featuredCompanies);
      setFeaturedOffers(data.featuredOffers);
      setActiveCampaigns(data.activeCampaigns);
    } catch {
      // Fallback to static defaults if network fails
    }
  }

  async function loadSession() {
    try {
      const me = await apiRequest<{ user: AuthUser | null }>('/api/auth/me');
      setUser(me.user);
      if (me.user) {
        const ov = await apiRequest<{ favorites: Company[] }>('/api/consumer/overview').catch(
          () => ({ favorites: [] }),
        );
        setFavoriteIds(ov.favorites.map((f) => f.id));
      }
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    loadBootstrap();
    loadSession();
  }, []);

  useEffect(() => {
    applyBrandTheme(brand);
  }, [brand]);

  async function handleLogout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setFavoriteIds([]);
    setRoute('home');
    setMobileMenuOpen(false);
  }

  async function handleToggleFavorite(companyId: number) {
    if (!user) {
      setAuthTab('login');
      setRoute('auth');
      return;
    }
    const res = await apiRequest<{ favorited: boolean }>(`/api/consumer/favorites/${companyId}`, {
      method: 'POST',
    });
    setFavoriteIds((prev) =>
      res.favorited ? [...new Set([...prev, companyId])] : prev.filter((id) => id !== companyId),
    );
  }

  function handleAuthSuccess(loggedUser: AuthUser) {
    setUser(loggedUser);
    loadSession();
    if (ADMIN_ROLES.includes(loggedUser.role)) {
      setRoute('admin');
    } else if (loggedUser.role === 'partner_company') {
      setRoute('partner');
    } else {
      setRoute('consumer');
    }
  }

  function navigateToCatalog(categoryId?: number) {
    setCatalogCategoryId(categoryId);
    setSelectedCompanyId(null);
    setRoute('catalog');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateToCompany(companyId: number) {
    setSelectedCompanyId(companyId);
    setRoute('catalog');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateToPlans() {
    setSelectedCompanyId(null);
    setRoute('plans');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role));
  const isPartner = Boolean(user && (user.role === 'partner_company' || isAdmin));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar — 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setSelectedCompanyId(null);
              setRoute('home');
            }}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BrandLogo brand={brand} variant="compact" />
            <span className="font-display text-base font-bold tracking-tight text-brand-primary whitespace-nowrap shrink-0">
              {brand.shortClubName}
            </span>
          </button>

          {/* Zone 2: 4-5 Concise Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setSelectedCompanyId(null);
                setRoute('home');
              }}
              className={`hover:text-brand-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'home' ? 'text-brand-primary font-semibold' : ''
              }`}
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => navigateToCatalog(undefined)}
              className={`hover:text-brand-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'catalog' ? 'text-brand-primary font-semibold' : ''
              }`}
            >
              Benefícios
            </button>
            <button
              type="button"
              onClick={navigateToPlans}
              className={`hover:text-brand-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'plans' ? 'text-brand-primary font-semibold' : ''
              }`}
            >
              Planos
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setRoute('consumer')}
                className={`hover:text-brand-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  route === 'consumer' ? 'text-brand-primary font-semibold' : ''
                }`}
              >
                Minha Área
              </button>
            )}
            {isPartner && (
              <button
                type="button"
                onClick={() => setRoute('partner')}
                className={`hover:text-brand-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  route === 'partner' ? 'text-brand-primary font-semibold' : ''
                }`}
              >
                Parceiro
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setRoute('admin')}
                className={`hover:text-brand-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  route === 'admin' ? 'text-brand-primary font-semibold' : ''
                }`}
              >
                Administração
              </button>
            )}
            {!user && (
              <button
                type="button"
                onClick={() => setLegalModal('about')}
                className="hover:text-brand-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sobre
              </button>
            )}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setRoute('auth');
                }}
                className="hidden md:inline-flex px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Acessar Clube
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setRoute('home');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 font-medium text-slate-800"
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => navigateToCatalog(undefined)}
              className="block w-full text-left py-2 font-medium text-slate-800"
            >
              Benefícios
            </button>
            <button
              type="button"
              onClick={navigateToPlans}
              className="block w-full text-left py-2 font-medium text-slate-800"
            >
              Planos
            </button>
            {user && (
              <button
                type="button"
                onClick={() => {
                  setRoute('consumer');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-2 font-medium text-slate-800"
              >
                Minha Área
              </button>
            )}
            {isPartner && (
              <button
                type="button"
                onClick={() => {
                  setRoute('partner');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-2 font-medium text-slate-800"
              >
                Painel Parceiro
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setRoute('admin');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-2 font-medium text-slate-800"
              >
                Administração
              </button>
            )}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full text-left py-2 font-semibold text-rose-700"
              >
                Sair da conta
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setRoute('auth');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-center py-2.5 font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg"
              >
                Acessar Clube
              </button>
            )}
          </div>
        )}
      </header>

      {/* Non-intrusive Institutional Demo Disclaimer Strip */}
      {brand.demoBannerEnabled && (
        <div className="bg-amber-50 border-b border-amber-200/80 text-amber-950 text-xs px-4 py-2 text-center">
          Ambiente institucional de apresentação ({brand.institutionAcronym} / {brand.techPartnerName}
          ): estabelecimentos e ofertas sinalizados como <strong>Demonstrativo</strong> são
          exemplos ilustrativos para avaliação da diretoria.
        </div>
      )}

      {/* Main Route Viewport */}
      <div className="flex-1">
        {route === 'home' && (
          <PublicHomeView
            brand={brand}
            legal={legal}
            categories={categories}
            featuredCompanies={featuredCompanies}
            featuredOffers={featuredOffers}
            activeCampaigns={activeCampaigns}
            user={user}
            onNavigateCatalog={navigateToCatalog}
            onNavigateCompany={navigateToCompany}
            onNavigateAuth={(t = 'login') => {
              setAuthTab(t);
              setRoute('auth');
            }}
            onOpenOffer={(offer) => {
              setOfferModal(offer);
              setRoute('catalog');
            }}
            onOpenLegalModal={setLegalModal}
          />
        )}

        {route === 'catalog' && (
          <CatalogView
            categories={categories}
            companies={featuredCompanies}
            initialCategoryId={catalogCategoryId}
            selectedCompanyId={selectedCompanyId}
            user={user}
            favoriteCompanyIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectCompany={setSelectedCompanyId}
            onRequireAuth={() => {
              setOfferModal(null);
              setAuthTab('login');
              setRoute('auth');
            }}
            onCouponIssued={() => {
              // Refresh bootstrap counts quietly if needed
            }}
            selectedOfferModal={offerModal}
            onChangeOfferModal={setOfferModal}
          />
        )}

        {route === 'plans' && (
          <PlansView
            brand={brand}
            user={user}
            onNavigateCatalog={() => navigateToCatalog(undefined)}
            onNavigateAuth={(t = 'login') => {
              setAuthTab(t);
              setRoute('auth');
            }}
            onOpenLegalModal={setLegalModal}
          />
        )}

        {route === 'auth' && (
          <AuthView
            brand={brand}
            categories={categories}
            initialTab={authTab}
            onAuthSuccess={handleAuthSuccess}
            onOpenLegalModal={(mode) => setLegalModal(mode)}
          />
        )}

        {route === 'consumer' && user && (
          <ConsumerAreaView
            user={user}
            brand={brand}
            legal={legal}
            recommendedOffers={featuredOffers}
            allApprovedCompanies={featuredCompanies}
            onUserUpdated={setUser}
            onNavigateCatalog={() => navigateToCatalog(undefined)}
            onSelectCompany={navigateToCompany}
            onOpenOffer={(offer) => {
              setOfferModal(offer);
              setRoute('catalog');
            }}
            onOpenLegalModal={setLegalModal}
          />
        )}

        {route === 'partner' && isPartner && <PartnerPortalView categories={categories} />}

        {route === 'admin' && isAdmin && user && (
          <AdminDashboardView currentUser={user} brand={brand} onSettingsUpdated={loadBootstrap} />
        )}
      </div>

      <LegalAndAboutModal
        mode={legalModal}
        brand={brand}
        legal={legal}
        onClose={() => setLegalModal(null)}
      />
    </div>
  );
}

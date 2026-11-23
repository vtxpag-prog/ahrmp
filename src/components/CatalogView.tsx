import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Phone,
  QrCode,
  Search,
  Store,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { COMMERCIAL_TIER_LABELS } from '../config/brand.ts';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_FEATURED_COMPANIES,
  DEFAULT_FEATURED_OFFERS,
  filterFallbackOffers,
} from '../config/catalogFallback.ts';
import { apiRequest } from '../lib/api.ts';
import type { AuthUser, Category, Company, Coupon, Offer } from '../types.ts';
import { BrandImage } from './BrandImage.tsx';
import { QrCodeDisplay } from './QrCodeDisplay.tsx';

interface CatalogViewProps {
  categories: Category[];
  companies: Company[];
  fallbackOffers?: Offer[];
  initialCategoryId?: number;
  selectedCompanyId?: number | null;
  user: AuthUser | null;
  favoriteCompanyIds: number[];
  onToggleFavorite: (companyId: number) => void;
  onSelectCompany: (companyId: number | null) => void;
  onRequireAuth: () => void;
  onCouponIssued: (coupon: Coupon) => void;
  selectedOfferModal: Offer | null;
  onChangeOfferModal: (offer: Offer | null) => void;
}

export function CatalogView({
  categories,
  companies,
  fallbackOffers = DEFAULT_FEATURED_OFFERS,
  initialCategoryId,
  selectedCompanyId,
  user,
  favoriteCompanyIds,
  onToggleFavorite,
  onSelectCompany,
  onRequireAuth,
  onCouponIssued,
  selectedOfferModal,
  onChangeOfferModal,
}: CatalogViewProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number>(initialCategoryId || 0);
  const [subcategory, setSubcategory] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<'recent' | 'most_used'>('recent');

  // Company profile state
  const [companyDetail, setCompanyDetail] = useState<{
    company: Company;
    offers: Offer[];
  } | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  // Coupon issuance state
  const [issuingCoupon, setIssuingCoupon] = useState(false);
  const [issuedCoupon, setIssuedCoupon] = useState<Coupon | null>(null);
  const [issueError, setIssueError] = useState('');

  useEffect(() => {
    setCategoryId(initialCategoryId || 0);
    setSubcategory('');
  }, [initialCategoryId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (categoryId > 0) params.set('categoryId', String(categoryId));
    if (subcategory.trim()) params.set('subcategory', subcategory.trim());
    if (neighborhood.trim()) params.set('neighborhood', neighborhood.trim());
    if (featuredOnly) params.set('featuredOnly', 'true');
    params.set('sort', sort);

    apiRequest<{ offers: Offer[] }>(`/api/catalog/offers?${params.toString()}`)
      .then((res) => {
        if (active) {
          setOffers(Array.isArray(res.offers) ? res.offers : []);
        }
      })
      .catch(() => {
        if (active) {
          const source = fallbackOffers.length > 0 ? fallbackOffers : DEFAULT_FEATURED_OFFERS;
          setOffers(
            filterFallbackOffers(source, {
              q: search,
              categoryId,
              subcategory,
              neighborhood,
              featuredOnly,
              sort,
            }),
          );
          setError('');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, categoryId, subcategory, neighborhood, featuredOnly, sort, fallbackOffers]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setCompanyDetail(null);
      return;
    }
    let active = true;
    setLoadingCompany(true);
    apiRequest<{ company: Company; offers: Offer[] }>(`/api/companies/${selectedCompanyId}`)
      .then((res) => {
        if (active) setCompanyDetail(res);
      })
      .catch(() => {
        if (active) {
          const companyPool = companies.length > 0 ? companies : DEFAULT_FEATURED_COMPANIES;
          const offerPool = fallbackOffers.length > 0 ? fallbackOffers : DEFAULT_FEATURED_OFFERS;
          const matched = companyPool.find((c) => c.id === selectedCompanyId);
          if (matched) {
            setCompanyDetail({
              company: matched,
              offers: offerPool.filter((o) => o.companyId === selectedCompanyId),
            });
          } else {
            setCompanyDetail(null);
          }
        }
      })
      .finally(() => {
        if (active) setLoadingCompany(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCompanyId, companies, fallbackOffers]);

  const safeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const safeCompanies = companies.length > 0 ? companies : DEFAULT_FEATURED_COMPANIES;
  const activeCategory = safeCategories.find((c) => c.id === categoryId);
  const rawCategoriesWithOffers = safeCategories.filter(
    (c) => (c.activeOffersCount || 0) > 0 || c.id === categoryId,
  );
  const categoriesWithOffers =
    rawCategoriesWithOffers.length > 0 ? rawCategoriesWithOffers : safeCategories;
  const totalRedemptionsAllOffers = offers.reduce((acc, o) => acc + (o.redemptionsCount || 0), 0);

  async function handleGenerateCoupon(offer: Offer) {
    if (!user) {
      onRequireAuth();
      return;
    }
    setIssuingCoupon(true);
    setIssueError('');
    try {
      const res = await apiRequest<{ coupon: Coupon }>('/api/consumer/coupons', {
        method: 'POST',
        body: JSON.stringify({ offerId: offer.id }),
      });
      setIssuedCoupon(res.coupon);
      onCouponIssued(res.coupon);
    } catch (err: any) {
      setIssueError(err.message || 'Erro ao gerar cupom.');
    } finally {
      setIssuingCoupon(false);
    }
  }

  // Company individual page
  if (selectedCompanyId) {
    const isFav = favoriteCompanyIds.includes(selectedCompanyId);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <button
          type="button"
          onClick={() => onSelectCompany(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao catálogo
        </button>

        {loadingCompany ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
            Carregando estabelecimento...
          </div>
        ) : !companyDetail ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
            Estabelecimento não encontrado ou indisponível.
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto bg-slate-100">
                <BrandImage
                  src={companyDetail.company.coverImageUrl || companyDetail.company.logoUrl}
                  alt={companyDetail.company.tradeName}
                  className="w-full h-full object-cover"
                  fallbackLabel={companyDetail.company.tradeName}
                />
              </div>
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-1">
                        <span>{companyDetail.company.categoryName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{COMMERCIAL_TIER_LABELS[companyDetail.company.commercialTier]}</span>
                        {companyDetail.company.isDemo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-700 font-medium">
                              Parceiro Demonstrativo
                            </span>
                          </>
                        )}
                      </div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        {companyDetail.company.tradeName}
                      </h1>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        user ? onToggleFavorite(companyDetail.company.id) : onRequireAuth()
                      }
                      className={`p-2.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                        isFav
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                      }`}
                      aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar empresa'}
                    >
                      <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {companyDetail.company.description || 'Descrição comercial não informada.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-600">
                    {companyDetail.company.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                        <span>
                          {companyDetail.company.address}
                          {companyDetail.company.neighborhood
                            ? ` — ${companyDetail.company.neighborhood}`
                            : ''}
                          , {companyDetail.company.city}
                        </span>
                      </div>
                    )}
                    {companyDetail.company.businessHours && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                        <span>{companyDetail.company.businessHours}</span>
                      </div>
                    )}
                    {(companyDetail.company.phone || companyDetail.company.whatsapp) && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                        <span>
                          {companyDetail.company.phone}
                          {companyDetail.company.whatsapp
                            ? ` · WhatsApp: ${companyDetail.company.whatsapp}`
                            : ''}
                        </span>
                      </div>
                    )}
                    {(companyDetail.company.website || companyDetail.company.instagram) && (
                      <div className="flex items-start gap-2">
                        <ExternalLink className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                        <span>
                          {companyDetail.company.website || companyDetail.company.instagram}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    Situação cadastral:{' '}
                    <strong className="text-brand-accent">Parceiro Aprovado</strong>
                  </span>
                  {companyDetail.company.isFeatured && (
                    <span className="font-medium text-brand-primary">Empresa em destaque</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">
                Benefícios disponíveis neste estabelecimento ({companyDetail.offers.length})
              </h2>
              {companyDetail.offers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                  Esta empresa não possui ofertas ativas no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companyDetail.offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="font-semibold text-brand-accent">{offer.discountLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>Validade até {offer.endDate}</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">{offer.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-3">{offer.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIssuedCoupon(null);
                          setIssueError('');
                          onChangeOfferModal(offer);
                        }}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg transition-colors cursor-pointer"
                      >
                        Ver condições e gerar cupom
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Catálogo de Benefícios
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Busque descontos e condições especiais em estabelecimentos participantes de Piracicaba e
            região.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              featuredOnly
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Empresas em destaque
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'recent' | 'most_used')}
            aria-label="Ordenar ofertas"
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="recent">Ofertas recentes</option>
            {totalRedemptionsAllOffers > 0 && (
              <option value="most_used">Mais utilizadas</option>
            )}
          </select>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por oferta, produto ou empresa..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(Number(e.target.value));
                setSubcategory('');
              }}
              aria-label="Filtrar por categoria"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-primary"
            >
              <option value={0}>Todas as categorias com ofertas</option>
              {categoriesWithOffers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.activeOffersCount})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!activeCategory || activeCategory.subcategories.length === 0}
              aria-label="Filtrar por subcategoria"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Subcategoria</option>
              {(activeCategory?.subcategories || []).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Bairro / Cidade"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Category interactive filter buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setCategoryId(0);
              setSubcategory('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              categoryId === 0
                ? 'bg-brand-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
          {categoriesWithOffers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(c.id);
                setSubcategory('');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                categoryId === c.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-xl h-80 animate-pulse p-5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-6 text-sm">
          {error}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <Store className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-base font-semibold text-slate-800">
            Nenhuma oferta encontrada com esses filtros
          </p>
          <p className="text-sm text-slate-500">
            Tente limpar a busca ou selecionar outra categoria disponível.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategoryId(0);
              setSubcategory('');
              setNeighborhood('');
              setFeaturedOnly(false);
            }}
            className="mt-2 px-4 py-2 text-xs font-semibold text-brand-primary bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                  <BrandImage
                    src={offer.imageUrl}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    fallbackLabel={offer.companyName}
                  />
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                    <span>{offer.categoryName}</span>
                    {offer.subcategory && (
                      <>
                        <span aria-hidden="true">/</span>
                        <span>{offer.subcategory}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-brand-accent">{offer.discountLabel}</span>
                    {offer.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 font-medium">Demonstrativo</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 leading-snug">
                    {offer.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2">{offer.description}</p>

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(offer.companyId)}
                      className="font-medium text-brand-primary hover:underline text-left cursor-pointer"
                    >
                      {offer.companyName}
                    </button>
                    <span>{offer.companyNeighborhood || offer.companyCity}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIssuedCoupon(null);
                    setIssueError('');
                    onChangeOfferModal(offer);
                  }}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg transition-colors cursor-pointer"
                >
                  Detalhes e Cupom
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCompany(offer.companyId)}
                  className="py-2.5 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Empresa
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Participating Companies Summary Row */}
      {safeCompanies.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Empresas participantes aprovadas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {safeCompanies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCompany(c.id)}
                className="text-left bg-white border border-slate-200 hover:border-brand-primary rounded-xl p-4 transition-colors cursor-pointer"
              >
                <p className="text-xs text-slate-500">
                  {c.categoryName} {c.isDemo ? '· Demonstrativo' : ''}
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{c.tradeName}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {c.neighborhood ? `${c.neighborhood} · ` : ''}
                  {c.city}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offer Detail & Coupon Generation Modal */}
      {selectedOfferModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {selectedOfferModal.companyName} · {selectedOfferModal.discountLabel}
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeOfferModal(null);
                  setIssuedCoupon(null);
                  setIssueError('');
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {issuedCoupon ? (
                <div className="text-center space-y-4 py-2">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-accent">
                    <CheckCircle2 className="w-5 h-5" />
                    Cupom emitido com sucesso
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{issuedCoupon.offerTitle}</h3>
                  <div className="flex justify-center">
                    <QrCodeDisplay
                      value={`VTX-QR:${issuedCoupon.qrToken}`}
                      size={176}
                      label={`QR Code do cupom ${issuedCoupon.code}`}
                    />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Código para apresentação no caixa</p>
                    <p className="font-mono text-lg font-bold text-brand-primary tracking-wider mt-0.5">
                      {issuedCoupon.code}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Apresente este QR Code ou código em{' '}
                    <strong>{issuedCoupon.companyName}</strong>. Nenhum dado pessoal é exposto no
                    QR Code.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedOfferModal.title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedOfferModal.description}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
                      <span>
                        Vigência:{' '}
                        <strong className="tabular-nums">
                          {selectedOfferModal.startDate} até {selectedOfferModal.endDate}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-primary shrink-0" />
                      <span>
                        Dias e horários: {selectedOfferModal.validDays} ·{' '}
                        {selectedOfferModal.validHours}
                      </span>
                    </div>
                    {selectedOfferModal.requiresScheduling && (
                      <p className="text-amber-800 font-medium">
                        Atenção: este benefício requer agendamento prévio junto ao estabelecimento.
                      </p>
                    )}
                    {selectedOfferModal.restrictions && (
                      <p className="text-slate-600 pt-1 border-t border-slate-200">
                        <strong>Condições e restrições:</strong> {selectedOfferModal.restrictions}
                      </p>
                    )}
                  </div>

                  {issueError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3">
                      {issueError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              {issuedCoupon ? (
                <button
                  type="button"
                  onClick={() => {
                    onChangeOfferModal(null);
                    setIssuedCoupon(null);
                  }}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                >
                  Concluir
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const cid = selectedOfferModal.companyId;
                      onChangeOfferModal(null);
                      onSelectCompany(cid);
                    }}
                    className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Ver estabelecimento
                  </button>
                  <button
                    type="button"
                    disabled={issuingCoupon}
                    onClick={() => handleGenerateCoupon(selectedOfferModal)}
                    className="py-2.5 px-5 text-sm font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark disabled:opacity-60 rounded-lg inline-flex items-center gap-2 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    {issuingCoupon
                      ? 'Gerando cupom...'
                      : user
                        ? 'Gerar Cupom / QR Code'
                        : 'Entrar para gerar cupom'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

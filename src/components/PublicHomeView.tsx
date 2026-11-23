import { ArrowRight, CheckCircle2, ChevronDown, MapPin, QrCode, Store, Users } from 'lucide-react';
import { useState } from 'react';
import type {
  AuthUser,
  BrandConfig,
  Campaign,
  Category,
  Company,
  LegalConfig,
  Offer,
} from '../types.ts';
import { BrandImage } from './BrandImage.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface PublicHomeViewProps {
  brand: BrandConfig;
  legal: LegalConfig;
  categories: Category[];
  featuredCompanies: Company[];
  featuredOffers: Offer[];
  activeCampaigns: Campaign[];
  user: AuthUser | null;
  onNavigateCatalog: (categoryId?: number) => void;
  onNavigateCompany: (companyId: number) => void;
  onNavigateAuth: (tab?: 'login' | 'register' | 'admin') => void;
  onOpenOffer: (offer: Offer) => void;
  onOpenLegalModal: (mode: 'terms' | 'privacy' | 'about') => void;
}

export function PublicHomeView({
  brand,
  legal,
  categories,
  featuredCompanies,
  featuredOffers,
  activeCampaigns,
  user,
  onNavigateCatalog,
  onNavigateCompany,
  onNavigateAuth,
  onOpenOffer,
  onOpenLegalModal,
}: PublicHomeViewProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-4">
                <BrandLogo brand={brand} variant="main" />
                <div className="text-xs text-slate-600 leading-snug">
                  <p className="font-semibold text-brand-primary">{brand.institutionAcronym}</p>
                  <p>{brand.institutionName}</p>
                </div>
              </div>

              <h1
                className="font-display font-bold text-slate-900 tracking-tight leading-[1.12]"
                style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', textWrap: 'balance' }}
              >
                {brand.heroHeadline}
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                {brand.heroSubheadline}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateCatalog()}
                  className="px-6 py-3 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explorar Benefícios
                  <ArrowRight className="w-4 h-4" />
                </button>
                {!user ? (
                  <button
                    type="button"
                    onClick={() => onNavigateAuth('register')}
                    className="px-6 py-3 text-sm font-semibold text-brand-primary bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Cadastrar Gratuitamente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateCatalog()}
                    className="px-6 py-3 text-sm font-semibold text-brand-accent bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Gerar Cupom Digital
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                <span>Acesso gratuito ao catálogo básico</span>
                <span aria-hidden="true">·</span>
                <span>Prioridade para associados {brand.institutionAcronym}</span>
                <span aria-hidden="true">·</span>
                <span>Aberto à comunidade de Piracicaba</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <BrandImage
                  src={brand.heroImageUrl}
                  alt="Praça revitalizada com coreto, fonte interativa e famílias na Região Metropolitana de Piracicaba"
                  className="w-full h-full object-cover"
                  fallbackLabel={brand.clubName}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-brand-accent tracking-wide mb-1">
              Funcionamento do Clube
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Simples para o consumidor, seguro para o parceiro
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md">
            Sem mensalidades para acesso básico e com validação digital instantânea diretamente no
            estabelecimento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>01. Cadastro individual</span>
              <Users className="w-4 h-4 text-brand-primary" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Crie sua conta gratuitamente
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Associados {brand.institutionAcronym} podem informar seu vínculo para ações prioritárias. Moradores de
              Piracicaba e região também participam sem custo.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>02. Seleção de ofertas</span>
              <Store className="w-4 h-4 text-brand-primary" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Escolha um estabelecimento local
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Filtre por categoria, bairro ou condição especial. Todas as regras, horários e
              restrições são exibidos de forma transparente.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>03. Resgate presencial</span>
              <QrCode className="w-4 h-4 text-brand-accent" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Apresente o código ou QR Code
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Gere seu cupom pessoal na tela e apresente ao atendente. A validação ocorre no
              servidor sem expor dados pessoais desnecessários.
            </p>
          </div>
        </div>
      </section>

      {/* Active Campaigns Banner (if any) */}
      {activeCampaigns.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand-primary text-white rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs text-emerald-300 font-medium flex flex-wrap items-center gap-2">
                <span>Campanha institucional ativa</span>
                {activeCampaigns[0].isDemo && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Exemplo demonstrativo</span>
                  </>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {activeCampaigns[0].title}
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed">
                {activeCampaigns[0].description}
              </p>
              <p className="text-xs text-slate-300">
                Público: {activeCampaigns[0].targetAudience} · Vigência até{' '}
                <span className="tabular-nums">{activeCampaigns[0].endDate}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateCatalog()}
              className="px-5 py-3 text-sm font-semibold bg-brand-accent hover:bg-brand-accent-dark text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-center"
            >
              Ver ofertas participantes
            </button>
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Categorias de benefícios
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Estrutura preparada para crescimento gradual das parcerias na Região Metropolitana de
              Piracicaba.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateCatalog()}
            className="text-sm font-semibold text-brand-primary hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ver catálogo completo
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const hasOffers = (cat.activeOffersCount || 0) > 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => (hasOffers ? onNavigateCatalog(cat.id) : undefined)}
                disabled={!hasOffers}
                className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between min-h-[112px] ${
                  hasOffers
                    ? 'bg-white border-slate-200 hover:border-brand-primary cursor-pointer'
                    : 'bg-slate-100/70 border-slate-200/80 text-slate-500 cursor-default'
                }`}
              >
                <div>
                  <h3
                    className={`text-sm font-semibold ${
                      hasOffers ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                </div>
                <div className="pt-3 text-xs font-medium tabular-nums">
                  {hasOffers ? (
                    <span className="text-brand-accent">
                      {cat.activeOffersCount}{' '}
                      {cat.activeOffersCount === 1 ? 'oferta ativa' : 'ofertas ativas'}
                    </span>
                  ) : (
                    <span className="text-slate-400">Em breve — aguardando parceiros</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Offers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Ofertas em destaque
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Exemplos demonstrativos para avaliação da diretoria, claramente sinalizados até a
              entrada dos estabelecimentos credenciados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateCatalog()}
            className="text-sm font-semibold text-brand-primary hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Todas as ofertas
          </button>
        </div>

        {featuredOffers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-800">
              Nenhuma oferta publicada no momento.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Novos benefícios aparecerão aqui assim que forem aprovados pela equipe da Associação.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredOffers.slice(0, 4).map((offer) => (
              <article
                key={offer.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-slate-300 transition-colors"
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                  <BrandImage
                    src={offer.imageUrl}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    fallbackLabel={offer.companyName}
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span>{offer.categoryName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-brand-accent">{offer.discountLabel}</span>
                      {offer.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-medium">Demonstração</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {offer.title}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {offer.companyName} · {offer.companyNeighborhood || offer.companyCity}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenOffer(offer)}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-brand-primary bg-slate-100 hover:bg-brand-primary hover:text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Ver condições e gerar cupom
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Participating Companies */}
      <section id="empresas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Estabelecimentos participantes
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Empresas aprovadas pela Associação para oferecer vantagens aos consumidores em
                Piracicaba e região.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateAuth('register')}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cadastrar empresa parceira
            </button>
          </div>

          {featuredCompanies.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Nenhuma empresa aprovada no catálogo público ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredCompanies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => onNavigateCompany(company.id)}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-brand-primary transition-colors flex flex-col justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span>{company.categoryName}</span>
                      {company.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-medium">Demonstrativo</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{company.tradeName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {company.neighborhood ? `${company.neighborhood}, ` : ''}
                        {company.city}
                      </span>
                    </p>
                  </div>
                  <div className="text-xs font-medium text-brand-primary tabular-nums">
                    {company.activeOffersCount || 0}{' '}
                    {(company.activeOffersCount || 0) === 1 ? 'benefício ativo' : 'benefícios ativos'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Advantages & FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-bold text-slate-900">
            Por que participar pela {brand.institutionAcronym}?
          </h2>
          <ul className="space-y-4 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
              <span>
                <strong>Valorização dos associados:</strong> prioridade nas ações de mobilização,
                campanhas institucionais e benefícios negociados pela Associação.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
              <span>
                <strong>Fomento ao comércio local:</strong> conexão direta entre consumidores da
                região e estabelecimentos de Piracicaba, sem intermediação financeira complexa.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
              <span>
                <strong>Governança e LGPD:</strong> coleta mínima de dados, aprovação prévia de
                parceiros e ofertas e cupons validados no servidor sem expor dados pessoais.
              </span>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Perguntas frequentes</h2>
          <div className="divide-y divide-slate-200">
            {legal.faqItems.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left text-sm font-semibold text-slate-900 hover:text-brand-primary cursor-pointer"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.answer}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <BrandLogo brand={brand} variant="main" className="h-11 w-auto" />
                <div>
                  <p className="text-sm font-bold text-brand-primary">{brand.clubName}</p>
                  <p className="text-xs text-slate-600">{brand.institutionName}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{brand.partnerSignature}</p>
            </div>

            <div className="md:col-span-4 space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-900 text-sm">Atendimento institucional</p>
              <p>{brand.contactEmail}</p>
              <p>{brand.contactPhone}</p>
              <p>{brand.contactAddress}</p>
              <p>{brand.contactHours}</p>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <p className="font-semibold text-slate-900 text-sm">Documentos e governança</p>
              <div className="flex flex-col items-start gap-1.5 text-slate-600">
                <button
                  type="button"
                  onClick={() => onOpenLegalModal('about')}
                  className="hover:text-brand-primary hover:underline cursor-pointer"
                >
                  Sobre a plataforma e parceria {brand.techPartnerName}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLegalModal('terms')}
                  className="hover:text-brand-primary hover:underline cursor-pointer"
                >
                  Termos de Uso
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLegalModal('privacy')}
                  className="hover:text-brand-primary hover:underline cursor-pointer"
                >
                  Política de Privacidade (LGPD)
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateAuth('admin')}
                  className="hover:text-brand-primary hover:underline cursor-pointer"
                >
                  Acesso Administrativo
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              © {new Date().getFullYear()} {brand.institutionName} ({brand.institutionAcronym}).
              Todos os direitos reservados.
            </span>
            <span>Tecnologia e operação: {brand.techPartnerName}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

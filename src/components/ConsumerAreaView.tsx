import {
  CheckCircle2,
  Heart,
  HelpCircle,
  History,
  MessageSquareWarning,
  QrCode,
  UserCog,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { COUPON_STATUS_LABELS } from '../config/brand.ts';
import { apiRequest } from '../lib/api.ts';
import type {
  AuthUser,
  BrandConfig,
  Company,
  Complaint,
  Coupon,
  CouponRedemption,
  LegalConfig,
  Offer,
} from '../types.ts';
import { QrCodeDisplay } from './QrCodeDisplay.tsx';

interface ConsumerAreaViewProps {
  user: AuthUser;
  brand: BrandConfig;
  legal: LegalConfig;
  recommendedOffers: Offer[];
  allApprovedCompanies: Company[];
  onUserUpdated: (user: AuthUser) => void;
  onNavigateCatalog: () => void;
  onSelectCompany: (companyId: number) => void;
  onOpenOffer: (offer: Offer) => void;
  onOpenLegalModal: (mode: 'terms' | 'privacy' | 'about') => void;
}

export function ConsumerAreaView({
  user,
  brand,
  legal,
  recommendedOffers,
  allApprovedCompanies,
  onUserUpdated,
  onNavigateCatalog,
  onSelectCompany,
  onOpenOffer,
  onOpenLegalModal,
}: ConsumerAreaViewProps) {
  const [section, setSection] = useState<
    'overview' | 'coupons' | 'history' | 'favorites' | 'profile' | 'help'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Company[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Profile form
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [isMember, setIsMember] = useState(user.isMember);
  const [memberCode, setMemberCode] = useState(user.memberCode || '');
  const [commEmail, setCommEmail] = useState(user.communicationEmail);
  const [commWhatsapp, setCommWhatsapp] = useState(user.communicationWhatsapp);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Complaint form
  const [compCompanyId, setCompCompanyId] = useState<number>(allApprovedCompanies[0]?.id || 0);
  const [compSubject, setCompSubject] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compMsg, setCompMsg] = useState('');

  async function loadOverview() {
    setLoading(true);
    try {
      const data = await apiRequest<{
        favorites: Company[];
        coupons: Coupon[];
        redemptions: CouponRedemption[];
        complaints: Complaint[];
      }>('/api/consumer/overview');
      setFavorites(data.favorites);
      setCoupons(data.coupons);
      setRedemptions(data.redemptions);
      setComplaints(data.complaints);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleCancelCoupon(couponId: number) {
    await apiRequest(`/api/consumer/coupons/${couponId}/cancel`, { method: 'POST' });
    await loadOverview();
  }

  async function handleToggleFavorite(companyId: number) {
    await apiRequest(`/api/consumer/favorites/${companyId}`, { method: 'POST' });
    await loadOverview();
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/consumer/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          phone,
          isMember,
          memberCode: isMember ? memberCode : null,
          communicationEmail: commEmail,
          communicationWhatsapp: commWhatsapp,
        }),
      });
      onUserUpdated(res.user);
      setProfileMsg('Dados cadastrais e preferências atualizados com sucesso.');
    } catch (err: any) {
      setProfileError(err.message || 'Não foi possível atualizar os dados.');
    }
  }

  async function handleSubmitComplaint(e: FormEvent) {
    e.preventDefault();
    setCompMsg('');
    if (!compCompanyId) return;
    await apiRequest('/api/consumer/complaints', {
      method: 'POST',
      body: JSON.stringify({
        companyId: compCompanyId,
        subject: compSubject,
        description: compDesc,
      }),
    });
    setCompSubject('');
    setCompDesc('');
    setCompMsg('Solicitação registrada e encaminhada à equipe da Associação.');
    await loadOverview();
  }

  const availableCoupons = coupons.filter((c) => c.status === 'available');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Área do Consumidor ·{' '}
            {user.isMember ? `Associado ${brand.institutionAcronym}` : 'Participante da Comunidade'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Olá, {user.fullName}</h1>
        </div>
        <button
          type="button"
          onClick={onNavigateCatalog}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          Explorar catálogo de benefícios
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {[
          { id: 'overview', label: 'Visão Geral' },
          { id: 'coupons', label: `Cupons (${availableCoupons.length})` },
          { id: 'history', label: `Histórico (${redemptions.length})` },
          { id: 'favorites', label: `Favoritas (${favorites.length})` },
          { id: 'profile', label: 'Meus Dados' },
          { id: 'help', label: 'Ajuda e Ouvidoria' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              section === tab.id
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Carregando sua área pessoal...
        </div>
      ) : (
        <>
          {section === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Cupons disponíveis</p>
                  <p className="text-2xl font-bold text-brand-primary tabular-nums mt-1">
                    {availableCoupons.length}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Benefícios utilizados</p>
                  <p className="text-2xl font-bold text-brand-accent tabular-nums mt-1">
                    {redemptions.length}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Empresas favoritas</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                    {favorites.length}
                  </p>
                </div>
              </div>

              {availableCoupons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Seus cupons prontos para uso</h2>
                    <button
                      type="button"
                      onClick={() => setSection('coupons')}
                      className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableCoupons.slice(0, 2).map((cp) => (
                      <div
                        key={cp.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-5"
                      >
                        <QrCodeDisplay value={`VTX-QR:${cp.qrToken}`} size={104} />
                        <div className="space-y-1.5 min-w-0">
                          <p className="text-xs text-brand-accent font-semibold">
                            {cp.discountLabel} · Disponível
                          </p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {cp.offerTitle}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{cp.companyName}</p>
                          <p className="font-mono text-sm font-bold text-brand-primary">{cp.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Ofertas recomendadas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendedOffers.slice(0, 3).map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <p className="text-xs text-slate-500">
                          {offer.categoryName} ·{' '}
                          <span className="font-semibold text-brand-accent">{offer.discountLabel}</span>
                        </p>
                        <h3 className="text-sm font-semibold text-slate-900 mt-1">{offer.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{offer.companyName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenOffer(offer)}
                        className="w-full py-2 text-xs font-semibold text-brand-primary bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Ver benefício
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'coupons' && (
            <div className="space-y-4">
              {coupons.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <QrCode className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">
                    Você ainda não gerou nenhum cupom
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateCatalog}
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                  >
                    Escolher benefício no catálogo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {coupons.map((cp) => (
                    <div
                      key={cp.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-5"
                    >
                      <div className="shrink-0 flex justify-center">
                        <QrCodeDisplay value={`VTX-QR:${cp.qrToken}`} size={136} />
                      </div>
                      <div className="flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold flex items-center gap-2">
                            <span
                              className={
                                cp.status === 'available'
                                  ? 'text-brand-accent'
                                  : cp.status === 'used'
                                    ? 'text-brand-primary'
                                    : 'text-slate-500'
                              }
                            >
                              {COUPON_STATUS_LABELS[cp.status] || cp.status}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-500">{cp.discountLabel}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{cp.offerTitle}</h3>
                          <p className="text-xs text-slate-600">{cp.companyName}</p>
                          <p className="font-mono text-base font-bold text-brand-primary pt-1">
                            {cp.code}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            Validade até {cp.expiresAt.slice(0, 10)}
                          </p>
                        </div>
                        {cp.status === 'available' && (
                          <button
                            type="button"
                            onClick={() => handleCancelCoupon(cp.id)}
                            className="self-start text-xs font-medium text-rose-700 hover:underline cursor-pointer"
                          >
                            Cancelar cupom
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'history' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-brand-primary" />
                <h2 className="text-base font-semibold text-slate-900">Histórico de utilizações</h2>
              </div>
              {redemptions.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Nenhuma utilização registrada até o momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Código</th>
                        <th className="px-4 py-3 font-semibold">Oferta</th>
                        <th className="px-4 py-3 font-semibold">Empresa</th>
                        <th className="px-4 py-3 font-semibold">Data e hora</th>
                        <th className="px-4 py-3 font-semibold">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {redemptions.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 font-mono font-semibold text-brand-primary">
                            {r.code}
                          </td>
                          <td className="px-4 py-3 text-slate-900">{r.offerTitle}</td>
                          <td className="px-4 py-3 text-slate-600">{r.companyName}</td>
                          <td className="px-4 py-3 text-slate-500 tabular-nums">{r.redeemedAt}</td>
                          <td className="px-4 py-3 text-brand-accent font-medium">Utilizado</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === 'favorites' && (
            <div>
              {favorites.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
                  <Heart className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">Nenhuma empresa favoritada</p>
                  <p className="text-xs text-slate-500">
                    Acesse a página de qualquer estabelecimento parceiro para salvá-lo aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((comp) => (
                    <div
                      key={comp.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <p className="text-xs text-slate-500">{comp.categoryName}</p>
                        <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                          {comp.tradeName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {comp.neighborhood}, {comp.city}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => onSelectCompany(comp.id)}
                          className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                        >
                          Ver ofertas ({comp.activeOffersCount || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(comp.id)}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <UserCog className="w-5 h-5 text-brand-primary" />
                <h2 className="text-base font-bold text-slate-900">
                  Dados Cadastrais e Preferências (LGPD)
                </h2>
              </div>

              {profileMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {profileMsg}
                </div>
              )}
              {profileError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3">
                  {profileError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail (identificador da conta)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMember}
                    onChange={(e) => setIsMember(e.target.checked)}
                  />
                  Sou associado da {brand.institutionAcronym}
                </label>
                {isMember && (
                  <input
                    type="text"
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value)}
                    placeholder="Código associativo (opcional)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Preferências de comunicação:</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commEmail}
                    onChange={(e) => setCommEmail(e.target.checked)}
                  />
                  Receber comunicados e ofertas por e-mail
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commWhatsapp}
                    onChange={(e) => setCommWhatsapp(e.target.checked)}
                  />
                  Receber avisos informativos via WhatsApp
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
              >
                Salvar alterações
              </button>
            </form>
          )}

          {section === 'help' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-base font-bold text-slate-900">
                    Central de Ajuda & Informações Institucionais
                  </h2>
                </div>
                <div className="space-y-3 text-xs text-slate-600">
                  {legal.faqItems.map((item, idx) => (
                    <div key={idx} className="pb-3 border-b border-slate-100 last:border-none">
                      <p className="font-semibold text-slate-900">{item.question}</p>
                      <p className="mt-1 leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenLegalModal('about')}
                    className="font-semibold text-brand-primary hover:underline cursor-pointer"
                  >
                    Sobre a {brand.institutionAcronym} e {brand.techPartnerName}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenLegalModal('privacy')}
                    className="font-semibold text-brand-primary hover:underline cursor-pointer"
                  >
                    Privacidade e LGPD
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquareWarning className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-base font-bold text-slate-900">
                    Registrar ocorrência ou solicitação
                  </h2>
                </div>
                {compMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg p-3">
                    {compMsg}
                  </div>
                )}
                <form onSubmit={handleSubmitComplaint} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estabelecimento relacionado
                    </label>
                    <select
                      value={compCompanyId}
                      onChange={(e) => setCompCompanyId(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                      {allApprovedCompanies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.tradeName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assunto
                    </label>
                    <input
                      type="text"
                      required
                      value={compSubject}
                      onChange={(e) => setCompSubject(e.target.value)}
                      placeholder="Ex.: Dúvida sobre condição de desconto"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descrição detalhada
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={compDesc}
                      onChange={(e) => setCompDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                  >
                    Enviar à Associação
                  </button>
                </form>

                {complaints.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Suas solicitações</p>
                    {complaints.map((cm) => (
                      <div key={cm.id} className="text-xs bg-slate-50 rounded-lg p-3">
                        <p className="font-semibold text-slate-900">
                          {cm.subject} · <span className="text-brand-primary">{cm.status}</span>
                        </p>
                        <p className="text-slate-600 mt-0.5">{cm.companyName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

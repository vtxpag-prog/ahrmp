import { CheckCircle2, Plus, QrCode, ShieldAlert, Store } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  COMMERCIAL_TIER_LABELS,
  COMPANY_STATUS_LABELS,
  COUPON_STATUS_LABELS,
  OFFER_STATUS_LABELS,
} from '../config/brand.ts';
import { apiRequest } from '../lib/api.ts';
import type { Category, Company, CouponRedemption, Offer } from '../types.ts';

interface PartnerPortalViewProps {
  categories: Category[];
}

export function PartnerPortalView({ categories }: PartnerPortalViewProps) {
  const [section, setSection] = useState<'validator' | 'offers' | 'company' | 'history'>('validator');
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [metrics, setMetrics] = useState({
    totalOffers: 0,
    publishedOffers: 0,
    totalCouponsIssued: 0,
    totalRedemptions: 0,
  });

  // Validator state
  const [identifier, setIdentifier] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [validatorError, setValidatorError] = useState('');
  const [validatorSuccess, setValidatorSuccess] = useState('');
  const [validating, setValidating] = useState(false);

  // Company form
  const activeCompany = companies[0] || null;
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [companyMsg, setCompanyMsg] = useState('');

  // New Offer form
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  const [benefitType, setBenefitType] = useState('percentage');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  );
  const [validDays, setValidDays] = useState('Segunda a Sábado');
  const [validHours, setValidHours] = useState('08h00 às 18h00');
  const [restrictions, setRestrictions] = useState('');
  const [requiresScheduling, setRequiresScheduling] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');

  async function loadDashboard() {
    setLoading(true);
    try {
      const data = await apiRequest<{
        companies: Company[];
        offers: Offer[];
        redemptions: CouponRedemption[];
        metrics: typeof metrics;
      }>('/api/partner/dashboard');
      setCompanies(data.companies);
      setOffers(data.offers);
      setRedemptions(data.redemptions);
      setMetrics(data.metrics);

      const comp = data.companies[0];
      if (comp) {
        setTradeName(comp.tradeName);
        setLegalName(comp.legalName);
        setCategoryId(comp.categoryId);
        setDescription(comp.description);
        setAddress(comp.address);
        setNeighborhood(comp.neighborhood);
        setPhone(comp.phone);
        setWhatsapp(comp.whatsapp);
        setBusinessHours(comp.businessHours);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setValidatorError('');
    setValidatorSuccess('');
    setLookupResult(null);
    if (!identifier.trim()) return;
    try {
      const res = await apiRequest<{ coupon: any }>(
        `/api/partner/coupons/lookup?identifier=${encodeURIComponent(identifier.trim())}`,
      );
      setLookupResult(res.coupon);
    } catch (err: any) {
      setValidatorError(err.message || 'Cupom não encontrado.');
    }
  }

  async function handleConfirmRedemption() {
    if (!identifier.trim()) return;
    setValidating(true);
    setValidatorError('');
    setValidatorSuccess('');
    try {
      const res = await apiRequest<{ redemption: any }>('/api/partner/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setValidatorSuccess(
        `Cupom ${res.redemption.code} validado com sucesso para ${res.redemption.consumerFirstName} (${res.redemption.discountLabel}).`,
      );
      setLookupResult(null);
      setIdentifier('');
      await loadDashboard();
    } catch (err: any) {
      setValidatorError(err.message || 'Não foi possível validar o cupom.');
    } finally {
      setValidating(false);
    }
  }

  async function handleSaveCompany(e: FormEvent) {
    e.preventDefault();
    setCompanyMsg('');
    await apiRequest('/api/partner/company', {
      method: 'POST',
      body: JSON.stringify({
        id: activeCompany?.id,
        tradeName,
        legalName,
        categoryId,
        description,
        address,
        neighborhood,
        city: 'Piracicaba - SP',
        phone,
        whatsapp,
        businessHours,
      }),
    });
    setCompanyMsg('Cadastro empresarial salvo com sucesso.');
    await loadDashboard();
  }

  async function handleCreateOffer(e: FormEvent, saveAsDraft: boolean) {
    e.preventDefault();
    if (!activeCompany) return;
    setOfferMsg('');
    await apiRequest('/api/partner/offers', {
      method: 'POST',
      body: JSON.stringify({
        companyId: activeCompany.id,
        categoryId: activeCompany.categoryId,
        title: offerTitle,
        description: offerDesc,
        benefitType,
        discountLabel,
        startDate,
        endDate,
        validDays,
        validHours,
        restrictions,
        requiresScheduling,
        saveAsDraft,
      }),
    });
    setOfferTitle('');
    setOfferDesc('');
    setDiscountLabel('');
    setRestrictions('');
    setShowOfferForm(false);
    setOfferMsg(
      saveAsDraft
        ? 'Rascunho salvo.'
        : 'Oferta enviada para aprovação da Associação antes da publicação.',
    );
    await loadDashboard();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Ambiente da Empresa Parceira</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {activeCompany ? activeCompany.tradeName : 'Novo Cadastro Empresarial'}
          </h1>
          {activeCompany && (
            <p className="text-xs text-slate-600 mt-1">
              Situação:{' '}
              <strong
                className={
                  activeCompany.status === 'approved' ? 'text-brand-accent' : 'text-amber-700'
                }
              >
                {COMPANY_STATUS_LABELS[activeCompany.status] || activeCompany.status}
              </strong>{' '}
              · Classificação: {COMMERCIAL_TIER_LABELS[activeCompany.commercialTier]}
              {activeCompany.isDemo ? ' · Conta Demonstrativa' : ''}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <p className="text-[11px] text-slate-500">Ofertas</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">{metrics.totalOffers}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <p className="text-[11px] text-slate-500">Publicadas</p>
            <p className="text-lg font-bold text-brand-accent tabular-nums">
              {metrics.publishedOffers}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <p className="text-[11px] text-slate-500">Cupons emitidos</p>
            <p className="text-lg font-bold text-brand-primary tabular-nums">
              {metrics.totalCouponsIssued}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <p className="text-[11px] text-slate-500">Resgates</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {metrics.totalRedemptions}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {[
          { id: 'validator', label: 'Validar Cupom / QR Code' },
          { id: 'offers', label: `Minhas Ofertas (${offers.length})` },
          { id: 'history', label: `Resgates (${redemptions.length})` },
          { id: 'company', label: 'Dados da Empresa' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              section === t.id
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Carregando painel do parceiro...
        </div>
      ) : (
        <>
          {section === 'validator' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-5">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-primary" />
                <h2 className="text-base font-bold text-slate-900">
                  Validador de Cupons no Servidor
                </h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Digite o código do cupom (ex.: <span className="font-mono">AHRMP-XXXX-XXXX</span>)
                ou informe o identificador lido do QR Code (<span className="font-mono">VTX-QR:...</span>).
                Somente cupons emitidos para ofertas do seu estabelecimento podem ser validados aqui.
              </p>

              <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Código AHRMP-... ou conteúdo do QR Code"
                  className="flex-1 px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg whitespace-nowrap cursor-pointer"
                >
                  Verificar cupom
                </button>
              </form>

              {validatorError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3.5 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {validatorError}
                </div>
              )}

              {validatorSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg p-3.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {validatorSuccess}
                </div>
              )}

              {lookupResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-brand-primary">
                      {lookupResult.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Status: {COUPON_STATUS_LABELS[lookupResult.status] || lookupResult.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{lookupResult.offerTitle}</p>
                  <p className="text-xs text-slate-600">
                    Condição: <strong>{lookupResult.discountLabel}</strong> · Consumidor:{' '}
                    {lookupResult.consumerFirstName}
                  </p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    Validade até: {lookupResult.expiresAt}
                  </p>
                  {lookupResult.status === 'available' && (
                    <button
                      type="button"
                      disabled={validating}
                      onClick={handleConfirmRedemption}
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark rounded-lg cursor-pointer"
                    >
                      {validating ? 'Confirmando...' : 'Confirmar Utilização do Benefício'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {section === 'offers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Ofertas do estabelecimento</h2>
                {activeCompany && (
                  <button
                    type="button"
                    onClick={() => setShowOfferForm(!showOfferForm)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Nova oferta
                  </button>
                )}
              </div>

              {offerMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg p-3">
                  {offerMsg}
                </div>
              )}

              {showOfferForm && activeCompany && (
                <form
                  onSubmit={(e) => handleCreateOffer(e, false)}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    Cadastrar oferta (sujeita à aprovação da Associação)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Título da oferta *
                      </label>
                      <input
                        type="text"
                        required
                        value={offerTitle}
                        onChange={(e) => setOfferTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Condição / Desconto exibido *
                      </label>
                      <input
                        type="text"
                        required
                        value={discountLabel}
                        onChange={(e) => setDiscountLabel(e.target.value)}
                        placeholder="Ex.: 15% OFF ou Cortesia"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descrição completa *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={offerDesc}
                      onChange={(e) => setOfferDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tipo de benefício
                      </label>
                      <select
                        value={benefitType}
                        onChange={(e) => setBenefitType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="percentage">Percentual de desconto</option>
                        <option value="fixed_value">Valor fixo</option>
                        <option value="special_condition">Condição especial</option>
                        <option value="gift">Brinde / Cortesia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Data início *
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Data término *
                      </label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={validDays}
                      onChange={(e) => setValidDays(e.target.value)}
                      placeholder="Dias válidos"
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={validHours}
                      onChange={(e) => setValidHours(e.target.value)}
                      placeholder="Horários válidos"
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <input
                    type="text"
                    value={restrictions}
                    onChange={(e) => setRestrictions(e.target.value)}
                    placeholder="Restrições e regras de utilização"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={requiresScheduling}
                      onChange={(e) => setRequiresScheduling(e.target.checked)}
                    />
                    Requer agendamento prévio
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark rounded-lg cursor-pointer"
                    >
                      Enviar para aprovação
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCreateOffer(e as any, true)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Salvar rascunho
                    </button>
                  </div>
                </form>
              )}

              {offers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                  Nenhuma oferta cadastrada para este estabelecimento.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Título</th>
                          <th className="px-4 py-3 font-semibold">Benefício</th>
                          <th className="px-4 py-3 font-semibold">Vigência</th>
                          <th className="px-4 py-3 font-semibold">Situação</th>
                          <th className="px-4 py-3 font-semibold text-right">Resgates</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {offers.map((o) => (
                          <tr key={o.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{o.title}</td>
                            <td className="px-4 py-3 text-brand-accent font-semibold">
                              {o.discountLabel}
                            </td>
                            <td className="px-4 py-3 text-slate-500 tabular-nums">
                              {o.startDate} até {o.endDate}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {OFFER_STATUS_LABELS[o.status] || o.status}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {o.redemptionsCount || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'history' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Histórico de cupons validados no estabelecimento
                </h2>
              </div>
              {redemptions.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Nenhum cupom validado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Código</th>
                        <th className="px-4 py-3 font-semibold">Oferta</th>
                        <th className="px-4 py-3 font-semibold">Consumidor</th>
                        <th className="px-4 py-3 font-semibold">Data e hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {redemptions.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 font-mono font-semibold text-brand-primary">
                            {r.code}
                          </td>
                          <td className="px-4 py-3 text-slate-900">{r.offerTitle}</td>
                          <td className="px-4 py-3 text-slate-600">{r.consumerFirstName}</td>
                          <td className="px-4 py-3 text-slate-500 tabular-nums">{r.redeemedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === 'company' && (
            <form
              onSubmit={handleSaveCompany}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Store className="w-5 h-5 text-brand-primary" />
                <h2 className="text-base font-bold text-slate-900">Cadastro da Empresa Parceira</h2>
              </div>
              {companyMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg p-3">
                  {companyMsg}
                </div>
              )}
              {activeCompany?.reviewNotes && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
                  <strong>Observação da Associação:</strong> {activeCompany.reviewNotes}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição comercial
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Endereço"
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Telefone"
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp"
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="Horário de funcionamento"
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
              >
                Salvar dados da empresa
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

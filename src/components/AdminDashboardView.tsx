import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FolderKanban,
  Megaphone,
  MessageSquareWarning,
  ScrollText,
  Settings,
  Tag,
  Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  COMMERCIAL_TIER_LABELS,
  COMPANY_STATUS_LABELS,
  DEFAULT_BRAND_CONFIG,
  FONT_PAIRING_OPTIONS,
  OFFER_STATUS_LABELS,
  ROLE_LABELS,
  darkenHexColor,
} from '../config/brand.ts';
import {
  PLAN_AUDIENCE_LABELS,
  PLAN_INQUIRY_STATUS_LABELS,
  formatBRL,
} from '../config/plans.ts';
import { apiRequest } from '../lib/api.ts';
import type {
  AuditLog,
  AuthUser,
  BrandConfig,
  Campaign,
  Category,
  CommercialTier,
  Company,
  CompanyStatus,
  Complaint,
  LegalConfig,
  Offer,
  OfferStatus,
  PlanInquiry,
  PlanInquiryStatus,
  SmtpPlaceholderConfig,
  UserRole,
} from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface AdminDashboardViewProps {
  currentUser: AuthUser;
  brand: BrandConfig;
  onSettingsUpdated: () => void;
}

type AdminSection =
  | 'overview'
  | 'companies'
  | 'offers'
  | 'inquiries'
  | 'users'
  | 'categories'
  | 'campaigns'
  | 'complaints'
  | 'audit'
  | 'settings';

export function AdminDashboardView({
  currentUser,
  brand,
  onSettingsUpdated,
}: AdminDashboardViewProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  // Overview state
  const [kpis, setKpis] = useState<Record<string, number>>({});
  const [series, setSeries] = useState<Array<{ day: string; count: number }>>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);

  // Entities
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [planInquiries, setPlanInquiries] = useState<PlanInquiry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Settings
  const [brandCfg, setBrandCfg] = useState<BrandConfig | null>(null);
  const [legalCfg, setLegalCfg] = useState<LegalConfig | null>(null);
  const [smtpCfg, setSmtpCfg] = useState<SmtpPlaceholderConfig | null>(null);

  // Forms
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');

  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampDesc, setNewCampDesc] = useState('');
  const [newCampStart, setNewCampStart] = useState(new Date().toISOString().slice(0, 10));
  const [newCampEnd, setNewCampEnd] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
  );
  const [newCampAudience, setNewCampAudience] = useState('Associados AHRMP e comunidade local');

  // Admin new offer form
  const [showNewOffer, setShowNewOffer] = useState(false);
  const [offerCompanyId, setOfferCompanyId] = useState<number>(0);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('');
  const [offerStart, setOfferStart] = useState(new Date().toISOString().slice(0, 10));
  const [offerEnd, setOfferEnd] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  );

  // Admin create staff/operator form
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operator');
  const [userFormError, setUserFormError] = useState('');

  async function loadAll(activeSec: AdminSection) {
    setLoading(true);
    try {
      if (activeSec === 'overview') {
        const res = await apiRequest<{
          kpis: Record<string, number>;
          registrationSeries: Array<{ day: string; count: number }>;
          recentActivity: AuditLog[];
        }>('/api/admin/overview');
        setKpis(res.kpis);
        setSeries(res.registrationSeries);
        setRecentActivity(res.recentActivity);
      } else if (activeSec === 'companies') {
        const res = await apiRequest<{ companies: Company[] }>('/api/admin/companies');
        setCompanies(res.companies);
      } else if (activeSec === 'offers') {
        const [offRes, compRes] = await Promise.all([
          apiRequest<{ offers: Offer[] }>('/api/admin/offers'),
          apiRequest<{ companies: Company[] }>('/api/admin/companies'),
        ]);
        setOffers(offRes.offers);
        setCompanies(compRes.companies);
        if (compRes.companies[0] && !offerCompanyId) {
          setOfferCompanyId(compRes.companies[0].id);
        }
      } else if (activeSec === 'users') {
        const res = await apiRequest<{ users: AuthUser[] }>(
          `/api/admin/users?q=${encodeURIComponent(userSearch)}`,
        );
        setUsers(res.users);
      } else if (activeSec === 'categories') {
        const res = await apiRequest<{ categories: Category[] }>('/api/admin/categories');
        setCategories(res.categories);
      } else if (activeSec === 'campaigns') {
        const res = await apiRequest<{ campaigns: Campaign[] }>('/api/admin/campaigns');
        setCampaigns(res.campaigns);
      } else if (activeSec === 'complaints') {
        const res = await apiRequest<{ complaints: Complaint[] }>('/api/admin/complaints');
        setComplaints(res.complaints);
      } else if (activeSec === 'inquiries') {
        const res = await apiRequest<{ inquiries: PlanInquiry[] }>('/api/admin/plan-inquiries');
        setPlanInquiries(res.inquiries);
      } else if (activeSec === 'audit') {
        const res = await apiRequest<{ logs: AuditLog[] }>('/api/admin/audit-logs');
        setAuditLogs(res.logs);
      } else if (activeSec === 'settings') {
        const res = await apiRequest<{
          brand: BrandConfig;
          legal: LegalConfig;
          smtpPlaceholder: SmtpPlaceholderConfig;
        }>('/api/admin/settings');
        setBrandCfg(res.brand);
        setLegalCfg(res.legal);
        setSmtpCfg(res.smtpPlaceholder);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(section);
  }, [section]);

  function notify(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  }

  async function handleReviewCompany(
    companyId: number,
    patch: { status?: CompanyStatus; commercialTier?: CommercialTier; isFeatured?: boolean },
  ) {
    await apiRequest(`/api/admin/companies/${companyId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    notify('Empresa atualizada.');
    await loadAll('companies');
    onSettingsUpdated();
  }

  async function handleReviewOffer(offerId: number, status: OfferStatus) {
    await apiRequest(`/api/admin/offers/${offerId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    notify('Oferta atualizada.');
    await loadAll('offers');
    onSettingsUpdated();
  }

  async function handleCreateAdminOffer(e: FormEvent) {
    e.preventDefault();
    await apiRequest('/api/admin/offers', {
      method: 'POST',
      body: JSON.stringify({
        companyId: offerCompanyId,
        title: offerTitle,
        description: offerDesc,
        discountLabel: offerDiscount,
        startDate: offerStart,
        endDate: offerEnd,
        status: 'published',
      }),
    });
    setOfferTitle('');
    setOfferDesc('');
    setOfferDiscount('');
    setShowNewOffer(false);
    notify('Oferta publicada pela administração.');
    await loadAll('offers');
    onSettingsUpdated();
  }

  async function handleToggleUserStatus(u: AuthUser) {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    await apiRequest(`/api/admin/users/${u.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    notify(`Usuário ${nextStatus === 'active' ? 'ativado' : 'suspenso'}.`);
    await loadAll('users');
  }

  async function handleChangeUserRole(u: AuthUser, role: UserRole) {
    try {
      await apiRequest(`/api/admin/users/${u.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      notify('Perfil de acesso atualizado.');
      await loadAll('users');
    } catch (err: any) {
      notify(err.message || 'Não foi possível alterar o perfil.');
    }
  }

  async function handleCreateAdminUser(e: FormEvent) {
    e.preventDefault();
    setUserFormError('');
    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newUserName,
          email: newUserLogin,
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      setNewUserName('');
      setNewUserLogin('');
      setNewUserPassword('');
      setNewUserRole('operator');
      setShowNewUser(false);
      notify('Operador / administrador cadastrado com sucesso.');
      await loadAll('users');
    } catch (err: any) {
      setUserFormError(err.message || 'Não foi possível criar o usuário.');
    }
  }

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    await apiRequest('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: newCatName,
        description: newCatDesc,
        subcategories: newCatSubs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    setNewCatName('');
    setNewCatDesc('');
    setNewCatSubs('');
    notify('Categoria criada.');
    await loadAll('categories');
    onSettingsUpdated();
  }

  async function handleToggleCategory(cat: Category) {
    await apiRequest(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    notify('Categoria atualizada.');
    await loadAll('categories');
    onSettingsUpdated();
  }

  async function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    await apiRequest('/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title: newCampTitle,
        description: newCampDesc,
        startDate: newCampStart,
        endDate: newCampEnd,
        targetAudience: newCampAudience,
        status: 'active',
      }),
    });
    setNewCampTitle('');
    setNewCampDesc('');
    notify('Campanha criada.');
    await loadAll('campaigns');
    onSettingsUpdated();
  }

  async function handleUpdateCampaignStatus(id: number, status: string) {
    await apiRequest(`/api/admin/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    notify('Status da campanha atualizado.');
    await loadAll('campaigns');
    onSettingsUpdated();
  }

  async function handleResolveComplaint(id: number, status: 'in_review' | 'resolved') {
    await apiRequest(`/api/admin/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNotes: `Atualizado por ${currentUser.fullName}` }),
    });
    notify('Ocorrência atualizada.');
    await loadAll('complaints');
  }

  async function handleUpdateInquiryStatus(id: number, status: PlanInquiryStatus) {
    await apiRequest(`/api/admin/plan-inquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    notify('Status da adesão ao plano atualizado.');
    await loadAll('inquiries');
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        brand: brandCfg,
        legal: legalCfg,
        smtpPlaceholder: smtpCfg,
      }),
    });
    notify('Configurações institucionais e White Label salvas.');
    onSettingsUpdated();
  }

  const navItems: Array<{ id: AdminSection; label: string; icon: any }> = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'companies', label: 'Empresas Parceiras', icon: Building2 },
    { id: 'offers', label: 'Ofertas', icon: Tag },
    { id: 'inquiries', label: 'Adesões a Planos', icon: ClipboardCheck },
    { id: 'users', label: 'Usuários e Perfis', icon: Users },
    { id: 'categories', label: 'Categorias', icon: FolderKanban },
    { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
    { id: 'complaints', label: 'Ouvidoria', icon: MessageSquareWarning },
    { id: 'audit', label: 'Auditoria', icon: ScrollText },
    { id: 'settings', label: 'White Label e SMTP', icon: Settings },
  ];

  const maxSeriesCount = Math.max(1, ...series.map((s) => s.count));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="px-3 py-2.5 border-b border-slate-100 mb-2">
              <p className="text-xs text-slate-500">Painel Administrativo</p>
              <p className="text-sm font-bold text-brand-primary truncate">{currentUser.fullName}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[currentUser.role]}</p>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors text-left cursor-pointer ${
                    active
                      ? 'bg-brand-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-9 space-y-6 min-w-0">
          {feedback && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium rounded-lg px-4 py-3">
              {feedback}
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
              Carregando dados reais do banco...
            </div>
          ) : (
            <>
              {section === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Usuários cadastrados', value: kpis.totalUsers || 0 },
                      { label: 'Usuários ativos', value: kpis.activeUsers || 0 },
                      { label: `Associados ${brand.institutionAcronym}`, value: kpis.totalMembers || 0 },
                      {
                        label: 'Empresas aprovadas',
                        value: `${kpis.approvedCompanies || 0} / ${kpis.totalCompanies || 0}`,
                      },
                      { label: 'Empresas pendentes', value: kpis.pendingCompanies || 0 },
                      { label: 'Ofertas publicadas', value: kpis.publishedOffers || 0 },
                      { label: 'Cupons emitidos', value: kpis.totalCoupons || 0 },
                      { label: 'Cupons utilizados', value: kpis.usedCoupons || 0 },
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-xs text-slate-500">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <h2 className="text-sm font-bold text-slate-900">
                        Evolução de cadastros (banco real)
                      </h2>
                      {series.length === 0 ? (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          Sem registros suficientes para gráfico.
                        </p>
                      ) : (
                        <div className="flex items-end gap-2 h-36 pt-4">
                          {series.map((item) => (
                            <div
                              key={item.day}
                              className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                            >
                              <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                                {item.count}
                              </span>
                              <div
                                className="w-full bg-brand-primary rounded-t"
                                style={{
                                  height: `${Math.max(12, (item.count / maxSeriesCount) * 90)}px`,
                                }}
                              />
                              <span className="text-[10px] text-slate-500 tabular-nums">
                                {item.day.slice(5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                      <h2 className="text-sm font-bold text-slate-900">
                        Atividade recente e rastreabilidade
                      </h2>
                      <div className="divide-y divide-slate-100 text-xs">
                        {recentActivity.slice(0, 6).map((act) => (
                          <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-mono font-semibold text-brand-primary">
                                {act.action}
                              </span>{' '}
                              <span className="text-slate-600">· por {act.actorName}</span>
                            </div>
                            <span className="text-slate-400 tabular-nums shrink-0">
                              {act.createdAt}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {section === 'companies' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">
                      Gestão de Empresas Parceiras ({companies.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Empresa</th>
                          <th className="px-4 py-3 font-semibold">Categoria</th>
                          <th className="px-4 py-3 font-semibold">Classificação</th>
                          <th className="px-4 py-3 font-semibold">Destaque</th>
                          <th className="px-4 py-3 font-semibold">Situação</th>
                          <th className="px-4 py-3 font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {companies.map((c) => (
                          <tr key={c.id}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">{c.tradeName}</p>
                              <p className="text-slate-500">
                                {c.neighborhood} · {c.isDemo ? 'Demonstrativo' : 'Real'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{c.categoryName}</td>
                            <td className="px-4 py-3">
                              <select
                                value={c.commercialTier}
                                onChange={(e) =>
                                  handleReviewCompany(c.id, {
                                    commercialTier: e.target.value as CommercialTier,
                                  })
                                }
                                className="px-2 py-1 border border-slate-200 rounded bg-white"
                              >
                                {Object.entries(COMMERCIAL_TIER_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  handleReviewCompany(c.id, { isFeatured: !c.isFeatured })
                                }
                                className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                                  c.isFeatured
                                    ? 'bg-brand-primary text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {c.isFeatured ? 'Destacada' : 'Padrão'}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {COMPANY_STATUS_LABELS[c.status] || c.status}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {c.status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewCompany(c.id, { status: 'approved' })
                                    }
                                    className="px-2.5 py-1 bg-brand-accent hover:bg-brand-accent-dark text-white rounded font-medium cursor-pointer"
                                  >
                                    Aprovar
                                  </button>
                                )}
                                {c.status !== 'correction_requested' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewCompany(c.id, { status: 'correction_requested' })
                                    }
                                    className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded font-medium cursor-pointer"
                                  >
                                    Correção
                                  </button>
                                )}
                                {c.status !== 'suspended' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewCompany(c.id, { status: 'suspended' })
                                    }
                                    className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded font-medium cursor-pointer"
                                  >
                                    Suspender
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {section === 'offers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Gestão e Aprovação de Ofertas ({offers.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowNewOffer(!showNewOffer)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                    >
                      Criar oferta administrativa
                    </button>
                  </div>

                  {showNewOffer && (
                    <form
                      onSubmit={handleCreateAdminOffer}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select
                          value={offerCompanyId}
                          onChange={(e) => setOfferCompanyId(Number(e.target.value))}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.tradeName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          value={offerTitle}
                          onChange={(e) => setOfferTitle(e.target.value)}
                          placeholder="Título da oferta"
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          required
                          value={offerDiscount}
                          onChange={(e) => setOfferDiscount(e.target.value)}
                          placeholder="Ex.: 15% OFF"
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={offerDesc}
                        onChange={(e) => setOfferDesc(e.target.value)}
                        placeholder="Descrição e regras"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                      <div className="flex gap-3 items-center">
                        <input
                          type="date"
                          value={offerStart}
                          onChange={(e) => setOfferStart(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                        />
                        <input
                          type="date"
                          value={offerEnd}
                          onChange={(e) => setOfferEnd(e.target.value)}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark rounded-lg cursor-pointer"
                        >
                          Publicar oferta
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Oferta</th>
                            <th className="px-4 py-3 font-semibold">Empresa</th>
                            <th className="px-4 py-3 font-semibold">Condição</th>
                            <th className="px-4 py-3 font-semibold">Situação</th>
                            <th className="px-4 py-3 font-semibold text-right">Resgates</th>
                            <th className="px-4 py-3 font-semibold">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {offers.map((o) => (
                            <tr key={o.id}>
                              <td className="px-4 py-3 font-medium text-slate-900">{o.title}</td>
                              <td className="px-4 py-3 text-slate-600">{o.companyName}</td>
                              <td className="px-4 py-3 font-semibold text-brand-accent">
                                {o.discountLabel}
                              </td>
                              <td className="px-4 py-3">
                                {OFFER_STATUS_LABELS[o.status] || o.status}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                {o.redemptionsCount || 0}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {o.status !== 'published' && (
                                    <button
                                      type="button"
                                      onClick={() => handleReviewOffer(o.id, 'published')}
                                      className="px-2.5 py-1 bg-brand-accent hover:bg-brand-accent-dark text-white rounded font-medium cursor-pointer"
                                    >
                                      Publicar
                                    </button>
                                  )}
                                  {o.status === 'published' && (
                                    <button
                                      type="button"
                                      onClick={() => handleReviewOffer(o.id, 'suspended')}
                                      className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded font-medium cursor-pointer"
                                    >
                                      Suspender
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {section === 'users' && (
                <div className="space-y-4">
                  {(currentUser.role === 'superadmin' ||
                    currentUser.role === 'association_admin') && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewUser(!showNewUser);
                          setUserFormError('');
                        }}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                      >
                        {showNewUser ? 'Cancelar' : 'Cadastrar operador ou administrador'}
                      </button>
                    </div>
                  )}

                  {showNewUser && (
                    <form
                      onSubmit={handleCreateAdminUser}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <h3 className="text-sm font-bold text-slate-900">
                        Novo operador ou administrador da Associação
                      </h3>
                      {userFormError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3">
                          {userFormError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Nome completo"
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          required
                          value={newUserLogin}
                          onChange={(e) => setNewUserLogin(e.target.value)}
                          placeholder="E-mail ou usuário"
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Senha (mín. 6 caracteres)"
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="operator">Operador</option>
                          <option value="commercial_manager">Gestor Comercial</option>
                          <option value="association_admin">Administrador da Associação</option>
                          {currentUser.role === 'superadmin' && (
                            <>
                              <option value="platform_admin">Administrador da Plataforma</option>
                              <option value="superadmin">Superadministrador Técnico</option>
                            </>
                          )}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark rounded-lg cursor-pointer"
                      >
                        Salvar operador
                      </button>
                    </form>
                  )}

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h2 className="text-base font-bold text-slate-900">
                        Usuários e Permissões ({users.length})
                      </h2>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Buscar nome ou e-mail..."
                          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => loadAll('users')}
                          className="px-3 py-1.5 text-xs font-semibold bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg cursor-pointer"
                        >
                          Buscar
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Nome</th>
                            <th className="px-4 py-3 font-semibold">E-mail / Login</th>
                            <th className="px-4 py-3 font-semibold">Vínculo</th>
                            <th className="px-4 py-3 font-semibold">Papel</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.map((u) => {
                            const isProtectedMaster = u.role === 'superadmin';
                            const canEditRole =
                              u.id !== currentUser.id &&
                              (!isProtectedMaster || currentUser.role === 'superadmin');
                            return (
                              <tr key={u.id}>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {u.fullName}
                                </td>
                                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                                <td className="px-4 py-3 text-slate-500">
                                  {u.isMember ? `Associado ${u.memberCode || ''}` : 'Comunidade'}
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={u.role}
                                    disabled={!canEditRole}
                                    onChange={(e) =>
                                      handleChangeUserRole(u, e.target.value as UserRole)
                                    }
                                    className="px-2 py-1 border border-slate-200 rounded bg-white disabled:bg-slate-50"
                                  >
                                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                      <option key={k} value={k}>
                                        {v}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                  {u.status === 'active' ? (
                                    <span className="text-brand-accent">Ativo</span>
                                  ) : (
                                    <span className="text-rose-700">Suspenso</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isProtectedMaster ? (
                                    <span className="text-slate-500 font-medium">
                                      Master Admin (Protegido)
                                    </span>
                                  ) : (
                                    u.id !== currentUser.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleUserStatus(u)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium cursor-pointer"
                                      >
                                        {u.status === 'active' ? 'Suspender' : 'Reativar'}
                                      </button>
                                    )
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {section === 'categories' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleCreateCategory}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                  >
                    <h2 className="text-sm font-bold text-slate-900">Nova categoria de benefícios</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Nome da categoria"
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                        placeholder="Descrição breve"
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={newCatSubs}
                        onChange={(e) => setNewCatSubs(e.target.value)}
                        placeholder="Subcategorias separadas por vírgula"
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                    >
                      Adicionar categoria
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Categoria</th>
                          <th className="px-4 py-3 font-semibold">Subcategorias</th>
                          <th className="px-4 py-3 font-semibold text-right">Ofertas ativas</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categories.map((cat) => (
                          <tr key={cat.id}>
                            <td className="px-4 py-3 font-semibold text-slate-900">{cat.name}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {cat.subcategories.join(', ') || '—'}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {cat.activeOffersCount || 0}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleToggleCategory(cat)}
                                className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                                  cat.isActive
                                    ? 'bg-emerald-50 text-brand-accent'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {cat.isActive ? 'Ativa' : 'Inativa'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {section === 'campaigns' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleCreateCampaign}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                  >
                    <h2 className="text-sm font-bold text-slate-900">
                      Nova Campanha Institucional / Comercial (sem sorteios ou prêmios)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        value={newCampTitle}
                        onChange={(e) => setNewCampTitle(e.target.value)}
                        placeholder="Nome da campanha"
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                      <input
                        type="date"
                        required
                        value={newCampStart}
                        onChange={(e) => setNewCampStart(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                      <input
                        type="date"
                        required
                        value={newCampEnd}
                        onChange={(e) => setNewCampEnd(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <input
                      type="text"
                      value={newCampAudience}
                      onChange={(e) => setNewCampAudience(e.target.value)}
                      placeholder="Público-alvo"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                    <textarea
                      rows={2}
                      required
                      value={newCampDesc}
                      onChange={(e) => setNewCampDesc(e.target.value)}
                      placeholder="Descrição e condições"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                    >
                      Publicar campanha
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {campaigns.map((ca) => (
                      <div key={ca.id} className="p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{ca.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{ca.description}</p>
                          <p className="text-xs text-slate-400 tabular-nums mt-1">
                            {ca.startDate} até {ca.endDate} · Status: {ca.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCampaignStatus(
                              ca.id,
                              ca.status === 'active' ? 'paused' : 'active',
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          {ca.status === 'active' ? 'Pausar' : 'Ativar'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === 'complaints' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">
                      Ouvidoria e Reclamações ({complaints.length})
                    </h2>
                  </div>
                  {complaints.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-500">
                      Nenhuma reclamação registrada.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {complaints.map((cm) => (
                        <div key={cm.id} className="p-5 flex items-start justify-between gap-4">
                          <div className="space-y-1 text-xs">
                            <p className="text-sm font-semibold text-slate-900">{cm.subject}</p>
                            <p className="text-slate-600">{cm.description}</p>
                            <p className="text-slate-500">
                              Empresa: {cm.companyName} · Usuário: {cm.userName} · Status:{' '}
                              <strong>{cm.status}</strong>
                            </p>
                          </div>
                          {cm.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleResolveComplaint(cm.id, 'resolved')}
                              className="px-3 py-1.5 text-xs font-semibold bg-brand-accent hover:bg-brand-accent-dark text-white rounded-lg shrink-0 cursor-pointer"
                            >
                              Marcar resolvida
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section === 'inquiries' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Solicitações de Adesão a Planos ({planInquiries.length})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Associados, familiares e indicados interessados nos planos Base, Bronze,
                        Prata e Ouro.
                      </p>
                    </div>
                  </div>
                  {planInquiries.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-500">
                      Nenhuma solicitação de adesão registrada ainda.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Protocolo</th>
                            <th className="px-4 py-3 font-semibold">Solicitante</th>
                            <th className="px-4 py-3 font-semibold">Plano e Dependentes</th>
                            <th className="px-4 py-3 font-semibold">Estimativa</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {planInquiries.map((inq) => (
                            <tr key={inq.id}>
                              <td className="px-4 py-3 font-mono font-semibold text-brand-primary whitespace-nowrap">
                                {inq.protocol}
                              </td>
                              <td className="px-4 py-3 space-y-0.5">
                                <p className="font-semibold text-slate-900">{inq.fullName}</p>
                                <p className="text-slate-500">
                                  {PLAN_AUDIENCE_LABELS[inq.audienceType]}
                                  {inq.referrerCode ? ` · Ref.: ${inq.referrerCode}` : ''}
                                </p>
                                <p className="text-slate-500">
                                  {inq.email} · {inq.phone}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-slate-700 tabular-nums">
                                <p className="font-semibold text-slate-900">{inq.planName}</p>
                                <p className="text-slate-500">
                                  {inq.dependentsCount}{' '}
                                  {inq.dependentsCount === 1 ? 'dependente' : 'dependentes'}
                                </p>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                {formatBRL(inq.estimatedMonthlyTotal)}/mês
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={inq.status}
                                  onChange={(e) =>
                                    handleUpdateInquiryStatus(
                                      inq.id,
                                      e.target.value as PlanInquiryStatus,
                                    )
                                  }
                                  className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white"
                                >
                                  {(Object.keys(PLAN_INQUIRY_STATUS_LABELS) as PlanInquiryStatus[]).map(
                                    (st) => (
                                      <option key={st} value={st}>
                                        {PLAN_INQUIRY_STATUS_LABELS[st]}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {section === 'audit' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">
                      Registro de Auditoria ({auditLogs.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Data/Hora</th>
                          <th className="px-4 py-3 font-semibold">Ator</th>
                          <th className="px-4 py-3 font-semibold">Ação</th>
                          <th className="px-4 py-3 font-semibold">Entidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-4 py-2.5 text-slate-500 tabular-nums">
                              {log.createdAt}
                            </td>
                            <td className="px-4 py-2.5 text-slate-800">
                              {log.actorName} ({log.actorRole})
                            </td>
                            <td className="px-4 py-2.5 font-mono font-semibold text-brand-primary">
                              {log.action}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {log.entityType} #{log.entityId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {section === 'settings' && brandCfg && legalCfg && smtpCfg && (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Live White Label Preview */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Pré-visualização da Identidade Institucional
                        </h2>
                        <p className="text-xs text-slate-500">
                          A marca principal pertence à Associação; a assinatura VTXMais permanece
                          exclusivamente institucional e secundária no rodapé.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBrandCfg({ ...DEFAULT_BRAND_CONFIG })}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg self-start cursor-pointer"
                      >
                        Restaurar padrão AHRMP
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <BrandLogo brand={brandCfg} variant="main" className="h-12 w-auto" />
                        <div>
                          <p
                            className="text-sm font-bold"
                            style={{
                              color: brandCfg.primaryColor,
                              fontFamily: brandCfg.fontDisplay,
                            }}
                          >
                            {brandCfg.clubName}
                          </p>
                          <p
                            className="text-xs text-slate-600"
                            style={{ fontFamily: brandCfg.fontSans }}
                          >
                            {brandCfg.institutionName} ({brandCfg.institutionAcronym})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                          style={{ backgroundColor: brandCfg.primaryColor }}
                        >
                          Botão Primário
                        </span>
                        <span
                          className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                          style={{ backgroundColor: brandCfg.accentColor }}
                        >
                          Botão Destaque
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Institutional Identity */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <h2 className="text-base font-bold text-slate-900">
                      Identidade Institucional White Label
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nome Completo do Clube
                        </label>
                        <input
                          type="text"
                          value={brandCfg.clubName}
                          onChange={(e) => setBrandCfg({ ...brandCfg, clubName: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nome Curto (Barra Superior)
                        </label>
                        <input
                          type="text"
                          value={brandCfg.shortClubName}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, shortClubName: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Instituição Principal
                        </label>
                        <input
                          type="text"
                          value={brandCfg.institutionName}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, institutionName: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Sigla Institucional (e marcador textual)
                        </label>
                        <input
                          type="text"
                          value={brandCfg.institutionAcronym}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, institutionAcronym: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Assinatura Secundária de Rodapé
                        </label>
                        <input
                          type="text"
                          value={brandCfg.partnerSignature}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, partnerSignature: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          E-mail de contato institucional
                        </label>
                        <input
                          type="text"
                          value={brandCfg.contactEmail}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, contactEmail: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={brandCfg.demoBannerEnabled}
                        onChange={(e) =>
                          setBrandCfg({ ...brandCfg, demoBannerEnabled: e.target.checked })
                        }
                      />
                      Exibir aviso de ambiente de demonstração no topo do portal
                    </label>
                  </div>

                  {/* Colors & Typography */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <h2 className="text-base font-bold text-slate-900">
                      Paleta de Cores e Tipografia Institucional
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cor Primária
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={brandCfg.primaryColor}
                            onChange={(e) => {
                              const nextPrimary = e.target.value.toUpperCase();
                              setBrandCfg({
                                ...brandCfg,
                                primaryColor: nextPrimary,
                                primaryDarkColor: darkenHexColor(nextPrimary),
                              });
                            }}
                            className="h-9 w-11 p-0.5 border border-slate-200 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandCfg.primaryColor}
                            onChange={(e) =>
                              setBrandCfg({ ...brandCfg, primaryColor: e.target.value })
                            }
                            className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Primária Escura (Hover)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={brandCfg.primaryDarkColor}
                            onChange={(e) =>
                              setBrandCfg({
                                ...brandCfg,
                                primaryDarkColor: e.target.value.toUpperCase(),
                              })
                            }
                            className="h-9 w-11 p-0.5 border border-slate-200 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandCfg.primaryDarkColor}
                            onChange={(e) =>
                              setBrandCfg({ ...brandCfg, primaryDarkColor: e.target.value })
                            }
                            className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cor de Destaque (Acento)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={brandCfg.accentColor}
                            onChange={(e) => {
                              const nextAccent = e.target.value.toUpperCase();
                              setBrandCfg({
                                ...brandCfg,
                                accentColor: nextAccent,
                                accentDarkColor: darkenHexColor(nextAccent),
                              });
                            }}
                            className="h-9 w-11 p-0.5 border border-slate-200 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandCfg.accentColor}
                            onChange={(e) =>
                              setBrandCfg({ ...brandCfg, accentColor: e.target.value })
                            }
                            className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Acento Escuro (Hover)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={brandCfg.accentDarkColor}
                            onChange={(e) =>
                              setBrandCfg({
                                ...brandCfg,
                                accentDarkColor: e.target.value.toUpperCase(),
                              })
                            }
                            className="h-9 w-11 p-0.5 border border-slate-200 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandCfg.accentDarkColor}
                            onChange={(e) =>
                              setBrandCfg({ ...brandCfg, accentDarkColor: e.target.value })
                            }
                            className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Combinação Tipográfica (Títulos + Corpo)
                      </label>
                      <select
                        value={
                          FONT_PAIRING_OPTIONS.find(
                            (opt) =>
                              opt.fontDisplay === brandCfg.fontDisplay &&
                              opt.fontSans === brandCfg.fontSans,
                          )?.id || FONT_PAIRING_OPTIONS[0].id
                        }
                        onChange={(e) => {
                          const chosen = FONT_PAIRING_OPTIONS.find((o) => o.id === e.target.value);
                          if (chosen) {
                            setBrandCfg({
                              ...brandCfg,
                              fontDisplay: chosen.fontDisplay,
                              fontSans: chosen.fontSans,
                            });
                          }
                        }}
                        className="w-full sm:max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      >
                        {FONT_PAIRING_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Logos & Favicon */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Logotipos Institucionais e Favicon
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Substitua os caminhos abaixo quando receber novas versões oficiais. Se um
                        campo estiver vazio, o portal exibe automaticamente o marcador textual da
                        sigla institucional.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Logo Principal (Hero, Login e Rodapé)
                        </label>
                        <input
                          type="text"
                          value={brandCfg.logoMainUrl}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, logoMainUrl: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Logo Compacta (Cabeçalho Superior)
                        </label>
                        <input
                          type="text"
                          value={brandCfg.logoCompactUrl}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, logoCompactUrl: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Símbolo / Ícone Reduzido
                        </label>
                        <input
                          type="text"
                          value={brandCfg.logoIconUrl}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, logoIconUrl: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Favicon do Navegador
                        </label>
                        <input
                          type="text"
                          value={brandCfg.faviconUrl}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, faviconUrl: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Imagem Principal do Topo (Hero — Lado Direito)
                        </label>
                        <input
                          type="text"
                          value={brandCfg.heroImageUrl}
                          onChange={(e) =>
                            setBrandCfg({ ...brandCfg, heroImageUrl: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SMTP Placeholder */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Provedor de E-mail (SMTP — Dados Fictícios para Inserção Futura)
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Estrutura preparada para inserir o servidor SMTP verdadeiro após aprovação
                        da diretoria. Não realiza disparos automáticos enquanto estiver em modo
                        demonstrativo.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Servidor SMTP (Host)
                        </label>
                        <input
                          type="text"
                          value={smtpCfg.host}
                          onChange={(e) => setSmtpCfg({ ...smtpCfg, host: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Porta SMTP
                        </label>
                        <input
                          type="number"
                          value={smtpCfg.port}
                          onChange={(e) =>
                            setSmtpCfg({ ...smtpCfg, port: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Usuário SMTP
                        </label>
                        <input
                          type="text"
                          value={smtpCfg.username}
                          onChange={(e) => setSmtpCfg({ ...smtpCfg, username: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          E-mail remetente
                        </label>
                        <input
                          type="email"
                          value={smtpCfg.fromEmail}
                          onChange={(e) => setSmtpCfg({ ...smtpCfg, fromEmail: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                  >
                    Salvar Configurações Institucionais
                  </button>
                </form>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

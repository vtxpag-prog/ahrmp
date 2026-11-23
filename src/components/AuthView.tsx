import { KeyRound, ShieldCheck, Store, UserCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../lib/api.ts';
import type { AuthUser, BrandConfig, Category } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface AuthViewProps {
  brand: BrandConfig;
  categories: Category[];
  initialTab?: 'login' | 'register' | 'recovery' | 'admin';
  onAuthSuccess: (user: AuthUser) => void;
  onOpenLegalModal: (mode: 'terms' | 'privacy') => void;
}

export function AuthView({
  brand,
  categories,
  initialTab = 'login',
  onAuthSuccess,
  onOpenLegalModal,
}: AuthViewProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'recovery' | 'admin'>(initialTab);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [accountType, setAccountType] = useState<'consumer' | 'partner_company'>('consumer');
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [memberCode, setMemberCode] = useState('');
  const [commEmail, setCommEmail] = useState(true);
  const [commWhatsapp, setCommWhatsapp] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Partner company extra fields
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [companyCategoryId, setCompanyCategoryId] = useState<number>(categories[0]?.id || 1);
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [companyDesc, setCompanyDesc] = useState('');

  // Recovery form
  const [recEmail, setRecEmail] = useState('');
  const [recToken, setRecToken] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [demoResetTokenPreview, setDemoResetTokenPreview] = useState('');

  // Admin status & claim
  const [adminStatus, setAdminStatus] = useState<{
    adminClaimed: boolean;
    envPasscodeConfigured: boolean;
  } | null>(null);
  const [adminClaimName, setAdminClaimName] = useState('');
  const [adminClaimEmail, setAdminClaimEmail] = useState('');
  const [adminClaimPassword, setAdminClaimPassword] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    apiRequest<{ adminClaimed: boolean; envPasscodeConfigured: boolean }>('/api/auth/admin-status')
      .then(setAdminStatus)
      .catch(() => {});
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoType: 'consumer' | 'partner_a') {
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ demoType }),
      });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Erro no acesso demonstrativo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email: regEmail,
          phone,
          password: regPassword,
          accountType,
          isMember,
          memberCode: isMember ? memberCode : undefined,
          communicationEmail: commEmail,
          communicationWhatsapp: commWhatsapp,
          termsAccepted,
          company:
            accountType === 'partner_company'
              ? {
                  tradeName,
                  legalName,
                  categoryId: companyCategoryId,
                  neighborhood,
                  address,
                  city: 'Piracicaba - SP',
                  description: companyDesc,
                }
              : undefined,
        }),
      });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await apiRequest<{
        message: string;
        demoResetToken?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: recEmail }),
      });
      setSuccessMsg(res.message);
      if (res.demoResetToken) {
        setDemoResetTokenPreview(res.demoResetToken);
        setRecToken(res.demoResetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: recEmail,
          token: recToken,
          newPassword: recNewPassword,
        }),
      });
      setSuccessMsg(res.message);
      setDemoResetTokenPreview('');
      setRecToken('');
      setRecNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimAdmin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/auth/claim-admin', {
        method: 'POST',
        body: JSON.stringify({
          fullName: adminClaimName,
          email: adminClaimEmail,
          password: adminClaimPassword,
          role: 'association_admin',
        }),
      });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Erro ao configurar acesso administrativo.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasscodeLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: AuthUser }>('/api/auth/admin-passcode-login', {
        method: 'POST',
        body: JSON.stringify({ passcode: adminPasscode }),
      });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Código inválido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Institutional Auth Header */}
        <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-4">
            <BrandLogo brand={brand} variant="main" className="h-12 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">{brand.clubName}</h1>
              <p className="text-xs text-slate-600">{brand.institutionName}</p>
            </div>
          </div>
          <span className="text-xs text-slate-500">Operação tecnológica {brand.techPartnerName}</span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'login', label: 'Entrar' },
            { id: 'register', label: 'Criar Conta' },
            { id: 'recovery', label: 'Recuperar Senha' },
            { id: 'admin', label: 'Administração' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id as any);
                setError('');
                setSuccessMsg('');
              }}
              className={`px-5 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === item.id
                  ? 'border-brand-primary text-brand-primary bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-lg p-3.5">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm rounded-lg p-3.5">
              {successMsg}
            </div>
          )}

          {tab === 'login' && (
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail ou usuário cadastrado
                  </label>
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com.br ou admin"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Autenticando...' : 'Entrar no Clube'}
                </button>
              </form>

              <div className="pt-5 border-t border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-700">
                  Acesso rápido para demonstração institucional (dados ilustrativos):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDemoLogin('consumer')}
                    className="p-3 text-left border border-slate-200 hover:border-brand-primary rounded-lg transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <UserCheck className="w-5 h-5 text-brand-accent shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Consumidor Demo</p>
                      <p className="text-xs text-slate-500">Explorar cupons e histórico</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDemoLogin('partner_a')}
                    className="p-3 text-left border border-slate-200 hover:border-brand-primary rounded-lg transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Store className="w-5 h-5 text-brand-primary shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Empresa Parceira Demo</p>
                      <p className="text-xs text-slate-500">Validar QR Code e ofertas</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAccountType('consumer')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    accountType === 'consumer'
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Consumidor / Associado
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('partner_company')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    accountType === 'partner_company'
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Empresa Parceira
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(19) 99999-0000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com.br"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Senha (mínimo 8 caracteres) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Crie uma senha segura"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {accountType === 'consumer' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMember}
                      onChange={(e) => setIsMember(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Sou associado da {brand.institutionAcronym} (informação opcional para ações prioritárias)
                  </label>
                  {isMember && (
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Código ou matrícula associativa (opcional)
                      </label>
                      <input
                        type="text"
                        value={memberCode}
                        onChange={(e) => setMemberCode(e.target.value)}
                        placeholder="Ex.: AHRMP-0000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {accountType === 'partner_company' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-brand-primary">
                    Dados do estabelecimento (sujeito à aprovação da Associação)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nome comercial *
                      </label>
                      <input
                        type="text"
                        required
                        value={tradeName}
                        onChange={(e) => setTradeName(e.target.value)}
                        placeholder="Nome fantasia"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Categoria de atuação *
                      </label>
                      <select
                        value={companyCategoryId}
                        onChange={(e) => setCompanyCategoryId(Number(e.target.value))}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Razão social (opcional)
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Ex.: Centro"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Endereço completo
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua, número — Piracicaba/SP"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Descrição comercial
                    </label>
                    <textarea
                      rows={2}
                      value={companyDesc}
                      onChange={(e) => setCompanyDesc(e.target.value)}
                      placeholder="Descreva os serviços ou produtos oferecidos..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2.5 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commEmail}
                    onChange={(e) => setCommEmail(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Desejo receber novidades de benefícios por e-mail
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commWhatsapp}
                    onChange={(e) => setCommWhatsapp(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Autorizo comunicações informativas via WhatsApp
                </label>
                <label className="flex items-start gap-2 pt-2 border-t border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="rounded border-slate-300 mt-0.5"
                  />
                  <span>
                    Li e concordo com os{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalModal('terms')}
                      className="text-brand-primary font-semibold hover:underline cursor-pointer"
                    >
                      Termos de Uso
                    </button>{' '}
                    e a{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalModal('privacy')}
                      className="text-brand-primary font-semibold hover:underline cursor-pointer"
                    >
                      Política de Privacidade (LGPD)
                    </button>
                    . *
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading
                  ? 'Registrando...'
                  : accountType === 'partner_company'
                    ? 'Enviar Cadastro Empresarial'
                    : 'Concluir Cadastro Gratuito'}
              </button>
            </form>
          )}

          {tab === 'recovery' && (
            <div className="space-y-6">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Informe o e-mail cadastrado. Enquanto o provedor SMTP estiver em modo
                  demonstrativo (aguardando inserção das credenciais definitivas após aprovação),
                  o código temporário será exibido na tela para validação do fluxo.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    placeholder="E-mail da conta"
                    className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    Solicitar código
                  </button>
                </div>
              </form>

              {demoResetTokenPreview && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                  <strong>Modo Demonstrativo (SMTP pendente):</strong> Código temporário gerado:{' '}
                  <span className="font-mono font-bold">{demoResetTokenPreview}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">Redefinir senha</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={recToken}
                    onChange={(e) => setRecToken(e.target.value)}
                    placeholder="Código de recuperação"
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={recNewPassword}
                    onChange={(e) => setRecNewPassword(e.target.value)}
                    placeholder="Nova senha (mín. 8 caracteres)"
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark rounded-lg cursor-pointer"
                >
                  Confirmar nova senha
                </button>
              </form>
            </div>
          )}

          {tab === 'admin' && (
            <div className="space-y-6">
              {adminStatus && !adminStatus.adminClaimed && !adminStatus.envPasscodeConfigured ? (
                <form onSubmit={handleClaimAdmin} className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-brand-primary">
                      <ShieldCheck className="w-5 h-5" />
                      Configuração Inicial do Administrador da Associação
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Por segurança, nenhuma senha administrativa é gravada no código-fonte. Defina
                      agora o primeiro acesso administrativo da Diretoria AHRMP. Após configurado,
                      este formulário é bloqueado automaticamente.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do responsável administrativo *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminClaimName}
                      onChange={(e) => setAdminClaimName(e.target.value)}
                      placeholder="Ex.: Diretoria AHRMP"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail administrativo *
                    </label>
                    <input
                      type="email"
                      required
                      value={adminClaimEmail}
                      onChange={(e) => setAdminClaimEmail(e.target.value)}
                      placeholder="admin@ahrmp.org.br"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Senha administrativa (mín. 8 caracteres) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={adminClaimPassword}
                      onChange={(e) => setAdminClaimPassword(e.target.value)}
                      placeholder="Defina uma senha forte"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                  >
                    Ativar Acesso Administrativo Inicial
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {adminStatus?.envPasscodeConfigured && (
                    <form
                      onSubmit={handlePasscodeLogin}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-primary">
                        <KeyRound className="w-4 h-4" />
                        Acesso com código administrativo configurado no servidor
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          required
                          value={adminPasscode}
                          onChange={(e) => setAdminPasscode(e.target.value)}
                          placeholder="Código administrativo"
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                        >
                          Acessar
                        </button>
                      </div>
                    </form>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-xs text-slate-600">
                      Entre com seu usuário/e-mail e senha de administrador, gestor comercial ou operador.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Usuário ou e-mail administrativo
                      </label>
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin ou seuemail@exemplo.com.br"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Senha
                      </label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                    >
                      Acessar Painel Administrativo
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

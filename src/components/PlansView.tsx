import {
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  MEMBERSHIP_PLANS,
  PARTNERSHIP_STEPS,
  PLAN_AUDIENCE_LABELS,
  PLAN_COMPARISON_ROWS,
  calculatePlanMonthlyTotal,
  formatBRL,
  getPlanById,
} from '../config/plans.ts';
import { apiRequest } from '../lib/api.ts';
import type { AuthUser, BrandConfig, PlanAudienceType, PlanId, PlanInquiry } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface PlansViewProps {
  brand: BrandConfig;
  user: AuthUser | null;
  onNavigateCatalog: () => void;
  onNavigateAuth: (tab?: 'login' | 'register') => void;
  onOpenLegalModal: (mode: 'terms' | 'privacy' | 'about') => void;
}

export function PlansView({
  brand,
  user,
  onNavigateCatalog,
  onNavigateAuth,
  onOpenLegalModal,
}: PlansViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('prata');
  const [dependentsCount, setDependentsCount] = useState<number>(1);
  const [focusView, setFocusView] = useState<'members' | 'entity'>('members');

  // Adhesion inquiry form state
  const [audienceType, setAudienceType] = useState<PlanAudienceType>(
    user?.isMember ? 'associado' : 'indicado',
  );
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email && user.email.includes('@') ? user.email : '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [referrerCode, setReferrerCode] = useState(user?.memberCode || '');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedInquiry, setSubmittedInquiry] = useState<PlanInquiry | null>(null);

  const formSectionRef = useRef<HTMLElement | null>(null);
  const entitySectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.fullName);
      if (user.email.includes('@')) {
        setEmail((prev) => prev || user.email);
      }
      setPhone((prev) => prev || user.phone);
      if (user.isMember) {
        setAudienceType('associado');
        if (user.memberCode) setReferrerCode((prev) => prev || user.memberCode || '');
      }
    }
  }, [user]);

  const activePlan = getPlanById(selectedPlanId) || MEMBERSHIP_PLANS[2];
  const estimatedTotal = calculatePlanMonthlyTotal(activePlan.id, dependentsCount);

  function handleSelectPlanForAdhesion(planId: PlanId) {
    setSelectedPlanId(planId);
    setSubmittedInquiry(null);
    setErrorMsg('');
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSwitchAudienceFocus(next: 'members' | 'entity') {
    setFocusView(next);
    if (next === 'entity') {
      entitySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function handleSubmitInquiry(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ inquiry: PlanInquiry; message: string }>(
        '/api/public/plan-inquiries',
        {
          method: 'POST',
          body: JSON.stringify({
            planId: selectedPlanId,
            audienceType,
            fullName,
            email,
            phone,
            dependentsCount,
            referrerCode,
            notes,
          }),
        },
      );
      setSubmittedInquiry(res.inquiry);
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível registrar a solicitação de adesão.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-16 pb-16">
      {/* Plans Hero Header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="font-semibold text-brand-primary">{brand.institutionAcronym}</span>
                <span aria-hidden="true">·</span>
                <span>Planos de Adesão para Associados e Indicados</span>
                <span aria-hidden="true">·</span>
                <span>Operação {brand.techPartnerName}</span>
              </div>

              <h1
                className="font-display font-bold text-slate-900 tracking-tight leading-[1.12] max-w-3xl"
                style={{ fontSize: 'clamp(2rem, 3.3vw, 2.85rem)', textWrap: 'balance' }}
              >
                Mais do que descontos: proteção, economia e prêmios para você e sua família.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                Escolha o nível de adesão ideal para o seu orçamento — de{' '}
                <strong className="text-slate-900 tabular-nums">R$ 12,00/mês</strong> a{' '}
                <strong className="text-slate-900 tabular-nums">R$ 99,90/mês</strong> — com
                inclusão livre de dependentes, familiares e indicados sem burocracia.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectPlanForAdhesion(selectedPlanId)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Solicitar adesão agora
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateCatalog}
                  className="px-5 py-2.5 text-sm font-semibold text-brand-primary bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explorar catálogo gratuito
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col lg:items-end justify-end gap-3">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-end">
                <button
                  type="button"
                  onClick={() => handleSwitchAudienceFocus('members')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    focusView === 'members'
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Associados e Indicados
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchAudienceFocus('entity')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    focusView === 'entity'
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Para a Associação
                </button>
              </div>
              <p className="text-xs text-slate-500 lg:text-right leading-relaxed max-w-xs">
                O catálogo básico de descontos segue gratuito; os planos abaixo ampliam a cobertura
                para telemedicina, assistências e sorteios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Membership Plan Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-brand-accent mb-1">Nossa Oferta</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Escolha o plano que melhor cabe na sua vida
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md">
            Comece pelo nível essencial e evolua quando quiser. Cônjuge, filhos, pais e indicados
            podem participar sem limite de quantidade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <article
                key={plan.id}
                className={`bg-white rounded-xl p-6 flex flex-col justify-between transition-colors ${
                  plan.isFeatured
                    ? 'border-2 border-brand-primary'
                    : isSelected
                      ? 'border border-brand-accent'
                      : 'border border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-brand-accent">{plan.tierSubtitle}</span>
                      {plan.featuredLabel && (
                        <span className="font-semibold text-brand-primary">
                          {plan.featuredLabel}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed min-h-[2.5rem]">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-bold text-slate-900 tabular-nums">
                        {formatBRL(plan.holderMonthlyPrice)}
                      </span>
                      <span className="text-xs text-slate-500">/mês (Titular)</span>
                    </div>
                    <p className="text-xs font-medium text-brand-primary tabular-nums">
                      Dependente: {plan.dependentPriceLabel}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {plan.inheritanceLabel && (
                      <p className="text-xs font-semibold text-slate-800">
                        {plan.inheritanceLabel}
                      </p>
                    )}
                    <ul className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectPlanForAdhesion(plan.id)}
                    className={`w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      plan.isFeatured || isSelected
                        ? 'bg-brand-primary hover:bg-brand-primary-dark text-white'
                        : 'bg-slate-100 hover:bg-brand-primary hover:text-white text-brand-primary'
                    }`}
                  >
                    Selecionar {plan.name}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Interactive Family Simulator & Dependents Summary */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-accent">
              <Users className="w-4 h-4" />
              <span>Inclusão de Dependentes e Familiares</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Simule o investimento mensal para toda a família
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              No <strong>Plano Base</strong>, incluir quem você ama custa apenas{' '}
              <strong className="tabular-nums">R$ 6,00/mês</strong> por pessoa. Nos planos Bronze,
              Prata e Ouro, cada dependente usufrui de toda a proteção por{' '}
              <strong className="tabular-nums">+ R$ 12,00/mês</strong> — sem limite de quantidade
              para cônjuge, filhos, pais e familiares.
            </p>

            <div className="pt-2 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Plano</th>
                    <th className="py-2 pr-4 font-semibold">Titular</th>
                    <th className="py-2 font-semibold">Por Dependente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {MEMBERSHIP_PLANS.map((plan) => (
                    <tr key={plan.id}>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">{plan.name}</td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {formatBRL(plan.holderMonthlyPrice)}/mês
                      </td>
                      <td className="py-2.5 font-medium text-brand-primary tabular-nums">
                        {plan.dependentPriceLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Escolha o plano para simular
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MEMBERSHIP_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                      selectedPlanId === plan.id
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-brand-primary'
                    }`}
                  >
                    {plan.name.replace('Plano ', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Quantidade de dependentes adicionais
                </p>
                <p className="text-xs text-slate-500">
                  Cônjuge, filhos, pais ou familiares ({activePlan.dependentPriceLabel} cada)
                </p>
              </div>
              <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-2 py-1 self-start">
                <button
                  type="button"
                  onClick={() => setDependentsCount((c) => Math.max(0, c - 1))}
                  className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label="Reduzir dependentes"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-slate-900 tabular-nums w-6 text-center">
                  {dependentsCount}
                </span>
                <button
                  type="button"
                  onClick={() => setDependentsCount((c) => Math.min(25, c + 1))}
                  className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label="Adicionar dependente"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">
                  1 titular ({formatBRL(activePlan.holderMonthlyPrice)}) + {dependentsCount}{' '}
                  {dependentsCount === 1 ? 'dependente' : 'dependentes'} (
                  {formatBRL(dependentsCount * activePlan.dependentMonthlyPrice)})
                </p>
                <p className="font-display text-2xl font-bold text-brand-primary tabular-nums mt-0.5">
                  {formatBRL(estimatedTotal)}
                  <span className="text-xs font-sans font-normal text-slate-500">/mês total</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectPlanForAdhesion(activePlan.id)}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Aderir com esta simulação
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Side-by-Side Comparison Matrix */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Comparativo completo dos planos
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Transparência em todas as coberturas, limites de assistência e benefícios incluídos.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <th className="py-3.5 px-5 w-1/5">Benefício / Cobertura</th>
                  {MEMBERSHIP_PLANS.map((plan) => (
                    <th key={plan.id} className="py-3.5 px-4 w-1/5 text-brand-primary">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {PLAN_COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5 font-semibold text-slate-900">{row.label}</td>
                    <td className="py-3 px-4 tabular-nums">{row.values.base}</td>
                    <td className="py-3 px-4 tabular-nums">{row.values.bronze}</td>
                    <td className="py-3 px-4 tabular-nums font-medium text-slate-900">
                      {row.values.prata}
                    </td>
                    <td className="py-3 px-4 tabular-nums">{row.values.ouro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Step-by-Step + Associates vs. Entity Value */}
      <section
        ref={entitySectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10"
      >
        <div>
          <p className="text-xs font-semibold text-brand-accent mb-1">Modelo de Funcionamento</p>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Como funciona na prática — passo a passo
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {PARTNERSHIP_STEPS.map((item) => (
            <div
              key={item.step}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-2"
            >
              <p className="font-mono text-xs font-semibold text-brand-primary tabular-nums">
                {item.step}.
              </p>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Vantagens para associados, familiares e indicados
            </h3>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <span>
                  Opções acessíveis para todos os bolsos, de{' '}
                  <span className="tabular-nums font-medium">R$ 12,00</span> a{' '}
                  <span className="tabular-nums font-medium">R$ 99,90/mês</span>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <span>
                  Inclusão de dependentes sem limite de quantidade com economia real para toda a
                  família.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <span>
                  Economia no comércio, telemedicina, assistências e participação em sorteios em um
                  só lugar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <span>
                  Flexibilidade para iniciar no plano simples e evoluir de nível a qualquer momento,
                  com acesso digital pelo celular.
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6 bg-brand-primary text-white rounded-xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Modelo de Parceria Institucional · {brand.institutionAcronym} & {brand.techPartnerName}</span>
            </div>
            <h3 className="font-display text-lg font-bold">
              O que a Associação ganha com os planos de adesão
            </h3>
            <ul className="space-y-3 text-sm text-slate-200">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Comissão recorrente de 20% sobre cada vida ativa:</strong>{' '}
                  tanto titulares quanto dependentes contam mensalmente enquanto permanecerem ativos.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Zero investimento inicial e zero risco:</strong> sem
                  custo operacional para a entidade e pagamento mensal com relatório detalhado de
                  adesões.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Suporte completo pela {brand.techPartnerName}:</strong>{' '}
                  atendimento integral ao associado, materiais de divulgação prontos e painel de
                  acompanhamento.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Adhesion / Interest Request Form */}
      <section ref={formSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold text-brand-accent">Adesão e Atendimento</p>
              <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                Solicite a adesão ou tire dúvidas sobre o plano escolhido
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Preencha seus dados para registrar seu interesse como associado {brand.institutionAcronym},
                familiar ou indicado. Nossa equipe operacional confirmará os detalhes e a inclusão
                dos dependentes.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                <p className="text-xs text-slate-500">Resumo selecionado</p>
                <p className="text-base font-bold text-brand-primary">
                  {activePlan.name} — {activePlan.tierSubtitle}
                </p>
                <div className="text-xs text-slate-600 space-y-1 tabular-nums">
                  <p>Titular: {formatBRL(activePlan.holderMonthlyPrice)}/mês</p>
                  <p>
                    Dependentes: {dependentsCount} ({activePlan.dependentPriceLabel} cada)
                  </p>
                </div>
                <p className="pt-2 border-t border-slate-200 text-sm font-bold text-slate-900 tabular-nums">
                  Estimativa mensal: {formatBRL(estimatedTotal)}/mês
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              {submittedInquiry ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-brand-accent shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">
                        Solicitação de adesão registrada
                      </h3>
                      <p className="text-sm text-slate-700">
                        Protocolo de acompanhamento:{' '}
                        <strong className="font-mono text-brand-primary">
                          {submittedInquiry.protocol}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-lg p-4 text-xs text-slate-700 space-y-1.5">
                    <p>
                      <strong>Plano:</strong> {submittedInquiry.planName}
                    </p>
                    <p>
                      <strong>Vínculo:</strong>{' '}
                      {PLAN_AUDIENCE_LABELS[submittedInquiry.audienceType]}
                    </p>
                    <p className="tabular-nums">
                      <strong>Dependentes informados:</strong> {submittedInquiry.dependentsCount}{' '}
                      · <strong>Estimativa mensal:</strong>{' '}
                      {formatBRL(submittedInquiry.estimatedMonthlyTotal)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {!user && (
                      <button
                        type="button"
                        onClick={() => onNavigateAuth('register')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Criar conta gratuita no Clube agora
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSubmittedInquiry(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Enviar outra solicitação
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitInquiry} className="space-y-4">
                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg px-4 py-3">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plano desejado
                      </label>
                      <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value as PlanId)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-primary"
                      >
                        {MEMBERSHIP_PLANS.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} — {formatBRL(plan.holderMonthlyPrice)}/mês
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Perfil de participação
                      </label>
                      <select
                        value={audienceType}
                        onChange={(e) => setAudienceType(e.target.value as PlanAudienceType)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-primary"
                      >
                        <option value="associado">
                          Associado {brand.institutionAcronym}
                        </option>
                        <option value="familiar">Familiar / Dependente de Associado</option>
                        <option value="indicado">Indicado por Associado</option>
                      </select>
                    </div>
                  </div>

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
                        placeholder="Seu nome completo"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone ou WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(19) 99999-0000"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail para contato
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com.br"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dependentes
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={dependentsCount}
                        onChange={(e) =>
                          setDependentsCount(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código do associado ou nome de quem indicou (opcional)
                    </label>
                    <input
                      type="text"
                      value={referrerCode}
                      onChange={(e) => setReferrerCode(e.target.value)}
                      placeholder={`Ex.: matrícula ${brand.institutionAcronym} ou nome do associado`}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observações ou dúvidas (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Informe melhor horário para contato ou detalhes sobre os dependentes."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                      Ao enviar, seus dados serão usados apenas para atendimento da solicitação
                      conforme a LGPD.
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {submitting ? 'Registrando...' : 'Solicitar adesão ao plano'}
                    </button>
                  </div>
                </form>
              )}
            </div>
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

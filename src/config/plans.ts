import type { PlanAudienceType, PlanId, PlanInquiryStatus } from '../types.ts';

export interface MembershipPlan {
  id: PlanId;
  name: string;
  tierSubtitle: string;
  tagline: string;
  holderMonthlyPrice: number;
  dependentMonthlyPrice: number;
  dependentPriceLabel: string;
  inheritanceLabel: string | null;
  isFeatured?: boolean;
  featuredLabel?: string;
  features: string[];
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'base',
    name: 'Plano Base',
    tierSubtitle: 'Acesso Gratuito',
    tagline: 'O essencial para economizar no dia a dia com acesso digital simples e sem mensalidade.',
    holderMonthlyPrice: 0,
    dependentMonthlyPrice: 0,
    dependentPriceLabel: 'R$ 0,00/mês (Gratuito)',
    inheritanceLabel: null,
    features: [
      'Clube de Descontos Exclusivos em farmácias, supermercados, alimentação, serviços e lojas parceiras em todo o Brasil',
      'Cashback — parte do valor das compras retorna para você',
      'Sorteios mensais com oportunidade de concorrer a prêmios',
      'Acesso digital simples pelo aplicativo e carteirinha virtual',
    ],
  },
  {
    id: 'bronze',
    name: 'Plano Bronze',
    tierSubtitle: 'Essencial',
    tagline: 'Economia diária combinada com telemedicina 24h e assistências essenciais.',
    holderMonthlyPrice: 39.9,
    dependentMonthlyPrice: 12.0,
    dependentPriceLabel: '+ R$ 12,00/mês',
    inheritanceLabel: 'Inclui tudo do Plano Base, mais:',
    features: [
      'Telemedicina Básica — teleconsulta com clínico geral 24h',
      'Assistência Veicular — guincho até 100 km, 2 utilizações por ano',
      'Assistência Funeral Básica',
      'Help Desk Digital — suporte remoto limitado',
      'Sorteio mensal de R$ 5.000',
    ],
  },
  {
    id: 'prata',
    name: 'Plano Prata',
    tierSubtitle: 'Proteção Completa',
    tagline: 'Cobertura ampliada para saúde, residência, veículo e capital segurado.',
    holderMonthlyPrice: 69.9,
    dependentMonthlyPrice: 12.0,
    dependentPriceLabel: '+ R$ 12,00/mês',
    inheritanceLabel: 'Inclui tudo do Plano Bronze, mais:',
    isFeatured: true,
    featuredLabel: 'Mais completo para famílias',
    features: [
      'Telemedicina Ampliada — com pediatria e orientação odontológica',
      'Assistência Veicular Completa — guincho até 150 km, 4x/ano, socorro mecânico e chaveiro',
      'Assistência Residencial Básica — chaveiro, hidráulica e elétrica',
      'Urgência Odontológica 24h',
      'Capital Segurado de R$ 10.000 em caso de morte acidental',
      'Help Desk Digital Ilimitado',
      'Cashback de até 0,5% nas compras',
      'Sorteios semanais de R$ 7.500',
    ],
  },
  {
    id: 'ouro',
    name: 'Plano Ouro',
    tierSubtitle: 'Proteção Total',
    tagline: 'Máxima proteção pessoal, familiar, residencial, veicular e saúde pet.',
    holderMonthlyPrice: 99.9,
    dependentMonthlyPrice: 12.0,
    dependentPriceLabel: '+ R$ 12,00/mês',
    inheritanceLabel: 'Inclui tudo do Plano Prata, mais:',
    features: [
      'Telemedicina Premium — psicologia, nutrição e pediatria',
      'Assistência Veicular Premium — guincho até 200 km ilimitado e carro reserva',
      'Assistência Residencial Completa — todos os serviços emergenciais',
      'Odontologia — urgência, consultas e limpeza regulares',
      'Saúde Pet — telemedicina veterinária e rede credenciada para 1 pet',
      'Capital Segurado Ampliado — R$ 15.000 + invalidez permanente',
      'Assistência Funeral Ampliada com traslado nacional',
      'Cashback de até 2% nas compras',
      'Sorteios semanais de R$ 10.000 + sorteio mensal de R$ 50.000',
    ],
  },
];

export interface PlanComparisonRow {
  label: string;
  values: Record<PlanId, string>;
}

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    label: 'Valor mensal (Titular)',
    values: {
      base: 'R$ 0,00/mês (Gratuito)',
      bronze: 'R$ 39,90/mês',
      prata: 'R$ 69,90/mês',
      ouro: 'R$ 99,90/mês',
    },
  },
  {
    label: 'Valor por dependente (sem limite)',
    values: {
      base: 'R$ 0,00/mês (Gratuito)',
      bronze: '+ R$ 12,00/mês',
      prata: '+ R$ 12,00/mês',
      ouro: '+ R$ 12,00/mês',
    },
  },
  {
    label: 'Clube de descontos e carteirinha digital',
    values: {
      base: 'Incluso (rede nacional)',
      bronze: 'Incluso (rede nacional)',
      prata: 'Incluso (rede nacional)',
      ouro: 'Incluso (rede nacional)',
    },
  },
  {
    label: 'Cashback em compras',
    values: {
      base: 'Retorno na rede parceira',
      bronze: 'Retorno na rede parceira',
      prata: 'Até 0,5% nas compras',
      ouro: 'Até 2% nas compras',
    },
  },
  {
    label: 'Sorteios de prêmios',
    values: {
      base: 'Mensais',
      bronze: 'Mensal de R$ 5.000',
      prata: 'Semanais de R$ 7.500',
      ouro: 'Semanais de R$ 10.000 + mensal de R$ 50.000',
    },
  },
  {
    label: 'Telemedicina',
    values: {
      base: '—',
      bronze: 'Clínico geral 24h',
      prata: 'Clínico, pediatria e orientação odonto',
      ouro: 'Premium: psicologia, nutrição e pediatria',
    },
  },
  {
    label: 'Assistência Veicular',
    values: {
      base: '—',
      bronze: 'Guincho até 100 km (2x/ano)',
      prata: 'Guincho 150 km (4x/ano) + mecânico e chaveiro',
      ouro: 'Guincho 200 km ilimitado + carro reserva',
    },
  },
  {
    label: 'Assistência Residencial',
    values: {
      base: '—',
      bronze: '—',
      prata: 'Básica (chaveiro, hidráulica e elétrica)',
      ouro: 'Completa (todos os serviços emergenciais)',
    },
  },
  {
    label: 'Odontologia',
    values: {
      base: '—',
      bronze: '—',
      prata: 'Urgência odontológica 24h',
      ouro: 'Urgência + consultas e limpeza regulares',
    },
  },
  {
    label: 'Capital Segurado',
    values: {
      base: '—',
      bronze: '—',
      prata: 'R$ 10.000 (morte acidental)',
      ouro: 'R$ 15.000 + invalidez permanente',
    },
  },
  {
    label: 'Assistência Funeral',
    values: {
      base: '—',
      bronze: 'Básica',
      prata: 'Básica',
      ouro: 'Ampliada com traslado nacional',
    },
  },
  {
    label: 'Saúde Pet',
    values: {
      base: '—',
      bronze: '—',
      prata: '—',
      ouro: 'Telemedicina vet + rede (1 pet)',
    },
  },
  {
    label: 'Help Desk Digital',
    values: {
      base: '—',
      bronze: 'Suporte remoto limitado',
      prata: 'Ilimitado',
      ouro: 'Ilimitado',
    },
  },
];

export const PARTNERSHIP_STEPS = [
  {
    step: '01',
    title: 'Parceria institucional formalizada',
    description:
      'Acordo firmado entre a Associação e a parceira operacional sem investimento inicial ou risco financeiro.',
  },
  {
    step: '02',
    title: 'Divulgação aos associados e indicados',
    description:
      'Apresentação conjunta dos 4 níveis de benefícios com materiais prontos para associados e convidados.',
  },
  {
    step: '03',
    title: 'Escolha e adesão simplificada',
    description:
      'Cada associado ou indicado escolhe o plano compatível com o seu orçamento e solicita adesão sem burocracia.',
  },
  {
    step: '04',
    title: 'Inclusão livre de familiares',
    description:
      'Cônjuge, filhos, pais e familiares podem ser adicionados sem limite de quantidade com tarifa fixa por pessoa.',
  },
  {
    step: '05',
    title: 'Sustentabilidade contínua da entidade',
    description:
      'A entidade acompanha adesões pelo painel e recebe 20% recorrentes sobre cada vida ativa, titulares e dependentes.',
  },
];

export const PLAN_AUDIENCE_LABELS: Record<PlanAudienceType, string> = {
  associado: 'Associado da entidade',
  familiar: 'Familiar / Dependente de associado',
  indicado: 'Indicado por associado',
};

export const PLAN_INQUIRY_STATUS_LABELS: Record<PlanInquiryStatus, string> = {
  pending: 'Aguardando contato',
  contacted: 'Em atendimento',
  active: 'Adesão ativa',
  cancelled: 'Cancelada',
};

export function getPlanById(planId: string): MembershipPlan | undefined {
  return MEMBERSHIP_PLANS.find((plan) => plan.id === planId);
}

export function calculatePlanMonthlyTotal(planId: PlanId, dependentsCount: number): number {
  const plan = getPlanById(planId);
  if (!plan) return 0;
  const safeDeps = Math.max(0, Math.floor(dependentsCount));
  return Number((plan.holderMonthlyPrice + safeDeps * plan.dependentMonthlyPrice).toFixed(2));
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

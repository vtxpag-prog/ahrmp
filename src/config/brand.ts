import type { BrandConfig, CommercialTier, LegalConfig, UserRole } from '../types.ts';

export interface FontPairingOption {
  id: string;
  label: string;
  fontDisplay: string;
  fontSans: string;
}

export const FONT_PAIRING_OPTIONS: FontPairingOption[] = [
  {
    id: 'institutional-default',
    label: 'Plus Jakarta Sans + DM Sans (Padrão Institucional)',
    fontDisplay: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    fontSans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'editorial-classic',
    label: 'Montserrat + DM Sans (Institucional Clássica)',
    fontDisplay: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
    fontSans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'modern-corporate',
    label: 'Inter + Inter (Corporativa Moderna)',
    fontDisplay: '"Inter", ui-sans-serif, system-ui, sans-serif',
    fontSans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
];

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  clubName: 'Clube de Benefícios da Associação',
  shortClubName: 'Clube AHRMP',
  institutionName: 'Associação Habitacional da Região Metropolitana de Piracicaba',
  institutionAcronym: 'AHRMP',
  partnerSignature: 'Uma iniciativa da Associação, com tecnologia e operação VTXMais.',
  techPartnerName: 'VTXMais',
  heroHeadline: 'Vantagens reais no comércio local para associados e comunidade de Piracicaba.',
  heroSubheadline:
    'Acesso gratuito a benefícios, descontos exclusivos e experiências em estabelecimentos parceiros da Região Metropolitana de Piracicaba, com apresentação digital por código ou QR Code.',
  logoMainUrl: '/assets/aistudio/Gemini_Generated_Image_2ujvlu2ujvlu2ujv_65547af2.jpeg',
  logoCompactUrl: '/assets/aistudio/Gemini_Generated_Image_2ujvlu2ujvlu2ujv_65547af2.jpeg',
  logoIconUrl: '/assets/aistudio/Gemini_Generated_Image_2ujvlu2ujvlu2ujv_65547af2.jpeg',
  faviconUrl: '/assets/aistudio/Gemini_Generated_Image_2ujvlu2ujvlu2ujv_65547af2.jpeg',
  heroImageUrl:
    '/assets/aistudio/Entre-os-destaques-estao-troca-do-piso-restauro-do-coreto-implantacao-de-playground-fonte-interativa-e-reorganizacao-viaria-1024x571_9dea45b9.jpg',
  primaryColor: '#13315C',
  primaryDarkColor: '#0D2344',
  accentColor: '#1D8A5A',
  accentDarkColor: '#156E47',
  fontDisplay: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  fontSans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  contactEmail: 'contato.demonstracao@ahrmp-exemplo.org.br',
  contactPhone: '(19) 3400-0000 (Demonstrativo)',
  contactAddress: 'Região Metropolitana de Piracicaba — SP (Endereço institucional a confirmar)',
  contactHours: 'Segunda a Sexta, das 08h30 às 17h30',
  demoBannerEnabled: true,
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(color: unknown): color is string {
  return typeof color === 'string' && HEX_COLOR_RE.test(color.trim());
}

export function darkenHexColor(hex: string, amount = 0.24): string {
  if (!isValidHexColor(hex)) return DEFAULT_BRAND_CONFIG.primaryDarkColor;
  const clean = hex.trim().slice(1);
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

export function mergeBrandConfig(partial?: Partial<BrandConfig> | null): BrandConfig {
  const merged = { ...DEFAULT_BRAND_CONFIG, ...(partial || {}) };
  return {
    ...merged,
    primaryColor: isValidHexColor(merged.primaryColor)
      ? merged.primaryColor.trim().toUpperCase()
      : DEFAULT_BRAND_CONFIG.primaryColor,
    primaryDarkColor: isValidHexColor(merged.primaryDarkColor)
      ? merged.primaryDarkColor.trim().toUpperCase()
      : darkenHexColor(merged.primaryColor || DEFAULT_BRAND_CONFIG.primaryColor),
    accentColor: isValidHexColor(merged.accentColor)
      ? merged.accentColor.trim().toUpperCase()
      : DEFAULT_BRAND_CONFIG.accentColor,
    accentDarkColor: isValidHexColor(merged.accentDarkColor)
      ? merged.accentDarkColor.trim().toUpperCase()
      : darkenHexColor(merged.accentColor || DEFAULT_BRAND_CONFIG.accentColor),
  };
}

export function applyBrandTheme(rawBrand: BrandConfig): void {
  if (typeof document === 'undefined') return;
  const brand = mergeBrandConfig(rawBrand);
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', brand.primaryColor);
  root.style.setProperty('--brand-primary-dark', brand.primaryDarkColor);
  root.style.setProperty('--brand-accent', brand.accentColor);
  root.style.setProperty('--brand-accent-dark', brand.accentDarkColor);
  root.style.setProperty('--brand-font-display', brand.fontDisplay);
  root.style.setProperty('--brand-font-sans', brand.fontSans);
  root.style.setProperty('--brand-font-mono', brand.fontMono);

  document.title = `${brand.clubName} — ${brand.institutionAcronym}`;

  const iconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (iconEl && brand.faviconUrl) {
    iconEl.href = brand.faviconUrl;
  }
}

export const DEFAULT_LEGAL_CONFIG: LegalConfig = {
  termsText: `TERMOS DE USO — CLUBE DE BENEFÍCIOS DA ASSOCIAÇÃO (AHRMP)

1. Objeto e Natureza Institucional
O Clube de Benefícios da Associação é uma iniciativa institucional da Associação Habitacional da Região Metropolitana de Piracicaba (AHRMP), estruturada e operada com tecnologia VTXMais. O acesso ao catálogo básico de benefícios é gratuito para associados e consumidores cadastrados.

2. Cadastro e Uso Pessoal
O cadastro é individual, gratuito e exige apenas dados mínimos de identificação e contato. Os benefícios, cupons e códigos QR gerados são pessoais e intransferíveis, sujeitos às regras específicas de validade, dias, horários e limites informados em cada oferta.

3. Responsabilidade pelas Ofertas
As empresas parceiras aprovadas são diretamente responsáveis pelo cumprimento das condições anunciadas nas ofertas publicadas. A Associação e a parceira tecnológica reservam-se o direito de suspender ofertas ou contas que descumpram estes Termos ou apresentem uso indevido.

4. Ambiente Demonstrativo
Registros sinalizados como demonstrativos destinam-se exclusivamente à avaliação institucional pela diretoria da Associação e não constituem vínculo comercial vigente até a efetiva contratação e aprovação dos parceiros reais.`,
  privacyText: `POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)

1. Coleta Mínima de Dados
Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o Clube de Benefícios coleta apenas os dados estritamente necessários ao funcionamento da plataforma: nome completo, e-mail, telefone, senha criptografada e, opcionalmente, informação de vínculo associativo com a AHRMP.

2. Finalidade e Minimização em Cupons
Os códigos QR emitidos para utilização nos estabelecimentos contêm apenas identificador opaco de validação no servidor, sem exposição de dados pessoais sensíveis do consumidor ao lojista.

3. Direitos dos Titulares
O titular pode atualizar seu cadastro, gerenciar preferências de comunicação (e-mail e WhatsApp) e solicitar esclarecimentos, revisão ou encerramento de conta pelos canais institucionais da Associação.`,
  retentionPolicyText:
    'Os dados cadastrais são mantidos enquanto a conta permanecer ativa. Registros de auditoria e validação de cupons são preservados pelo prazo necessário à segurança operacional e prestação de contas institucional.',
  faqItems: [
    {
      question: 'Quem pode participar do Clube de Benefícios da AHRMP?',
      answer:
        'Associados da AHRMP têm prioridade nas ações de lançamento, mas qualquer consumidor residente em Piracicaba e região pode se cadastrar gratuitamente para acessar o catálogo básico de benefícios.',
    },
    {
      question: 'O acesso ao clube tem alguma mensalidade para o consumidor?',
      answer:
        'Não. O acesso ao catálogo básico de descontos, emissão de cupons e validação por QR Code é totalmente gratuito.',
    },
    {
      question: 'Como utilizo um benefício no estabelecimento parceiro?',
      answer:
        'Escolha uma oferta publicada no catálogo, clique em "Gerar Cupom / QR Code" e apresente o código ou QR Code gerado na tela no momento do atendimento. O estabelecimento valida o código em tempo real.',
    },
    {
      question: 'Como uma empresa local pode se tornar parceira?',
      answer:
        'O responsável pelo estabelecimento pode realizar o cadastro empresarial na plataforma. Após análise e aprovação da equipe administrativa da Associação, a empresa passa a publicar suas ofertas.',
    },
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadministrador Técnico',
  platform_admin: 'Administrador da Plataforma',
  association_admin: 'Administrador da Associação',
  commercial_manager: 'Gestor Comercial',
  operator: 'Operador',
  partner_company: 'Empresa Parceira',
  consumer: 'Consumidor / Associado',
};

export const ADMIN_ROLES: UserRole[] = [
  'superadmin',
  'platform_admin',
  'association_admin',
  'commercial_manager',
  'operator',
];

export const COMMERCIAL_TIER_LABELS: Record<CommercialTier, string> = {
  essencial: 'Essencial',
  comercial: 'Comercial',
  estrategico: 'Estratégico',
  institucional: 'Institucional / Patrocinador',
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending_approval: 'Aguardando aprovação',
  published: 'Publicado',
  suspended: 'Suspenso',
  expired: 'Expirado',
};

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando aprovação',
  approved: 'Aprovada',
  correction_requested: 'Correção solicitada',
  rejected: 'Rejeitada',
  suspended: 'Suspensa',
};

export const COUPON_STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  used: 'Utilizado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

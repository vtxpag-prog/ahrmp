import { ArrowRight, Check, Landmark, ShieldCheck } from 'lucide-react';
import type { AuthUser, BrandConfig } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface AboutAhrmpViewProps {
  brand: BrandConfig;
  user: AuthUser | null;
  onNavigateCatalog: () => void;
  onNavigatePlans: () => void;
  onNavigateAuth: (tab?: 'login' | 'register') => void;
  onOpenLegalModal: (mode: 'terms' | 'privacy' | 'about') => void;
}

const VISION_OBJECTIVES = [
  'Desenvolver projetos habitacionais voltados aos servidores públicos;',
  'Estabelecer parcerias com construtoras, incorporadoras e instituições públicas e privadas;',
  'Criar uma rede de vantagens e benefícios exclusivos para os associados;',
  'Buscar alternativas de saúde acessível voltadas às necessidades do funcionalismo público;',
  'Incentivar ações de capacitação, desenvolvimento pessoal e profissional;',
  'Promover convênios e serviços que proporcionem economia e mais segurança para as famílias;',
  'Desenvolver projetos educacionais voltados aos filhos dos servidores;',
  'Estruturar iniciativas voltadas ao acolhimento, assistência e moradia para servidores aposentados e idosos;',
  'Fortalecer parcerias com municípios, instituições e empresas para ampliar o alcance das ações da entidade.',
];

export function AboutAhrmpView({
  brand,
  user,
  onNavigateCatalog,
  onNavigatePlans,
  onNavigateAuth,
  onOpenLegalModal,
}: AboutAhrmpViewProps) {
  return (
    <div className="space-y-14 pb-16">
      {/* Institutional Editorial Header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-4xl space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-semibold text-brand-primary">{brand.institutionAcronym}</span>
              <span aria-hidden="true">·</span>
              <span>Institucional</span>
              <span aria-hidden="true">·</span>
              <span>Região Metropolitana de Piracicaba</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <BrandLogo brand={brand} variant="main" className="h-16 w-auto self-start" />
              <h1
                className="font-display font-bold text-slate-900 tracking-tight leading-[1.12]"
                style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)', textWrap: 'balance' }}
              >
                Associação Habitacional da Região Metropolitana de Piracicaba
              </h1>
            </div>

            <p className="font-display text-lg sm:text-xl font-semibold text-brand-primary leading-snug max-w-3xl">
              Unindo servidores públicos para construir oportunidades, qualidade de vida e um futuro
              melhor
            </p>
          </div>
        </div>
      </section>

      {/* Asymmetric Reading Canvas + Institutional Margin Column */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Primary Reading Column */}
          <article className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-10">
            {/* Quem Somos / Origem */}
            <div className="space-y-5 max-w-prose text-[15px] sm:text-base text-slate-700 leading-[1.75]">
              <p className="first-letter:font-display first-letter:text-4xl first-letter:font-bold first-letter:text-brand-primary first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                A Associação Habitacional da Região Metropolitana de Piracicaba nasceu da convicção
                de que a força coletiva é capaz de transformar desafios em oportunidades. Criada
                para representar os interesses dos servidores públicos municipais e ampliar sua
                capacidade de conquistar benefícios por meio da união, a entidade atua com base em
                princípios de participação democrática, transparência, segurança jurídica e
                comprometimento com o bem-estar de seus associados.
              </p>

              <p>
                A associação surgiu especialmente diante das dificuldades encontradas por muitos
                servidores públicos para realizar o sonho da casa própria. Diferentemente de outros
                trabalhadores, grande parte do funcionalismo público não conta com mecanismos
                tradicionais de apoio, como o FGTS, o que torna o acesso à moradia mais complexo e
                demorado. Diante dessa realidade, a associação foi criada para buscar soluções
                inovadoras, estabelecer parcerias e desenvolver projetos que facilitem o acesso à
                habitação com segurança, planejamento e condições mais favoráveis.
              </p>

              <p>
                Mais do que uma entidade voltada à moradia, a Associação Habitacional da Região
                Metropolitana de Piracicaba tem o propósito de se tornar um verdadeiro ponto de
                convergência dos servidores públicos municipais. Um espaço de união,
                representatividade, troca de experiências e construção coletiva de oportunidades que
                contribuam para melhorar a qualidade de vida dos servidores e de suas famílias.
              </p>
            </div>

            <hr className="border-slate-200" />

            {/* Nossa visão para os próximos anos */}
            <div className="space-y-6 max-w-prose">
              <div className="space-y-3">
                <p className="font-mono text-xs font-semibold text-brand-accent tabular-nums">
                  01. Visão Institucional
                </p>
                <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                  Nossa visão para os próximos anos
                </h2>
                <p className="text-[15px] sm:text-base text-slate-700 leading-[1.75]">
                  A associação trabalha para construir uma ampla rede de benefícios e projetos
                  capazes de gerar impacto positivo no presente e no futuro. Entre seus principais
                  objetivos estão:
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-200">
                {VISION_OBJECTIVES.map((item, idx) => (
                  <li
                    key={idx}
                    className="py-3.5 flex items-start gap-3 text-sm sm:text-[15px] text-slate-800 leading-relaxed"
                  >
                    <Check className="w-4 h-4 text-brand-accent shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[15px] sm:text-base text-slate-700 leading-[1.75]">
                Nossa visão é atuar de forma inovadora e colaborativa, criando soluções que vão
                além dos modelos convencionais e que contribuam para a valorização do servidor
                público em todas as fases da vida.
              </p>
            </div>

            <hr className="border-slate-200" />

            {/* Pensando nas próximas gerações */}
            <div className="space-y-5 max-w-prose text-[15px] sm:text-base text-slate-700 leading-[1.75]">
              <div className="space-y-2">
                <p className="font-mono text-xs font-semibold text-brand-accent tabular-nums">
                  02. Futuro e Família
                </p>
                <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                  Pensando nas próximas gerações
                </h2>
              </div>

              <p>
                A associação acredita que cuidar do servidor é também cuidar de sua família. Por
                isso, seus projetos futuros abrangem não apenas a habitação, mas também iniciativas
                relacionadas à educação, saúde, assistência e desenvolvimento social.
              </p>

              <p>
                Queremos construir uma entidade sólida, capaz de gerar oportunidades para as
                crianças, oferecer mais tranquilidade aos trabalhadores da ativa e proporcionar
                dignidade e amparo aos servidores aposentados. Nossa missão é criar um ambiente onde
                as pessoas encontrem apoio, benefícios e perspectivas reais de melhoria de vida.
              </p>

              <p>
                A Associação Habitacional da Região Metropolitana de Piracicaba acredita que o
                futuro se constrói por meio da união. Ao reunir servidores públicos em torno de
                objetivos comuns, fortalecemos nossa representatividade, ampliamos nossa capacidade
                de realização e criamos caminhos para que mais famílias possam viver com segurança,
                estabilidade e qualidade de vida.
              </p>
            </div>

            {/* Closing Institutional Statement */}
            <div className="py-6 border-y border-slate-200 text-center sm:text-left">
              <p className="font-display text-lg sm:text-xl font-bold text-brand-primary tracking-tight">
                Juntos, somos mais fortes. Juntos, transformamos projetos em conquistas.
              </p>
            </div>
          </article>

          {/* Margin Reference Column */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-primary">
                <Landmark className="w-4 h-4" />
                <span>Princípios de Atuação</span>
              </div>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Governança</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    Participação democrática
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Gestão</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    Transparência e segurança jurídica
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Público</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    Servidores públicos e famílias
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Abrangência</dt>
                  <dd className="font-semibold text-slate-900 text-right">
                    Região Metropolitana de Piracicaba
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-brand-primary text-white rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Ecossistema de Vantagens {brand.institutionAcronym}</span>
              </div>
              <h3 className="font-display text-lg font-bold leading-snug">
                Participe do Clube de Benefícios e conheça os planos de adesão
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                O catálogo básico de descontos locais é gratuito para associados e comunidade.
                Planos completos ampliam a cobertura para telemedicina, assistências e família.
              </p>
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={onNavigatePlans}
                  className="w-full py-2.5 px-4 text-xs font-semibold bg-brand-accent hover:bg-brand-accent-dark text-white rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  Conhecer Planos de Adesão
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateCatalog}
                  className="w-full py-2.5 px-4 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Explorar Benefícios Locais
                </button>
                {!user && (
                  <button
                    type="button"
                    onClick={() => onNavigateAuth('register')}
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-white text-brand-primary hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Cadastrar-se Gratuitamente
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-900 text-sm">Contato Institucional</p>
              <p>{brand.contactEmail}</p>
              <p>{brand.contactPhone}</p>
              <p>{brand.contactAddress}</p>
              <p>{brand.contactHours}</p>
              <p className="pt-2 border-t border-slate-100 text-slate-500">
                {brand.partnerSignature}
              </p>
            </div>
          </aside>
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

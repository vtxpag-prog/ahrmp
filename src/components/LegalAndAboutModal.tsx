import { ShieldCheck, X } from 'lucide-react';
import type { BrandConfig, LegalConfig } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface LegalAndAboutModalProps {
  mode: 'terms' | 'privacy' | 'about' | null;
  brand: BrandConfig;
  legal: LegalConfig;
  onClose: () => void;
}

export function LegalAndAboutModal({ mode, brand, legal, onClose }: LegalAndAboutModalProps) {
  if (!mode) return null;

  const title =
    mode === 'terms'
      ? 'Termos de Uso'
      : mode === 'privacy'
        ? 'Política de Privacidade e LGPD'
        : 'Sobre a Plataforma Institucional';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-primary" />
            <h2 id="legal-modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed text-slate-700">
          {mode === 'about' ? (
            <>
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <BrandLogo brand={brand} variant="main" className="h-14 w-auto" />
                <div>
                  <p className="font-semibold text-slate-900">{brand.clubName}</p>
                  <p className="text-xs text-slate-600">{brand.institutionName}</p>
                </div>
              </div>
              <p>
                O <strong>{brand.clubName}</strong> é uma iniciativa institucional da{' '}
                <strong>{brand.institutionName} ({brand.institutionAcronym})</strong> voltada à
                valorização dos associados, ao fortalecimento do comércio de Piracicaba e região e
                ao acesso gratuito da comunidade a benefícios locais.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-slate-900">Parceria Tecnológica e Operacional</p>
                <p className="text-slate-600">{brand.partnerSignature}</p>
                <p className="text-xs text-slate-500">
                  A infraestrutura digital, o motor de validação de cupons por QR Code, o painel de
                  governança e o modelo White Label são operados em parceria com a{' '}
                  <strong>{brand.techPartnerName}</strong>, preservando integralmente a titularidade
                  institucional da Associação.
                </p>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p>
                  <strong>Contato institucional:</strong> {brand.contactEmail} · {brand.contactPhone}
                </p>
                <p>
                  <strong>Endereço:</strong> {brand.contactAddress}
                </p>
                <p>
                  <strong>Horário de atendimento:</strong> {brand.contactHours}
                </p>
              </div>
            </>
          ) : (
            <>
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                {mode === 'terms' ? legal.termsText : legal.privacyText}
              </pre>
              {mode === 'privacy' && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="font-semibold text-slate-900 mb-1">Política de Retenção de Dados</p>
                  <p className="text-xs text-slate-600">{legal.retentionPolicyText}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export type UserRole =
  | 'superadmin'
  | 'platform_admin'
  | 'association_admin'
  | 'commercial_manager'
  | 'operator'
  | 'partner_company'
  | 'consumer';

export type AccountStatus = 'active' | 'suspended';

export type CommercialTier =
  | 'essencial'
  | 'comercial'
  | 'estrategico'
  | 'institucional';

export type CompanyStatus =
  | 'pending'
  | 'approved'
  | 'correction_requested'
  | 'rejected'
  | 'suspended';

export type OfferBenefitType =
  | 'percentage'
  | 'fixed_value'
  | 'special_condition'
  | 'gift';

export type OfferStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'suspended'
  | 'expired';

export type CouponStatus = 'available' | 'used' | 'expired' | 'cancelled';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  isMember: boolean;
  memberCode: string | null;
  communicationEmail: boolean;
  communicationWhatsapp: boolean;
  emailVerified: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: string[];
  activeOffersCount?: number;
}

export interface Company {
  id: number;
  ownerUserId: number;
  tradeName: string;
  legalName: string;
  categoryId: number;
  categoryName?: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  phone: string;
  whatsapp: string;
  businessHours: string;
  website: string;
  instagram: string;
  logoUrl: string;
  coverImageUrl: string;
  responsibleName: string;
  commercialTier: CommercialTier;
  isFeatured: boolean;
  status: CompanyStatus;
  reviewNotes: string;
  isDemo: boolean;
  createdAt: string;
  activeOffersCount?: number;
}

export interface Offer {
  id: number;
  companyId: number;
  companyName?: string;
  companyNeighborhood?: string;
  companyCity?: string;
  companyIsFeatured?: boolean;
  companyIsDemo?: boolean;
  companyCommercialTier?: CommercialTier;
  categoryId: number;
  categoryName?: string;
  subcategory: string;
  title: string;
  description: string;
  benefitType: OfferBenefitType;
  discountLabel: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  validDays: string;
  validHours: string;
  restrictions: string;
  requiresScheduling: boolean;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  status: OfferStatus;
  reviewNotes: string;
  isDemo: boolean;
  createdAt: string;
  redemptionsCount?: number;
}

export interface Coupon {
  id: number;
  offerId: number;
  companyId: number;
  userId: number;
  code: string;
  qrToken: string;
  status: CouponStatus;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
  offerTitle?: string;
  discountLabel?: string;
  offerRestrictions?: string;
  companyName?: string;
  companyAddress?: string;
  companyNeighborhood?: string;
  isDemo?: boolean;
}

export interface CouponRedemption {
  id: number;
  couponId: number;
  offerId: number;
  companyId: number;
  userId: number;
  code: string;
  offerTitle: string;
  companyName: string;
  consumerFirstName?: string;
  statusSnapshot: string;
  notes: string;
  redeemedAt: string;
}

export interface Campaign {
  id: number;
  title: string;
  description: string;
  companyId: number | null;
  companyName?: string | null;
  startDate: string;
  endDate: string;
  targetAudience: string;
  conditions: string;
  imageUrl: string;
  status: 'draft' | 'active' | 'paused' | 'ended';
  isDemo: boolean;
  createdAt: string;
}

export interface Complaint {
  id: number;
  userId: number;
  userName?: string;
  companyId: number;
  companyName?: string;
  offerId: number | null;
  offerTitle?: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved';
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  actorUserId: number | null;
  actorName?: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface BrandConfig {
  clubName: string;
  shortClubName: string;
  institutionName: string;
  institutionAcronym: string;
  partnerSignature: string;
  techPartnerName: string;
  heroHeadline: string;
  heroSubheadline: string;
  logoMainUrl: string;
  logoCompactUrl: string;
  logoIconUrl: string;
  faviconUrl: string;
  heroImageUrl: string;
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
  accentDarkColor: string;
  fontDisplay: string;
  fontSans: string;
  fontMono: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactHours: string;
  demoBannerEnabled: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface LegalConfig {
  termsText: string;
  privacyText: string;
  retentionPolicyText: string;
  faqItems: FaqItem[];
}

export interface SmtpPlaceholderConfig {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  configured: boolean;
}

export interface InstitutionalBootstrap {
  brand: BrandConfig;
  legal: LegalConfig;
  categories: Category[];
  featuredCompanies: Company[];
  featuredOffers: Offer[];
  activeCampaigns: Campaign[];
}

export type PlanId = 'base' | 'bronze' | 'prata' | 'ouro';

export type PlanAudienceType = 'associado' | 'familiar' | 'indicado';

export type PlanInquiryStatus = 'pending' | 'contacted' | 'active' | 'cancelled';

export interface PlanInquiry {
  id: number;
  protocol: string;
  userId: number | null;
  planId: PlanId;
  planName: string;
  audienceType: PlanAudienceType;
  fullName: string;
  email: string;
  phone: string;
  dependentsCount: number;
  referrerCode: string;
  estimatedMonthlyTotal: number;
  notes: string;
  status: PlanInquiryStatus;
  createdAt: string;
}


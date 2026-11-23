import type { Express, NextFunction, Response } from 'express';
import { ADMIN_ROLES, mergeBrandConfig } from '../src/config/brand.ts';
import { calculatePlanMonthlyTotal, getPlanById } from '../src/config/plans.ts';
import type {
  AuthUser,
  CommercialTier,
  CompanyStatus,
  OfferStatus,
  PlanAudienceType,
  PlanInquiryStatus,
  UserRole,
} from '../src/types.ts';
import { db, recordAudit } from './db.ts';
import {
  clearSessionCookie,
  csrfProtection,
  generateCouponCode,
  generateOpaqueToken,
  getSessionTokenFromRequest,
  hasAnyRole,
  hashPassword,
  hashToken,
  isValidEmail,
  sanitizeSafeUrl,
  setSessionCookie,
  timingSafeEqualString,
  verifyPassword,
  type AuthenticatedRequest,
} from './security.ts';

function mapUserRow(row: any): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role as UserRole,
    status: row.status,
    isMember: Boolean(row.is_member),
    memberCode: row.member_code ?? null,
    communicationEmail: Boolean(row.communication_email),
    communicationWhatsapp: Boolean(row.communication_whatsapp),
    emailVerified: Boolean(row.email_verified),
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
  };
}

function mapCompanyRow(row: any) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    tradeName: row.trade_name,
    legalName: row.legal_name,
    categoryId: row.category_id,
    categoryName: row.category_name ?? undefined,
    description: row.description,
    address: row.address,
    neighborhood: row.neighborhood,
    city: row.city,
    phone: row.phone,
    whatsapp: row.whatsapp,
    businessHours: row.business_hours,
    website: row.website,
    instagram: row.instagram,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    responsibleName: row.responsible_name,
    commercialTier: row.commercial_tier as CommercialTier,
    isFeatured: Boolean(row.is_featured),
    status: row.status as CompanyStatus,
    reviewNotes: row.review_notes,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    activeOffersCount: row.active_offers_count !== undefined ? Number(row.active_offers_count) : undefined,
  };
}

function mapOfferRow(row: any) {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name ?? undefined,
    companyNeighborhood: row.company_neighborhood ?? undefined,
    companyCity: row.company_city ?? undefined,
    companyIsFeatured: row.company_is_featured !== undefined ? Boolean(row.company_is_featured) : undefined,
    companyIsDemo: row.company_is_demo !== undefined ? Boolean(row.company_is_demo) : undefined,
    companyCommercialTier: row.company_commercial_tier ?? undefined,
    categoryId: row.category_id,
    categoryName: row.category_name ?? undefined,
    subcategory: row.subcategory,
    title: row.title,
    description: row.description,
    benefitType: row.benefit_type,
    discountLabel: row.discount_label,
    imageUrl: row.image_url,
    startDate: row.start_date,
    endDate: row.end_date,
    validDays: row.valid_days,
    validHours: row.valid_hours,
    restrictions: row.restrictions,
    requiresScheduling: Boolean(row.requires_scheduling),
    usageLimitTotal: row.usage_limit_total,
    usageLimitPerUser: row.usage_limit_per_user,
    status: row.status as OfferStatus,
    reviewNotes: row.review_notes,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    redemptionsCount: row.redemptions_count !== undefined ? Number(row.redemptions_count) : undefined,
  };
}

function createSessionForUser(req: AuthenticatedRequest, res: Response, userId: number): string {
  const token = generateOpaqueToken(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    expiresAt,
  );
  setSessionCookie(req, res, token);
  return token;
}

function attachSessionUser(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = getSessionTokenFromRequest(req);
  if (!token) {
    next();
    return;
  }
  const hashed = hashToken(token);
  const row = db
    .prepare(
      `SELECT u.*, s.id as session_id, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(hashed) as any;

  if (!row) {
    next();
    return;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(hashed);
    next();
    return;
  }
  req.user = mapUserRow(row);
  req.sessionId = hashed;
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária para acessar este recurso.' });
    return;
  }
  if (req.user.status !== 'active') {
    res.status(403).json({ error: 'Sua conta encontra-se suspensa pela administração.' });
    return;
  }
  next();
}

function requireRoles(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }
    if (req.user.status !== 'active') {
      res.status(403).json({ error: 'Conta suspensa pela administração.' });
      return;
    }
    if (!hasAnyRole(req.user, roles)) {
      res.status(403).json({ error: 'Perfil sem permissão para executar esta operação.' });
      return;
    }
    next();
  };
}

function getSettingJson<T>(key: string): T {
  const row = db.prepare('SELECT value_json FROM institutional_settings WHERE key = ?').get(key) as
    | { value_json: string }
    | undefined;
  return JSON.parse(row ? row.value_json : '{}') as T;
}

function expireOutdatedCoupons(): void {
  db.prepare(`
    UPDATE coupons
    SET status = 'expired'
    WHERE status = 'available' AND datetime(expires_at) < datetime('now')
  `).run();
}

function expireOutdatedOffers(): void {
  db.prepare(`
    UPDATE offers
    SET status = 'expired', updated_at = datetime('now')
    WHERE status = 'published' AND date(end_date) < date('now')
  `).run();
}

function extractQrToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith('VTX-QR:')) {
    return trimmed.slice(7).trim();
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.t === 'string') return parsed.t.trim();
    } catch {
      // ignore invalid json
    }
  }
  return trimmed;
}

export function registerRoutes(app: Express): void {
  app.use('/api', csrfProtection);
  app.use('/api', attachSessionUser);

  // =========================================================================
  // AUTHENTICATION & FIRST-RUN ADMIN SETUP
  // =========================================================================

  app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user ?? null });
  });

  app.get('/api/auth/admin-status', (_req: AuthenticatedRequest, res: Response) => {
    const adminCount = (
      db
        .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'association_admin'")
        .get() as { c: number }
    ).c;
    const envPasscodeConfigured = Boolean(process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim());
    res.json({
      adminClaimed: adminCount > 0,
      envPasscodeConfigured,
    });
  });

  app.post('/api/auth/claim-admin', (req: AuthenticatedRequest, res: Response) => {
    if (process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim()) {
      res.status(403).json({
        error: 'Acesso administrativo protegido por código configurado no ambiente do servidor.',
      });
      return;
    }
    const { fullName, email, password, role } = req.body ?? {};
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      res.status(400).json({ error: 'Informe o nome completo do responsável administrativo.' });
      return;
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'A senha administrativa deve conter ao menos 8 caracteres.' });
      return;
    }

    const targetRole: UserRole = 'association_admin';

    const claimTx = db.transaction(() => {
      const existingAdmins = (
        db
          .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'association_admin'")
          .get() as { c: number }
      ).c;
      if (existingAdmins > 0) {
        return { conflict: true as const };
      }
      const existingEmail = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(email.trim().toLowerCase());
      if (existingEmail) {
        return { emailTaken: true as const };
      }

      const passHash = hashPassword(password);
      const info = db
        .prepare(
          `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified, is_demo)
           VALUES (?, ?, '', ?, ?, 'active', 1, 0)`,
        )
        .run(fullName.trim(), email.trim().toLowerCase(), passHash, targetRole);
      const userId = Number(info.lastInsertRowid);
      recordAudit(userId, targetRole, 'CLAIM_INITIAL_ADMIN', 'user', userId, {
        email: email.trim().toLowerCase(),
      });
      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return { user: mapUserRow(userRow) };
    });

    const result = claimTx();
    if ('conflict' in result) {
      res.status(409).json({
        error: 'O acesso administrativo inicial já foi configurado. Utilize seu e-mail e senha.',
      });
      return;
    }
    if ('emailTaken' in result) {
      res.status(409).json({ error: 'Este e-mail já está cadastrado na plataforma.' });
      return;
    }

    createSessionForUser(req, res, result.user.id);
    res.status(201).json({ user: result.user });
  });

  app.post('/api/auth/admin-passcode-login', (req: AuthenticatedRequest, res: Response) => {
    const envPasscode = process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim();
    if (!envPasscode) {
      res.status(400).json({ error: 'Código de acesso administrativo não configurado.' });
      return;
    }
    const { passcode } = req.body ?? {};
    if (typeof passcode !== 'string' || !timingSafeEqualString(passcode, envPasscode)) {
      res.status(401).json({ error: 'Código de acesso administrativo inválido.' });
      return;
    }

    let adminRow = db
      .prepare("SELECT * FROM users WHERE role = 'association_admin' ORDER BY id ASC LIMIT 1")
      .get() as any;

    if (!adminRow) {
      const info = db
        .prepare(
          `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified, is_demo)
           VALUES (?, ?, '', ?, 'association_admin', 'active', 1, 0)`,
        )
        .run('Diretoria AHRMP', 'administracao@ahrmp-institucional.org.br', hashPassword(envPasscode));
      adminRow = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    }

    const user = mapUserRow(adminRow);
    if (user.status !== 'active') {
      res.status(403).json({ error: 'Conta administrativa suspensa.' });
      return;
    }
    createSessionForUser(req, res, user.id);
    recordAudit(user.id, user.role, 'ADMIN_PASSCODE_LOGIN', 'user', user.id);
    res.json({ user });
  });

  app.post('/api/auth/register', (req: AuthenticatedRequest, res: Response) => {
    const {
      fullName,
      email,
      phone,
      password,
      accountType,
      isMember,
      memberCode,
      communicationEmail,
      communicationWhatsapp,
      termsAccepted,
      company,
    } = req.body ?? {};

    if (!termsAccepted) {
      res.status(400).json({ error: 'É obrigatório aceitar os Termos de Uso e a Política de Privacidade.' });
      return;
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      res.status(400).json({ error: 'Informe seu nome completo (mínimo 3 caracteres).' });
      return;
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'A senha deve conter no mínimo 8 caracteres.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
      return;
    }

    const role: UserRole = accountType === 'partner_company' ? 'partner_company' : 'consumer';

    if (role === 'partner_company') {
      if (!company?.tradeName || !company?.categoryId) {
        res.status(400).json({
          error: 'Para cadastro empresarial, informe o nome comercial e a categoria de atuação.',
        });
        return;
      }
    }

    const registerTx = db.transaction(() => {
      const passHash = hashPassword(password);
      const info = db
        .prepare(
          `INSERT INTO users (
            full_name, email, phone, password_hash, role, status,
            is_member, member_code, communication_email, communication_whatsapp,
            email_verified, is_demo
          ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 0, 0)`,
        )
        .run(
          fullName.trim(),
          normalizedEmail,
          typeof phone === 'string' ? phone.trim() : '',
          passHash,
          role,
          isMember ? 1 : 0,
          typeof memberCode === 'string' && memberCode.trim() ? memberCode.trim() : null,
          communicationEmail !== false ? 1 : 0,
          communicationWhatsapp ? 1 : 0,
        );
      const userId = Number(info.lastInsertRowid);

      const ipHash = hashToken(req.ip || 'unknown');
      db.prepare(
        `INSERT INTO consents (user_id, consent_type, version, accepted, ip_hash)
         VALUES (?, 'terms_and_privacy', '1.0', 1, ?)`,
      ).run(userId, ipHash);

      if (communicationEmail !== false) {
        db.prepare(
          `INSERT INTO consents (user_id, consent_type, version, accepted, ip_hash)
           VALUES (?, 'marketing_email', '1.0', 1, ?)`,
        ).run(userId, ipHash);
      }

      if (role === 'partner_company' && company) {
        db.prepare(
          `INSERT INTO companies (
            owner_user_id, trade_name, legal_name, category_id, description,
            address, neighborhood, city, phone, whatsapp, business_hours,
            website, instagram, responsible_name, commercial_tier, status, is_demo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'essencial', 'pending', 0)`,
        ).run(
          userId,
          String(company.tradeName).trim(),
          String(company.legalName || '').trim(),
          Number(company.categoryId),
          String(company.description || '').trim(),
          String(company.address || '').trim(),
          String(company.neighborhood || '').trim(),
          String(company.city || 'Piracicaba - SP').trim(),
          String(company.phone || phone || '').trim(),
          String(company.whatsapp || '').trim(),
          String(company.businessHours || '').trim(),
          sanitizeSafeUrl(company.website),
          String(company.instagram || '').trim(),
          fullName.trim(),
        );
      }

      recordAudit(userId, role, 'USER_REGISTERED', 'user', userId, {
        role,
        isMember: Boolean(isMember),
      });

      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return mapUserRow(userRow);
    });

    const user = registerTx();
    createSessionForUser(req, res, user.id);
    res.status(201).json({ user });
  });

  app.post('/api/auth/login', (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Informe e-mail ou usuário e senha.' });
      return;
    }
    const row = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.trim().toLowerCase()) as any;
    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }
    if (row.status !== 'active') {
      res.status(403).json({
        error: 'Esta conta está suspensa. Entre em contato com a administração da Associação.',
      });
      return;
    }
    const user = mapUserRow(row);
    createSessionForUser(req, res, user.id);
    recordAudit(user.id, user.role, 'USER_LOGIN', 'user', user.id);
    res.json({ user });
  });

  app.post('/api/auth/demo-login', (req: AuthenticatedRequest, res: Response) => {
    const { demoType } = req.body ?? {};
    let targetEmail = '';
    if (demoType === 'consumer') {
      targetEmail = 'consumidor.demo@ahrmp-exemplo.org.br';
    } else if (demoType === 'partner_a') {
      targetEmail = 'parceiro.demo@ahrmp-exemplo.org.br';
    } else if (demoType === 'partner_b') {
      targetEmail = 'mercado.demo@ahrmp-exemplo.org.br';
    } else {
      res.status(400).json({ error: 'Perfil de demonstração inválido.' });
      return;
    }

    const row = db
      .prepare(
        "SELECT * FROM users WHERE email = ? AND is_demo = 1 AND role IN ('consumer', 'partner_company')",
      )
      .get(targetEmail) as any;

    if (!row) {
      res.status(404).json({ error: 'Conta demonstrativa não encontrada.' });
      return;
    }
    if (row.status !== 'active') {
      res.status(403).json({ error: 'Conta demonstrativa suspensa no momento.' });
      return;
    }
    const user = mapUserRow(row);
    createSessionForUser(req, res, user.id);
    recordAudit(user.id, user.role, 'DEMO_LOGIN', 'user', user.id, { demoType });
    res.json({ user });
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res: Response) => {
    if (req.sessionId) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body ?? {};
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const row = db.prepare('SELECT id, role FROM users WHERE email = ?').get(normalizedEmail) as any;
    const smtp = getSettingJson<{ configured?: boolean }>('smtp_placeholder');

    if (!row) {
      res.json({
        ok: true,
        smtpConfigured: Boolean(smtp.configured),
        message:
          'Se o e-mail estiver cadastrado, a solicitação de recuperação foi registrada conforme a política da plataforma.',
      });
      return;
    }

    const rawToken = generateCouponCode().replace('AHRMP-', 'REC-');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.prepare(
      'INSERT INTO password_reset_requests (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    ).run(row.id, hashToken(rawToken), expiresAt);
    recordAudit(row.id, row.role, 'PASSWORD_RESET_REQUESTED', 'user', row.id);

    res.json({
      ok: true,
      smtpConfigured: Boolean(smtp.configured),
      // Only shown when SMTP is explicitly not configured yet (institutional evaluation mode)
      demoResetToken: smtp.configured ? undefined : rawToken,
      message: smtp.configured
        ? 'Enviamos as instruções de recuperação para o seu e-mail.'
        : 'Fluxo de envio SMTP ainda em modo demonstrativo (sem provedor ativo). Utilize o código de verificação gerado abaixo para concluir a demonstração da troca de senha.',
    });
  });

  app.post('/api/auth/reset-password', (req: AuthenticatedRequest, res: Response) => {
    const { email, token, newPassword } = req.body ?? {};
    if (!email || !token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({
        error: 'Informe e-mail, código de recuperação e nova senha com no mínimo 8 caracteres.',
      });
      return;
    }
    const userRow = db
      .prepare('SELECT id, role FROM users WHERE email = ?')
      .get(String(email).trim().toLowerCase()) as any;
    if (!userRow) {
      res.status(400).json({ error: 'Solicitação de recuperação inválida ou expirada.' });
      return;
    }
    const resetRow = db
      .prepare(
        `SELECT * FROM password_reset_requests
         WHERE user_id = ? AND token_hash = ? AND used_at IS NULL
         ORDER BY id DESC LIMIT 1`,
      )
      .get(userRow.id, hashToken(String(token).trim())) as any;

    if (!resetRow || new Date(resetRow.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Código de recuperação inválido ou expirado.' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
        hashPassword(newPassword),
        userRow.id,
      );
      db.prepare("UPDATE password_reset_requests SET used_at = datetime('now') WHERE id = ?").run(
        resetRow.id,
      );
      recordAudit(userRow.id, userRow.role, 'PASSWORD_RESET_COMPLETED', 'user', userRow.id);
    });
    tx();
    res.json({ ok: true, message: 'Senha atualizada com sucesso. Você já pode acessar o clube.' });
  });

  // =========================================================================
  // PUBLIC & CATALOG ROUTES
  // =========================================================================

  app.get('/api/public/bootstrap', (_req: AuthenticatedRequest, res: Response) => {
    expireOutdatedOffers();
    expireOutdatedCoupons();

    const brand = mergeBrandConfig(getSettingJson('brand'));
    const legal = getSettingJson('legal');

    const categoriesRows = db
      .prepare(
        `SELECT c.*,
           (SELECT COUNT(*) FROM offers o
            JOIN companies co ON co.id = o.company_id
            WHERE o.category_id = c.id
              AND o.status = 'published'
              AND co.status = 'approved'
              AND date(o.end_date) >= date('now')) as active_offers_count
         FROM categories c
         WHERE c.is_active = 1
         ORDER BY c.display_order ASC, c.id ASC`,
      )
      .all() as any[];

    const categories = categoriesRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      iconName: c.icon_name,
      displayOrder: c.display_order,
      isActive: Boolean(c.is_active),
      subcategories: JSON.parse(c.subcategories_json || '[]'),
      activeOffersCount: Number(c.active_offers_count || 0),
    }));

    const featuredCompaniesRows = db
      .prepare(
        `SELECT co.*, cat.name as category_name,
           (SELECT COUNT(*) FROM offers o
            WHERE o.company_id = co.id AND o.status = 'published' AND date(o.end_date) >= date('now')) as active_offers_count
         FROM companies co
         JOIN categories cat ON cat.id = co.category_id
         WHERE co.status = 'approved'
         ORDER BY co.is_featured DESC, co.id ASC
         LIMIT 12`,
      )
      .all() as any[];

    const featuredOffersRows = db
      .prepare(
        `SELECT o.*, co.trade_name as company_name, co.neighborhood as company_neighborhood,
                co.city as company_city, co.is_featured as company_is_featured,
                co.is_demo as company_is_demo, co.commercial_tier as company_commercial_tier,
                cat.name as category_name,
                (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.offer_id = o.id) as redemptions_count
         FROM offers o
         JOIN companies co ON co.id = o.company_id
         JOIN categories cat ON cat.id = o.category_id
         WHERE o.status = 'published'
           AND co.status = 'approved'
           AND date(o.end_date) >= date('now')
         ORDER BY co.is_featured DESC, o.created_at DESC
         LIMIT 12`,
      )
      .all() as any[];

    const campaignRows = db
      .prepare(
        `SELECT ca.*, co.trade_name as company_name
         FROM campaigns ca
         LEFT JOIN companies co ON co.id = ca.company_id
         WHERE ca.status = 'active' AND date(ca.end_date) >= date('now')
         ORDER BY ca.id DESC`,
      )
      .all() as any[];

    res.json({
      brand,
      legal,
      categories,
      featuredCompanies: featuredCompaniesRows.map(mapCompanyRow),
      featuredOffers: featuredOffersRows.map(mapOfferRow),
      activeCampaigns: campaignRows.map((ca) => ({
        id: ca.id,
        title: ca.title,
        description: ca.description,
        companyId: ca.company_id,
        companyName: ca.company_name,
        startDate: ca.start_date,
        endDate: ca.end_date,
        targetAudience: ca.target_audience,
        conditions: ca.conditions,
        imageUrl: ca.image_url,
        status: ca.status,
        isDemo: Boolean(ca.is_demo),
        createdAt: ca.created_at,
      })),
    });
  });

  app.get('/api/catalog/offers', (req: AuthenticatedRequest, res: Response) => {
    expireOutdatedOffers();
    const { q, categoryId, subcategory, neighborhood, featuredOnly, sort } = req.query;

    const where: string[] = [
      "o.status = 'published'",
      "co.status = 'approved'",
      "date(o.end_date) >= date('now')",
    ];
    const params: any[] = [];

    if (typeof q === 'string' && q.trim()) {
      const term = `%${q.trim()}%`;
      where.push('(o.title LIKE ? OR o.description LIKE ? OR co.trade_name LIKE ? OR cat.name LIKE ?)');
      params.push(term, term, term, term);
    }
    if (typeof categoryId === 'string' && categoryId && Number(categoryId) > 0) {
      where.push('o.category_id = ?');
      params.push(Number(categoryId));
    }
    if (typeof subcategory === 'string' && subcategory.trim()) {
      where.push('o.subcategory = ?');
      params.push(subcategory.trim());
    }
    if (typeof neighborhood === 'string' && neighborhood.trim()) {
      where.push('(co.neighborhood LIKE ? OR co.city LIKE ?)');
      params.push(`%${neighborhood.trim()}%`, `%${neighborhood.trim()}%`);
    }
    if (featuredOnly === 'true') {
      where.push('co.is_featured = 1');
    }

    const orderBy =
      sort === 'most_used'
        ? 'redemptions_count DESC, co.is_featured DESC, o.id DESC'
        : 'co.is_featured DESC, o.created_at DESC, o.id DESC';

    const rows = db
      .prepare(
        `SELECT o.*, co.trade_name as company_name, co.neighborhood as company_neighborhood,
                co.city as company_city, co.is_featured as company_is_featured,
                co.is_demo as company_is_demo, co.commercial_tier as company_commercial_tier,
                cat.name as category_name,
                (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.offer_id = o.id) as redemptions_count
         FROM offers o
         JOIN companies co ON co.id = o.company_id
         JOIN categories cat ON cat.id = o.category_id
         WHERE ${where.join(' AND ')}
         ORDER BY ${orderBy}`,
      )
      .all(...params) as any[];

    res.json({ offers: rows.map(mapOfferRow) });
  });

  app.get('/api/companies/:id', (req: AuthenticatedRequest, res: Response) => {
    expireOutdatedOffers();
    const companyId = Number(req.params.id);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      res.status(400).json({ error: 'Identificador de empresa inválido.' });
      return;
    }

    const companyRow = db
      .prepare(
        `SELECT co.*, cat.name as category_name
         FROM companies co
         JOIN categories cat ON cat.id = co.category_id
         WHERE co.id = ?`,
      )
      .get(companyId) as any;

    if (!companyRow) {
      res.status(404).json({ error: 'Empresa não encontrada.' });
      return;
    }

    const isOwnerOrAdmin =
      req.user &&
      (req.user.id === companyRow.owner_user_id || hasAnyRole(req.user, ADMIN_ROLES));

    if (companyRow.status !== 'approved' && !isOwnerOrAdmin) {
      res.status(404).json({ error: 'Estabelecimento não disponível no catálogo público.' });
      return;
    }

    const offerRows = db
      .prepare(
        `SELECT o.*, co.trade_name as company_name, co.neighborhood as company_neighborhood,
                co.city as company_city, co.is_featured as company_is_featured,
                co.is_demo as company_is_demo, cat.name as category_name,
                (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.offer_id = o.id) as redemptions_count
         FROM offers o
         JOIN companies co ON co.id = o.company_id
         JOIN categories cat ON cat.id = o.category_id
         WHERE o.company_id = ?
           AND (${isOwnerOrAdmin ? '1=1' : "o.status = 'published' AND date(o.end_date) >= date('now')"})
         ORDER BY o.id DESC`,
      )
      .all(companyId) as any[];

    res.json({
      company: mapCompanyRow(companyRow),
      offers: offerRows.map(mapOfferRow),
    });
  });

  app.post('/api/public/plan-inquiries', (req: AuthenticatedRequest, res: Response) => {
    const {
      planId,
      audienceType,
      fullName,
      email,
      phone,
      dependentsCount,
      referrerCode,
      notes,
    } = req.body ?? {};

    const plan = typeof planId === 'string' ? getPlanById(planId.trim()) : undefined;
    if (!plan) {
      res.status(400).json({ error: 'Selecione um plano de adesão válido (Base, Bronze, Prata ou Ouro).' });
      return;
    }

    const validAudiences: PlanAudienceType[] = ['associado', 'familiar', 'indicado'];
    if (!validAudiences.includes(audienceType)) {
      res.status(400).json({ error: 'Informe o vínculo (associado, familiar ou indicado).' });
      return;
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      res.status(400).json({ error: 'Informe seu nome completo (mínimo 3 caracteres).' });
      return;
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
      return;
    }

    const cleanedPhone = typeof phone === 'string' ? phone.trim() : '';
    if (cleanedPhone.length < 8) {
      res.status(400).json({ error: 'Informe um telefone ou WhatsApp válido para contato.' });
      return;
    }

    const parsedDependents = Number.isFinite(Number(dependentsCount))
      ? Math.max(0, Math.min(50, Math.floor(Number(dependentsCount))))
      : 0;
    const estimatedMonthlyTotal = calculatePlanMonthlyTotal(plan.id, parsedDependents);
    const protocol = `PLN-${generateOpaqueToken(3).toUpperCase()}`;

    const info = db
      .prepare(
        `INSERT INTO plan_inquiries (
           protocol, user_id, plan_id, plan_name, audience_type,
           full_name, email, phone, dependents_count, referrer_code,
           estimated_monthly_total, notes, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      )
      .run(
        protocol,
        req.user?.id ?? null,
        plan.id,
        plan.name,
        audienceType,
        fullName.trim().slice(0, 140),
        email.trim().toLowerCase().slice(0, 140),
        cleanedPhone.slice(0, 40),
        parsedDependents,
        typeof referrerCode === 'string' ? referrerCode.trim().slice(0, 80) : '',
        estimatedMonthlyTotal,
        typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
      );

    recordAudit(
      req.user?.id ?? null,
      req.user?.role ?? 'public',
      'PLAN_INQUIRY_CREATED',
      'plan_inquiry',
      info.lastInsertRowid,
      {
        protocol,
        planId: plan.id,
        audienceType,
        dependentsCount: parsedDependents,
        estimatedMonthlyTotal,
      },
    );

    const row = db
      .prepare('SELECT * FROM plan_inquiries WHERE id = ?')
      .get(info.lastInsertRowid) as any;

    res.status(201).json({
      inquiry: {
        id: row.id,
        protocol: row.protocol,
        userId: row.user_id,
        planId: row.plan_id,
        planName: row.plan_name,
        audienceType: row.audience_type,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        dependentsCount: row.dependents_count,
        referrerCode: row.referrer_code,
        estimatedMonthlyTotal: row.estimated_monthly_total,
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
      },
      message: `Solicitação registrada com sucesso sob o protocolo ${protocol}.`,
    });
  });

  // =========================================================================
  // CONSUMER ROUTES
  // =========================================================================

  app.get('/api/consumer/overview', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    expireOutdatedCoupons();
    expireOutdatedOffers();
    const userId = req.user!.id;

    const favoriteRows = db
      .prepare(
        `SELECT co.*, cat.name as category_name,
           (SELECT COUNT(*) FROM offers o WHERE o.company_id = co.id AND o.status = 'published' AND date(o.end_date) >= date('now')) as active_offers_count
         FROM favorites f
         JOIN companies co ON co.id = f.company_id
         JOIN categories cat ON cat.id = co.category_id
         WHERE f.user_id = ? AND co.status = 'approved'
         ORDER BY f.created_at DESC`,
      )
      .all(userId) as any[];

    const couponRows = db
      .prepare(
        `SELECT cp.*, o.title as offer_title, o.discount_label, o.restrictions as offer_restrictions,
                o.is_demo, co.trade_name as company_name, co.address as company_address,
                co.neighborhood as company_neighborhood
         FROM coupons cp
         JOIN offers o ON o.id = cp.offer_id
         JOIN companies co ON co.id = cp.company_id
         WHERE cp.user_id = ?
         ORDER BY cp.issued_at DESC, cp.id DESC`,
      )
      .all(userId) as any[];

    const redemptionRows = db
      .prepare(
        `SELECT cr.*, o.title as offer_title, co.trade_name as company_name
         FROM coupon_redemptions cr
         JOIN offers o ON o.id = cr.offer_id
         JOIN companies co ON co.id = cr.company_id
         WHERE cr.user_id = ?
         ORDER BY cr.redeemed_at DESC`,
      )
      .all(userId) as any[];

    const complaintRows = db
      .prepare(
        `SELECT c.*, co.trade_name as company_name, o.title as offer_title
         FROM complaints c
         JOIN companies co ON co.id = c.company_id
         LEFT JOIN offers o ON o.id = c.offer_id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC`,
      )
      .all(userId) as any[];

    res.json({
      favorites: favoriteRows.map(mapCompanyRow),
      coupons: couponRows.map((c) => ({
        id: c.id,
        offerId: c.offer_id,
        companyId: c.company_id,
        userId: c.user_id,
        code: c.code,
        qrToken: c.qr_token,
        status: c.status,
        issuedAt: c.issued_at,
        expiresAt: c.expires_at,
        usedAt: c.used_at,
        offerTitle: c.offer_title,
        discountLabel: c.discount_label,
        offerRestrictions: c.offer_restrictions,
        companyName: c.company_name,
        companyAddress: c.company_address,
        companyNeighborhood: c.company_neighborhood,
        isDemo: Boolean(c.is_demo),
      })),
      redemptions: redemptionRows.map((r) => ({
        id: r.id,
        couponId: r.coupon_id,
        offerId: r.offer_id,
        companyId: r.company_id,
        userId: r.user_id,
        code: r.code,
        offerTitle: r.offer_title,
        companyName: r.company_name,
        statusSnapshot: r.status_snapshot,
        notes: r.notes,
        redeemedAt: r.redeemed_at,
      })),
      complaints: complaintRows.map((cm) => ({
        id: cm.id,
        userId: cm.user_id,
        companyId: cm.company_id,
        companyName: cm.company_name,
        offerId: cm.offer_id,
        offerTitle: cm.offer_title,
        subject: cm.subject,
        description: cm.description,
        status: cm.status,
        adminNotes: cm.admin_notes,
        createdAt: cm.created_at,
        updatedAt: cm.updated_at,
      })),
    });
  });

  app.put('/api/consumer/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      fullName,
      phone,
      isMember,
      memberCode,
      communicationEmail,
      communicationWhatsapp,
    } = req.body ?? {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      res.status(400).json({ error: 'Nome completo deve ter ao menos 3 caracteres.' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE users
         SET full_name = ?, phone = ?, is_member = ?, member_code = ?,
             communication_email = ?, communication_whatsapp = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(
        fullName.trim(),
        typeof phone === 'string' ? phone.trim() : '',
        isMember ? 1 : 0,
        typeof memberCode === 'string' && memberCode.trim() ? memberCode.trim() : null,
        communicationEmail ? 1 : 0,
        communicationWhatsapp ? 1 : 0,
        userId,
      );

      db.prepare(
        `INSERT INTO consents (user_id, consent_type, version, accepted, ip_hash)
         VALUES (?, 'communication_preferences', '1.0', ?, ?)`,
      ).run(userId, communicationEmail || communicationWhatsapp ? 1 : 0, hashToken(req.ip || ''));

      recordAudit(userId, req.user!.role, 'PROFILE_UPDATED', 'user', userId);
    });

    tx();
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ user: mapUserRow(updated) });
  });

  app.post('/api/consumer/favorites/:companyId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const companyId = Number(req.params.companyId);
    const userId = req.user!.id;
    const company = db
      .prepare("SELECT id FROM companies WHERE id = ? AND status = 'approved'")
      .get(companyId);
    if (!company) {
      res.status(404).json({ error: 'Empresa parceira não encontrada.' });
      return;
    }
    const existing = db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND company_id = ?')
      .get(userId, companyId);
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND company_id = ?').run(userId, companyId);
      res.json({ favorited: false });
    } else {
      db.prepare('INSERT INTO favorites (user_id, company_id) VALUES (?, ?)').run(userId, companyId);
      res.json({ favorited: true });
    }
  });

  app.post('/api/consumer/coupons', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    expireOutdatedOffers();
    expireOutdatedCoupons();

    const userId = req.user!.id;
    const offerId = Number(req.body?.offerId);
    if (!Number.isFinite(offerId) || offerId <= 0) {
      res.status(400).json({ error: 'Oferta inválida.' });
      return;
    }

    const issueTx = db.transaction(() => {
      const offer = db
        .prepare(
          `SELECT o.*, co.status as company_status, co.trade_name as company_name,
                  co.address as company_address, co.neighborhood as company_neighborhood
           FROM offers o
           JOIN companies co ON co.id = o.company_id
           WHERE o.id = ?`,
        )
        .get(offerId) as any;

      if (!offer) {
        return { error: 'Oferta não encontrada.', status: 404 };
      }
      if (offer.company_status !== 'approved') {
        return { error: 'Estabelecimento não está ativo para emissão de cupons.', status: 400 };
      }
      if (offer.status !== 'published') {
        return { error: 'Esta oferta não está publicada no momento.', status: 400 };
      }
      const today = new Date().toISOString().slice(0, 10);
      if (offer.start_date > today || offer.end_date < today) {
        return { error: 'Esta oferta está fora do período de vigência.', status: 400 };
      }

      if (offer.usage_limit_total !== null) {
        const totalActiveOrUsed = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM coupons WHERE offer_id = ? AND status IN ('available', 'used')",
            )
            .get(offerId) as { c: number }
        ).c;
        if (totalActiveOrUsed >= offer.usage_limit_total) {
          return { error: 'Limite total de cupons desta oferta foi atingido.', status: 409 };
        }
      }

      if (offer.usage_limit_per_user !== null) {
        const userCount = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM coupons WHERE offer_id = ? AND user_id = ? AND status IN ('available', 'used')",
            )
            .get(offerId, userId) as { c: number }
        ).c;
        if (userCount >= offer.usage_limit_per_user) {
          return {
            error: `Você já atingiu o limite de ${offer.usage_limit_per_user} cupom(ns) para esta oferta.`,
            status: 409,
          };
        }
      }

      const code = generateCouponCode();
      const qrToken = generateOpaqueToken(24);
      const expiresAt = `${offer.end_date} 23:59:59`;

      const insertInfo = db
        .prepare(
          `INSERT INTO coupons (offer_id, company_id, user_id, code, qr_token, status, expires_at)
           VALUES (?, ?, ?, ?, ?, 'available', ?)`,
        )
        .run(offer.id, offer.company_id, userId, code, qrToken, expiresAt);

      const couponId = Number(insertInfo.lastInsertRowid);
      recordAudit(userId, req.user!.role, 'COUPON_ISSUED', 'coupon', couponId, {
        offerId: offer.id,
        companyId: offer.company_id,
      });

      const created = db
        .prepare(
          `SELECT cp.*, o.title as offer_title, o.discount_label, o.restrictions as offer_restrictions,
                  o.is_demo, co.trade_name as company_name, co.address as company_address,
                  co.neighborhood as company_neighborhood
           FROM coupons cp
           JOIN offers o ON o.id = cp.offer_id
           JOIN companies co ON co.id = cp.company_id
           WHERE cp.id = ?`,
        )
        .get(couponId) as any;

      return { coupon: created };
    });

    const result = issueTx();
    if ('error' in result) {
      res.status(result.status!).json({ error: result.error });
      return;
    }

    const c = result.coupon;
    res.status(201).json({
      coupon: {
        id: c.id,
        offerId: c.offer_id,
        companyId: c.company_id,
        userId: c.user_id,
        code: c.code,
        qrToken: c.qr_token,
        status: c.status,
        issuedAt: c.issued_at,
        expiresAt: c.expires_at,
        usedAt: c.used_at,
        offerTitle: c.offer_title,
        discountLabel: c.discount_label,
        offerRestrictions: c.offer_restrictions,
        companyName: c.company_name,
        companyAddress: c.company_address,
        companyNeighborhood: c.company_neighborhood,
        isDemo: Boolean(c.is_demo),
      },
    });
  });

  app.post('/api/consumer/coupons/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const couponId = Number(req.params.id);
    const coupon = db
      .prepare('SELECT * FROM coupons WHERE id = ? AND user_id = ?')
      .get(couponId, req.user!.id) as any;
    if (!coupon) {
      res.status(404).json({ error: 'Cupom não encontrado.' });
      return;
    }
    if (coupon.status !== 'available') {
      res.status(400).json({ error: 'Somente cupons disponíveis podem ser cancelados.' });
      return;
    }
    db.prepare("UPDATE coupons SET status = 'cancelled' WHERE id = ?").run(couponId);
    recordAudit(req.user!.id, req.user!.role, 'COUPON_CANCELLED', 'coupon', couponId);
    res.json({ ok: true });
  });

  app.post('/api/consumer/complaints', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { companyId, offerId, subject, description } = req.body ?? {};
    if (!companyId || !subject || !description) {
      res.status(400).json({ error: 'Informe estabelecimento, assunto e descrição.' });
      return;
    }
    const info = db
      .prepare(
        `INSERT INTO complaints (user_id, company_id, offer_id, subject, description, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
      )
      .run(
        req.user!.id,
        Number(companyId),
        offerId ? Number(offerId) : null,
        String(subject).trim(),
        String(description).trim(),
      );
    recordAudit(req.user!.id, req.user!.role, 'COMPLAINT_SUBMITTED', 'complaint', info.lastInsertRowid);
    res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
  });

  // =========================================================================
  // PARTNER COMPANY ROUTES (STRICT ISOLATION BY owner_user_id)
  // =========================================================================

  app.get(
    '/api/partner/dashboard',
    requireRoles(['partner_company', ...ADMIN_ROLES]),
    (req: AuthenticatedRequest, res: Response) => {
      expireOutdatedOffers();
      expireOutdatedCoupons();

      const companiesRows = db
        .prepare(
          `SELECT co.*, cat.name as category_name
           FROM companies co
           JOIN categories cat ON cat.id = co.category_id
           WHERE co.owner_user_id = ?
           ORDER BY co.id ASC`,
        )
        .all(req.user!.id) as any[];

      const companyIds = companiesRows.map((c) => c.id);
      if (companyIds.length === 0) {
        res.json({
          companies: [],
          offers: [],
          redemptions: [],
          metrics: { totalOffers: 0, publishedOffers: 0, totalCouponsIssued: 0, totalRedemptions: 0 },
        });
        return;
      }

      const placeholders = companyIds.map(() => '?').join(',');
      const offersRows = db
        .prepare(
          `SELECT o.*, co.trade_name as company_name, cat.name as category_name,
                  (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.offer_id = o.id) as redemptions_count
           FROM offers o
           JOIN companies co ON co.id = o.company_id
           JOIN categories cat ON cat.id = o.category_id
           WHERE o.company_id IN (${placeholders})
           ORDER BY o.id DESC`,
        )
        .all(...companyIds) as any[];

      // Privacy minimization: partner sees only consumer first name, never email/phone/member_code
      const redemptionsRows = db
        .prepare(
          `SELECT cr.*, o.title as offer_title, co.trade_name as company_name, u.full_name as consumer_name
           FROM coupon_redemptions cr
           JOIN offers o ON o.id = cr.offer_id
           JOIN companies co ON co.id = cr.company_id
           JOIN users u ON u.id = cr.user_id
           WHERE cr.company_id IN (${placeholders})
           ORDER BY cr.redeemed_at DESC
           LIMIT 100`,
        )
        .all(...companyIds) as any[];

      const totalCouponsIssued = (
        db
          .prepare(`SELECT COUNT(*) as c FROM coupons WHERE company_id IN (${placeholders})`)
          .get(...companyIds) as { c: number }
      ).c;

      res.json({
        companies: companiesRows.map(mapCompanyRow),
        offers: offersRows.map(mapOfferRow),
        redemptions: redemptionsRows.map((r) => ({
          id: r.id,
          couponId: r.coupon_id,
          offerId: r.offer_id,
          companyId: r.company_id,
          userId: r.user_id,
          code: r.code,
          offerTitle: r.offer_title,
          companyName: r.company_name,
          consumerFirstName: String(r.consumer_name || '').split(' ')[0],
          statusSnapshot: r.status_snapshot,
          notes: r.notes,
          redeemedAt: r.redeemed_at,
        })),
        metrics: {
          totalOffers: offersRows.length,
          publishedOffers: offersRows.filter((o) => o.status === 'published').length,
          totalCouponsIssued,
          totalRedemptions: redemptionsRows.length,
        },
      });
    },
  );

  app.post(
    '/api/partner/company',
    requireRoles(['partner_company', ...ADMIN_ROLES]),
    (req: AuthenticatedRequest, res: Response) => {
      const {
        id,
        tradeName,
        legalName,
        categoryId,
        description,
        address,
        neighborhood,
        city,
        phone,
        whatsapp,
        businessHours,
        website,
        instagram,
        responsibleName,
      } = req.body ?? {};

      if (!tradeName || !categoryId) {
        res.status(400).json({ error: 'Informe o nome comercial e a categoria.' });
        return;
      }

      if (id) {
        const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(Number(id)) as any;
        if (!existing) {
          res.status(404).json({ error: 'Empresa não encontrada.' });
          return;
        }
        if (existing.owner_user_id !== req.user!.id && !hasAnyRole(req.user, ADMIN_ROLES)) {
          res.status(403).json({ error: 'Acesso negado ao cadastro de outra empresa.' });
          return;
        }
        db.prepare(
          `UPDATE companies
           SET trade_name = ?, legal_name = ?, category_id = ?, description = ?,
               address = ?, neighborhood = ?, city = ?, phone = ?, whatsapp = ?,
               business_hours = ?, website = ?, instagram = ?, responsible_name = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
        ).run(
          String(tradeName).trim(),
          String(legalName || '').trim(),
          Number(categoryId),
          String(description || '').trim(),
          String(address || '').trim(),
          String(neighborhood || '').trim(),
          String(city || 'Piracicaba - SP').trim(),
          String(phone || '').trim(),
          String(whatsapp || '').trim(),
          String(businessHours || '').trim(),
          sanitizeSafeUrl(website),
          String(instagram || '').trim(),
          String(responsibleName || req.user!.fullName).trim(),
          Number(id),
        );
        recordAudit(req.user!.id, req.user!.role, 'COMPANY_UPDATED_BY_PARTNER', 'company', id);
        const updated = db
          .prepare('SELECT co.*, cat.name as category_name FROM companies co JOIN categories cat ON cat.id = co.category_id WHERE co.id = ?')
          .get(Number(id));
        res.json({ company: mapCompanyRow(updated) });
        return;
      }

      const info = db
        .prepare(
          `INSERT INTO companies (
            owner_user_id, trade_name, legal_name, category_id, description,
            address, neighborhood, city, phone, whatsapp, business_hours,
            website, instagram, responsible_name, commercial_tier, status, is_demo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'essencial', 'pending', 0)`,
        )
        .run(
          req.user!.id,
          String(tradeName).trim(),
          String(legalName || '').trim(),
          Number(categoryId),
          String(description || '').trim(),
          String(address || '').trim(),
          String(neighborhood || '').trim(),
          String(city || 'Piracicaba - SP').trim(),
          String(phone || '').trim(),
          String(whatsapp || '').trim(),
          String(businessHours || '').trim(),
          sanitizeSafeUrl(website),
          String(instagram || '').trim(),
          String(responsibleName || req.user!.fullName).trim(),
        );
      const createdId = Number(info.lastInsertRowid);
      recordAudit(req.user!.id, req.user!.role, 'COMPANY_CREATED', 'company', createdId);
      const created = db
        .prepare('SELECT co.*, cat.name as category_name FROM companies co JOIN categories cat ON cat.id = co.category_id WHERE co.id = ?')
        .get(createdId);
      res.status(201).json({ company: mapCompanyRow(created) });
    },
  );

  app.post(
    '/api/partner/offers',
    requireRoles(['partner_company', ...ADMIN_ROLES]),
    (req: AuthenticatedRequest, res: Response) => {
      const {
        companyId,
        categoryId,
        subcategory,
        title,
        description,
        benefitType,
        discountLabel,
        startDate,
        endDate,
        validDays,
        validHours,
        restrictions,
        requiresScheduling,
        usageLimitTotal,
        usageLimitPerUser,
        saveAsDraft,
      } = req.body ?? {};

      if (!companyId || !title || !description || !discountLabel || !startDate || !endDate) {
        res.status(400).json({ error: 'Preencha todos os campos obrigatórios da oferta.' });
        return;
      }

      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(Number(companyId)) as any;
      if (!company) {
        res.status(404).json({ error: 'Empresa não encontrada.' });
        return;
      }
      if (company.owner_user_id !== req.user!.id && !hasAnyRole(req.user, ADMIN_ROLES)) {
        res.status(403).json({ error: 'Você não tem permissão para criar ofertas para outra empresa.' });
        return;
      }

      // Partner offers NEVER bypass administrative approval
      const status: OfferStatus = saveAsDraft ? 'draft' : 'pending_approval';
      const info = db
        .prepare(
          `INSERT INTO offers (
            company_id, category_id, subcategory, title, description,
            benefit_type, discount_label, start_date, end_date,
            valid_days, valid_hours, restrictions, requires_scheduling,
            usage_limit_total, usage_limit_per_user, status, is_demo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        )
        .run(
          company.id,
          Number(categoryId || company.category_id),
          String(subcategory || '').trim(),
          String(title).trim(),
          String(description).trim(),
          String(benefitType || 'percentage'),
          String(discountLabel).trim(),
          String(startDate),
          String(endDate),
          String(validDays || 'Todos os dias').trim(),
          String(validHours || 'Horário comercial').trim(),
          String(restrictions || '').trim(),
          requiresScheduling ? 1 : 0,
          usageLimitTotal ? Number(usageLimitTotal) : null,
          usageLimitPerUser ? Number(usageLimitPerUser) : null,
          status,
        );
      const offerId = Number(info.lastInsertRowid);
      recordAudit(req.user!.id, req.user!.role, 'OFFER_CREATED_BY_PARTNER', 'offer', offerId, {
        companyId: company.id,
        status,
      });

      const created = db
        .prepare(
          `SELECT o.*, co.trade_name as company_name, cat.name as category_name
           FROM offers o
           JOIN companies co ON co.id = o.company_id
           JOIN categories cat ON cat.id = o.category_id
           WHERE o.id = ?`,
        )
        .get(offerId);
      res.status(201).json({ offer: mapOfferRow(created) });
    },
  );

  app.put(
    '/api/partner/offers/:id',
    requireRoles(['partner_company', ...ADMIN_ROLES]),
    (req: AuthenticatedRequest, res: Response) => {
      const offerId = Number(req.params.id);
      const existing = db
        .prepare(
          `SELECT o.*, co.owner_user_id
           FROM offers o
           JOIN companies co ON co.id = o.company_id
           WHERE o.id = ?`,
        )
        .get(offerId) as any;

      if (!existing) {
        res.status(404).json({ error: 'Oferta não encontrada.' });
        return;
      }
      if (existing.owner_user_id !== req.user!.id && !hasAnyRole(req.user, ADMIN_ROLES)) {
        res.status(403).json({ error: 'Acesso negado à oferta de outra empresa.' });
        return;
      }

      const {
        title,
        description,
        discountLabel,
        startDate,
        endDate,
        validDays,
        validHours,
        restrictions,
        requiresScheduling,
        submitForApproval,
      } = req.body ?? {};

      const nextStatus: OfferStatus = submitForApproval ? 'pending_approval' : existing.status;

      db.prepare(
        `UPDATE offers
         SET title = ?, description = ?, discount_label = ?, start_date = ?, end_date = ?,
             valid_days = ?, valid_hours = ?, restrictions = ?, requires_scheduling = ?,
             status = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(
        String(title || existing.title).trim(),
        String(description || existing.description).trim(),
        String(discountLabel || existing.discount_label).trim(),
        String(startDate || existing.start_date),
        String(endDate || existing.end_date),
        String(validDays || existing.valid_days).trim(),
        String(validHours || existing.valid_hours).trim(),
        String(restrictions ?? existing.restrictions).trim(),
        requiresScheduling !== undefined ? (requiresScheduling ? 1 : 0) : existing.requires_scheduling,
        nextStatus,
        offerId,
      );

      recordAudit(req.user!.id, req.user!.role, 'OFFER_UPDATED_BY_PARTNER', 'offer', offerId);
      const updated = db
        .prepare(
          `SELECT o.*, co.trade_name as company_name, cat.name as category_name
           FROM offers o
           JOIN companies co ON co.id = o.company_id
           JOIN categories cat ON cat.id = o.category_id
           WHERE o.id = ?`,
        )
        .get(offerId);
      res.json({ offer: mapOfferRow(updated) });
    },
  );

  app.get(
    '/api/partner/coupons/lookup',
    requireRoles(['partner_company', ...ADMIN_ROLES]),
    (req: AuthenticatedRequest, res: Response) => {
      expireOutdatedCoupons();
      const rawIdentifier = String(req.query.identifier || '').trim();
      if (!rawIdentifier) {
        res.status(400).json({ error: 'Informe o código ou QR Code do cupom.' });
        return;
      }

      const token = extractQrToken(rawIdentifier);
      const upperCode = rawIdentifier.toUpperCase();

      const coupon = db
        .prepare(
          `SELECT cp.*, o.title as offer_title, o.discount_label, o.status as offer_status,
                  o.end_date as offer_end_date, co.trade_name as company_name,
                  co.owner_user_id as company_owner_id, co.status as company_status,
                  u.full_name as consumer_name, u.status as consumer_status
           FROM coupons cp
           JOIN offers o ON o.id = cp.offer_id
           JOIN companies co ON co.id = cp.company_id
           JOIN users u ON u.id = cp.user_id
           WHERE cp.code = ? OR cp.qr_token = ?`,
        )
        .get(upperCode, token) as any;

      if (!coupon) {
        res.status(404).json({ error: 'Cupom não localizado na base do Clube.' });
        return;
      }

      if (coupon.company_owner_id !== req.user!.id && !hasAnyRole(req.user, ADMIN_ROLES)) {
        res.status(403).json({
          error: 'Este cupom pertence a outro estabelecimento parceiro.',
        });
        return;
      }

      res.json({
        coupon: {
          id: coupon.id,
          code: coupon.code,
          status: coupon.status,
          issuedAt: coupon.issued_at,
          expiresAt: coupon.expires_at,
          usedAt: coupon.used_at,
          offerTitle: coupon.offer_title,
          discountLabel: coupon.discount_label,
          offerStatus: coupon.offer_status,
          companyName: coupon.company_name,
          companyStatus: coupon.company_status,
          consumerFirstName: String(coupon.consumer_name || '').split(' ')[0],
          consumerStatus: coupon.consumer_status,
        },
      });
    },
  );

  app.post(
    '/api/partner/coupons/validate',
    requireRoles(['partner_company', ...ADMIN_ROLES]),
    (req: AuthenticatedRequest, res: Response) => {
      expireOutdatedCoupons();
      expireOutdatedOffers();

      const rawIdentifier = String(req.body?.identifier || '').trim();
      const notes = String(req.body?.notes || '').trim();

      if (!rawIdentifier) {
        res.status(400).json({ error: 'Informe o código do cupom ou leia o QR Code.' });
        return;
      }

      const token = extractQrToken(rawIdentifier);
      const upperCode = rawIdentifier.toUpperCase();

      const validateTx = db.transaction(() => {
        const coupon = db
          .prepare(
            `SELECT cp.*, o.title as offer_title, o.discount_label, o.status as offer_status,
                    o.start_date as offer_start_date, o.end_date as offer_end_date,
                    co.trade_name as company_name, co.owner_user_id as company_owner_id,
                    co.status as company_status, u.full_name as consumer_name,
                    u.status as consumer_status
             FROM coupons cp
             JOIN offers o ON o.id = cp.offer_id
             JOIN companies co ON co.id = cp.company_id
             JOIN users u ON u.id = cp.user_id
             WHERE cp.code = ? OR cp.qr_token = ?`,
          )
          .get(upperCode, token) as any;

        if (!coupon) {
          return { error: 'Cupom inválido ou não encontrado.', status: 404 };
        }
        if (coupon.company_owner_id !== req.user!.id && !hasAnyRole(req.user, ADMIN_ROLES)) {
          return {
            error: 'Este cupom é exclusivo de outro estabelecimento parceiro.',
            status: 403,
          };
        }
        if (coupon.company_status !== 'approved') {
          return { error: 'Empresa parceira não está aprovada para resgates.', status: 400 };
        }
        if (coupon.consumer_status !== 'active') {
          return { error: 'Conta do consumidor está suspensa.', status: 403 };
        }
        if (coupon.offer_status !== 'published') {
          return { error: `Oferta indisponível (${coupon.offer_status}).`, status: 400 };
        }
        if (coupon.status === 'used') {
          return {
            error: `Este cupom já foi utilizado em ${coupon.used_at}. Reutilização bloqueada.`,
            status: 409,
          };
        }
        if (coupon.status === 'expired' || new Date(coupon.expires_at).getTime() < Date.now()) {
          db.prepare("UPDATE coupons SET status = 'expired' WHERE id = ? AND status = 'available'").run(
            coupon.id,
          );
          return { error: 'Cupom expirado.', status: 410 };
        }
        if (coupon.status !== 'available') {
          return { error: `Cupom inválido para uso (status: ${coupon.status}).`, status: 400 };
        }

        const updateRes = db
          .prepare(
            `UPDATE coupons
             SET status = 'used', used_at = datetime('now'), validated_by_user_id = ?
             WHERE id = ? AND status = 'available'`,
          )
          .run(req.user!.id, coupon.id);

        if (updateRes.changes !== 1) {
          return { error: 'Cupom já processado anteriormente.', status: 409 };
        }

        db.prepare(
          `INSERT INTO coupon_redemptions (
            coupon_id, offer_id, company_id, user_id, validated_by_user_id,
            code, status_snapshot, notes
          ) VALUES (?, ?, ?, ?, ?, ?, 'used', ?)`,
        ).run(
          coupon.id,
          coupon.offer_id,
          coupon.company_id,
          coupon.user_id,
          req.user!.id,
          coupon.code,
          notes,
        );

        recordAudit(req.user!.id, req.user!.role, 'COUPON_VALIDATED', 'coupon', coupon.id, {
          code: coupon.code,
          companyId: coupon.company_id,
          offerId: coupon.offer_id,
        });

        return {
          ok: true as const,
          redemption: {
            code: coupon.code,
            offerTitle: coupon.offer_title,
            discountLabel: coupon.discount_label,
            companyName: coupon.company_name,
            consumerFirstName: String(coupon.consumer_name || '').split(' ')[0],
            redeemedAt: new Date().toISOString(),
          },
        };
      });

      const result = validateTx();
      if ('error' in result) {
        res.status(result.status!).json({ error: result.error });
        return;
      }
      res.json(result);
    },
  );

  // =========================================================================
  // ADMIN PANEL ROUTES (ROLE-BASED ACCESS CONTROL)
  // =========================================================================

  app.get(
    '/api/admin/overview',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      expireOutdatedOffers();
      expireOutdatedCoupons();

      const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
      const activeUsers = (
        db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get() as { c: number }
      ).c;
      const totalMembers = (
        db.prepare('SELECT COUNT(*) as c FROM users WHERE is_member = 1').get() as { c: number }
      ).c;
      const totalCompanies = (
        db.prepare('SELECT COUNT(*) as c FROM companies').get() as { c: number }
      ).c;
      const approvedCompanies = (
        db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'approved'").get() as {
          c: number;
        }
      ).c;
      const pendingCompanies = (
        db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'pending'").get() as {
          c: number;
        }
      ).c;
      const publishedOffers = (
        db.prepare("SELECT COUNT(*) as c FROM offers WHERE status = 'published'").get() as {
          c: number;
        }
      ).c;
      const pendingOffers = (
        db.prepare("SELECT COUNT(*) as c FROM offers WHERE status = 'pending_approval'").get() as {
          c: number;
        }
      ).c;
      const totalCoupons = (db.prepare('SELECT COUNT(*) as c FROM coupons').get() as { c: number }).c;
      const usedCoupons = (
        db.prepare("SELECT COUNT(*) as c FROM coupons WHERE status = 'used'").get() as { c: number }
      ).c;
      const demoCompaniesCount = (
        db.prepare('SELECT COUNT(*) as c FROM companies WHERE is_demo = 1').get() as { c: number }
      ).c;

      const registrationSeries = db
        .prepare(
          `SELECT date(created_at) as day, COUNT(*) as count
           FROM users
           GROUP BY date(created_at)
           ORDER BY day DESC
           LIMIT 7`,
        )
        .all() as Array<{ day: string; count: number }>;

      const recentAuditRows = db
        .prepare(
          `SELECT al.*, u.full_name as actor_name
           FROM audit_logs al
           LEFT JOIN users u ON u.id = al.actor_user_id
           ORDER BY al.id DESC
           LIMIT 15`,
        )
        .all() as any[];

      res.json({
        kpis: {
          totalUsers,
          activeUsers,
          totalMembers,
          totalCompanies,
          approvedCompanies,
          pendingCompanies,
          publishedOffers,
          pendingOffers,
          totalCoupons,
          usedCoupons,
          demoCompaniesCount,
        },
        registrationSeries: registrationSeries.reverse(),
        recentActivity: recentAuditRows.map((a) => ({
          id: a.id,
          actorUserId: a.actor_user_id,
          actorName: a.actor_name || 'Sistema',
          actorRole: a.actor_role,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          details: JSON.parse(a.details_json || '{}'),
          createdAt: a.created_at,
        })),
      });
    },
  );

  app.get('/api/admin/users', requireRoles(ADMIN_ROLES), (req: AuthenticatedRequest, res: Response) => {
    const q = String(req.query.q || '').trim();
    const roleFilter = String(req.query.role || '').trim();
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (q) {
      where.push('(full_name LIKE ? OR email LIKE ? OR member_code LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (roleFilter) {
      where.push('role = ?');
      params.push(roleFilter);
    }
    const rows = db
      .prepare(`SELECT * FROM users WHERE ${where.join(' AND ')} ORDER BY id DESC`)
      .all(...params) as any[];
    res.json({ users: rows.map(mapUserRow) });
  });

  app.post(
    '/api/admin/users',
    requireRoles(['superadmin', 'association_admin']),
    (req: AuthenticatedRequest, res: Response) => {
      const { fullName, email, phone, password, role } = req.body ?? {};
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        res.status(400).json({ error: 'Informe o nome do operador ou administrador.' });
        return;
      }
      if (!email || typeof email !== 'string' || email.trim().length < 3) {
        res.status(400).json({ error: 'Informe um e-mail ou identificador de acesso válido.' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
        return;
      }

      const validRoles: UserRole[] = [
        'superadmin',
        'platform_admin',
        'association_admin',
        'commercial_manager',
        'operator',
        'partner_company',
        'consumer',
      ];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Perfil de acesso inválido.' });
        return;
      }
      if ((role === 'superadmin' || role === 'platform_admin') && req.user!.role !== 'superadmin') {
        res.status(403).json({
          error: 'Somente o Master Admin pode criar contas deste nível hierárquico.',
        });
        return;
      }

      const normalizedLogin = email.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedLogin);
      if (existing) {
        res.status(409).json({ error: 'Já existe um usuário com este identificador.' });
        return;
      }

      const info = db
        .prepare(
          `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified, is_demo)
           VALUES (?, ?, ?, ?, ?, 'active', 1, 0)`,
        )
        .run(
          fullName.trim(),
          normalizedLogin,
          typeof phone === 'string' ? phone.trim() : '',
          hashPassword(password),
          role,
        );
      const createdId = Number(info.lastInsertRowid);
      recordAudit(req.user!.id, req.user!.role, 'ADMIN_USER_CREATED', 'user', createdId, {
        role,
        login: normalizedLogin,
      });
      const created = db.prepare('SELECT * FROM users WHERE id = ?').get(createdId);
      res.status(201).json({ user: mapUserRow(created) });
    },
  );

  app.patch(
    '/api/admin/users/:id/status',
    requireRoles(['superadmin', 'platform_admin', 'association_admin']),
    (req: AuthenticatedRequest, res: Response) => {
      const targetId = Number(req.params.id);
      const { status, reason } = req.body ?? {};
      if (!['active', 'suspended'].includes(status)) {
        res.status(400).json({ error: 'Status inválido.' });
        return;
      }
      if (targetId === req.user!.id && status === 'suspended') {
        res.status(400).json({ error: 'Você não pode suspender a própria conta em uso.' });
        return;
      }
      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
      if (!target) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }
      if (target.role === 'superadmin') {
        res.status(403).json({
          error: 'A conta Master Admin é protegida e não pode ser suspensa por outros operadores.',
        });
        return;
      }
      db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
        status,
        targetId,
      );
      if (status === 'suspended') {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
      }
      recordAudit(req.user!.id, req.user!.role, 'USER_STATUS_CHANGED', 'user', targetId, {
        previousStatus: target.status,
        newStatus: status,
        reason: String(reason || ''),
      });
      res.json({ ok: true });
    },
  );

  app.patch(
    '/api/admin/users/:id/role',
    requireRoles(['superadmin', 'association_admin']),
    (req: AuthenticatedRequest, res: Response) => {
      const targetId = Number(req.params.id);
      const { role } = req.body ?? {};
      const validRoles: UserRole[] = [
        'superadmin',
        'platform_admin',
        'association_admin',
        'commercial_manager',
        'operator',
        'partner_company',
        'consumer',
      ];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Papel inválido.' });
        return;
      }
      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
      if (!target) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }
      if (target.role === 'superadmin' && req.user!.role !== 'superadmin') {
        res.status(403).json({
          error: 'Somente o Master Admin pode alterar contas Master Admin.',
        });
        return;
      }
      if ((role === 'superadmin' || role === 'platform_admin') && req.user!.role !== 'superadmin') {
        res.status(403).json({
          error: 'Somente o Master Admin pode atribuir este nível de permissão.',
        });
        return;
      }
      db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(
        role,
        targetId,
      );
      recordAudit(req.user!.id, req.user!.role, 'USER_ROLE_CHANGED', 'user', targetId, {
        previousRole: target.role,
        newRole: role,
      });
      res.json({ ok: true });
    },
  );

  app.get(
    '/api/admin/companies',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      const rows = db
        .prepare(
          `SELECT co.*, cat.name as category_name,
             (SELECT COUNT(*) FROM offers o WHERE o.company_id = co.id) as active_offers_count
           FROM companies co
           JOIN categories cat ON cat.id = co.category_id
           ORDER BY CASE co.status WHEN 'pending' THEN 0 ELSE 1 END, co.id DESC`,
        )
        .all() as any[];
      res.json({ companies: rows.map(mapCompanyRow) });
    },
  );

  app.patch(
    '/api/admin/companies/:id/review',
    requireRoles(['superadmin', 'platform_admin', 'association_admin', 'commercial_manager']),
    (req: AuthenticatedRequest, res: Response) => {
      const companyId = Number(req.params.id);
      const { status, commercialTier, isFeatured, reviewNotes, categoryId } = req.body ?? {};
      const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;
      if (!existing) {
        res.status(404).json({ error: 'Empresa não encontrada.' });
        return;
      }

      const validStatuses: CompanyStatus[] = [
        'pending',
        'approved',
        'correction_requested',
        'rejected',
        'suspended',
      ];
      const nextStatus = status && validStatuses.includes(status) ? status : existing.status;
      const validTiers: CommercialTier[] = ['essencial', 'comercial', 'estrategico', 'institucional'];
      const nextTier =
        commercialTier && validTiers.includes(commercialTier)
          ? commercialTier
          : existing.commercial_tier;

      db.prepare(
        `UPDATE companies
         SET status = ?, commercial_tier = ?, is_featured = ?, review_notes = ?,
             category_id = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(
        nextStatus,
        nextTier,
        isFeatured !== undefined ? (isFeatured ? 1 : 0) : existing.is_featured,
        reviewNotes !== undefined ? String(reviewNotes) : existing.review_notes,
        categoryId ? Number(categoryId) : existing.category_id,
        companyId,
      );

      recordAudit(req.user!.id, req.user!.role, 'COMPANY_REVIEWED', 'company', companyId, {
        status: nextStatus,
        commercialTier: nextTier,
        isFeatured: isFeatured ?? Boolean(existing.is_featured),
      });

      res.json({ ok: true });
    },
  );

  app.get('/api/admin/offers', requireRoles(ADMIN_ROLES), (_req: AuthenticatedRequest, res: Response) => {
    expireOutdatedOffers();
    const rows = db
      .prepare(
        `SELECT o.*, co.trade_name as company_name, cat.name as category_name,
                (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.offer_id = o.id) as redemptions_count
         FROM offers o
         JOIN companies co ON co.id = o.company_id
         JOIN categories cat ON cat.id = o.category_id
         ORDER BY CASE o.status WHEN 'pending_approval' THEN 0 ELSE 1 END, o.id DESC`,
      )
      .all() as any[];
    res.json({ offers: rows.map(mapOfferRow) });
  });

  app.post(
    '/api/admin/offers',
    requireRoles(['superadmin', 'platform_admin', 'association_admin', 'commercial_manager']),
    (req: AuthenticatedRequest, res: Response) => {
      const {
        companyId,
        categoryId,
        subcategory,
        title,
        description,
        benefitType,
        discountLabel,
        startDate,
        endDate,
        validDays,
        validHours,
        restrictions,
        requiresScheduling,
        usageLimitTotal,
        usageLimitPerUser,
        status,
      } = req.body ?? {};
      if (!companyId || !title || !description || !discountLabel || !startDate || !endDate) {
        res.status(400).json({ error: 'Preencha os campos obrigatórios da oferta.' });
        return;
      }
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(Number(companyId)) as any;
      if (!company) {
        res.status(404).json({ error: 'Empresa não encontrada.' });
        return;
      }
      const targetStatus = ['draft', 'pending_approval', 'published', 'suspended'].includes(status)
        ? status
        : 'published';

      const info = db
        .prepare(
          `INSERT INTO offers (
            company_id, category_id, subcategory, title, description,
            benefit_type, discount_label, start_date, end_date,
            valid_days, valid_hours, restrictions, requires_scheduling,
            usage_limit_total, usage_limit_per_user, status, is_demo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          company.id,
          Number(categoryId || company.category_id),
          String(subcategory || '').trim(),
          String(title).trim(),
          String(description).trim(),
          String(benefitType || 'percentage'),
          String(discountLabel).trim(),
          String(startDate),
          String(endDate),
          String(validDays || 'Todos os dias').trim(),
          String(validHours || 'Horário comercial').trim(),
          String(restrictions || '').trim(),
          requiresScheduling ? 1 : 0,
          usageLimitTotal ? Number(usageLimitTotal) : null,
          usageLimitPerUser ? Number(usageLimitPerUser) : null,
          targetStatus,
          company.is_demo,
        );
      recordAudit(req.user!.id, req.user!.role, 'OFFER_CREATED_BY_ADMIN', 'offer', info.lastInsertRowid);
      res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
    },
  );

  app.patch(
    '/api/admin/offers/:id/review',
    requireRoles(['superadmin', 'platform_admin', 'association_admin', 'commercial_manager', 'operator']),
    (req: AuthenticatedRequest, res: Response) => {
      const offerId = Number(req.params.id);
      const { status, reviewNotes } = req.body ?? {};
      const validStatuses: OfferStatus[] = [
        'draft',
        'pending_approval',
        'published',
        'suspended',
        'expired',
      ];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Status de oferta inválido.' });
        return;
      }
      const existing = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId) as any;
      if (!existing) {
        res.status(404).json({ error: 'Oferta não encontrada.' });
        return;
      }
      db.prepare(
        "UPDATE offers SET status = ?, review_notes = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(status, reviewNotes !== undefined ? String(reviewNotes) : existing.review_notes, offerId);
      recordAudit(req.user!.id, req.user!.role, 'OFFER_REVIEWED', 'offer', offerId, {
        previousStatus: existing.status,
        newStatus: status,
      });
      res.json({ ok: true });
    },
  );

  app.get(
    '/api/admin/categories',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      const rows = db
        .prepare(
          `SELECT c.*,
             (SELECT COUNT(*) FROM offers o WHERE o.category_id = c.id AND o.status = 'published') as active_offers_count
           FROM categories c ORDER BY c.display_order ASC, c.id ASC`,
        )
        .all() as any[];
      res.json({
        categories: rows.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          iconName: c.icon_name,
          displayOrder: c.display_order,
          isActive: Boolean(c.is_active),
          subcategories: JSON.parse(c.subcategories_json || '[]'),
          activeOffersCount: Number(c.active_offers_count || 0),
        })),
      });
    },
  );

  app.post(
    '/api/admin/categories',
    requireRoles(['superadmin', 'platform_admin', 'association_admin']),
    (req: AuthenticatedRequest, res: Response) => {
      const { name, description, subcategories } = req.body ?? {};
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Informe o nome da categoria.' });
        return;
      }
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const subs = Array.isArray(subcategories)
        ? subcategories.map((s) => String(s).trim()).filter(Boolean)
        : [];
      const maxOrder = (
        db.prepare('SELECT COALESCE(MAX(display_order), 0) as m FROM categories').get() as { m: number }
      ).m;
      const info = db
        .prepare(
          `INSERT INTO categories (name, slug, description, icon_name, display_order, is_active, subcategories_json)
           VALUES (?, ?, ?, 'Tag', ?, 1, ?)`,
        )
        .run(name.trim(), `${slug}-${Date.now().toString().slice(-3)}`, String(description || ''), maxOrder + 1, JSON.stringify(subs));
      recordAudit(req.user!.id, req.user!.role, 'CATEGORY_CREATED', 'category', info.lastInsertRowid);
      res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
    },
  );

  app.put(
    '/api/admin/categories/:id',
    requireRoles(['superadmin', 'platform_admin', 'association_admin']),
    (req: AuthenticatedRequest, res: Response) => {
      const id = Number(req.params.id);
      const { name, description, isActive, subcategories } = req.body ?? {};
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
      if (!existing) {
        res.status(404).json({ error: 'Categoria não encontrada.' });
        return;
      }
      const subs = Array.isArray(subcategories)
        ? subcategories.map((s) => String(s).trim()).filter(Boolean)
        : JSON.parse(existing.subcategories_json || '[]');
      db.prepare(
        `UPDATE categories SET name = ?, description = ?, is_active = ?, subcategories_json = ? WHERE id = ?`,
      ).run(
        name ? String(name).trim() : existing.name,
        description !== undefined ? String(description).trim() : existing.description,
        isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
        JSON.stringify(subs),
        id,
      );
      recordAudit(req.user!.id, req.user!.role, 'CATEGORY_UPDATED', 'category', id);
      res.json({ ok: true });
    },
  );

  app.get(
    '/api/admin/campaigns',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      const rows = db
        .prepare(
          `SELECT ca.*, co.trade_name as company_name
           FROM campaigns ca
           LEFT JOIN companies co ON co.id = ca.company_id
           ORDER BY ca.id DESC`,
        )
        .all() as any[];
      res.json({
        campaigns: rows.map((ca) => ({
          id: ca.id,
          title: ca.title,
          description: ca.description,
          companyId: ca.company_id,
          companyName: ca.company_name,
          startDate: ca.start_date,
          endDate: ca.end_date,
          targetAudience: ca.target_audience,
          conditions: ca.conditions,
          imageUrl: ca.image_url,
          status: ca.status,
          isDemo: Boolean(ca.is_demo),
          createdAt: ca.created_at,
        })),
      });
    },
  );

  app.post(
    '/api/admin/campaigns',
    requireRoles(['superadmin', 'platform_admin', 'association_admin', 'commercial_manager']),
    (req: AuthenticatedRequest, res: Response) => {
      const { title, description, companyId, startDate, endDate, targetAudience, conditions, status } =
        req.body ?? {};
      if (!title || !description || !startDate || !endDate) {
        res.status(400).json({ error: 'Preencha título, descrição e período da campanha.' });
        return;
      }
      const info = db
        .prepare(
          `INSERT INTO campaigns (title, description, company_id, start_date, end_date, target_audience, conditions, status, is_demo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        )
        .run(
          String(title).trim(),
          String(description).trim(),
          companyId ? Number(companyId) : null,
          String(startDate),
          String(endDate),
          String(targetAudience || 'Associados AHRMP e consumidores locais').trim(),
          String(conditions || '').trim(),
          ['draft', 'active', 'paused', 'ended'].includes(status) ? status : 'draft',
        );
      recordAudit(req.user!.id, req.user!.role, 'CAMPAIGN_CREATED', 'campaign', info.lastInsertRowid);
      res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
    },
  );

  app.patch(
    '/api/admin/campaigns/:id',
    requireRoles(['superadmin', 'platform_admin', 'association_admin', 'commercial_manager']),
    (req: AuthenticatedRequest, res: Response) => {
      const id = Number(req.params.id);
      const { status } = req.body ?? {};
      if (!['draft', 'active', 'paused', 'ended'].includes(status)) {
        res.status(400).json({ error: 'Status de campanha inválido.' });
        return;
      }
      db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(status, id);
      recordAudit(req.user!.id, req.user!.role, 'CAMPAIGN_STATUS_UPDATED', 'campaign', id, { status });
      res.json({ ok: true });
    },
  );

  app.get(
    '/api/admin/complaints',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      const rows = db
        .prepare(
          `SELECT cm.*, u.full_name as user_name, co.trade_name as company_name, o.title as offer_title
           FROM complaints cm
           JOIN users u ON u.id = cm.user_id
           JOIN companies co ON co.id = cm.company_id
           LEFT JOIN offers o ON o.id = cm.offer_id
           ORDER BY cm.id DESC`,
        )
        .all() as any[];
      res.json({
        complaints: rows.map((cm) => ({
          id: cm.id,
          userId: cm.user_id,
          userName: cm.user_name,
          companyId: cm.company_id,
          companyName: cm.company_name,
          offerId: cm.offer_id,
          offerTitle: cm.offer_title,
          subject: cm.subject,
          description: cm.description,
          status: cm.status,
          adminNotes: cm.admin_notes,
          createdAt: cm.created_at,
          updatedAt: cm.updated_at,
        })),
      });
    },
  );

  app.patch(
    '/api/admin/complaints/:id',
    requireRoles(ADMIN_ROLES),
    (req: AuthenticatedRequest, res: Response) => {
      const id = Number(req.params.id);
      const { status, adminNotes } = req.body ?? {};
      if (!['open', 'in_review', 'resolved'].includes(status)) {
        res.status(400).json({ error: 'Status inválido.' });
        return;
      }
      db.prepare(
        "UPDATE complaints SET status = ?, admin_notes = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(status, String(adminNotes || ''), id);
      recordAudit(req.user!.id, req.user!.role, 'COMPLAINT_UPDATED', 'complaint', id, { status });
      res.json({ ok: true });
    },
  );

  app.get(
    '/api/admin/audit-logs',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      const rows = db
        .prepare(
          `SELECT al.*, u.full_name as actor_name
           FROM audit_logs al
           LEFT JOIN users u ON u.id = al.actor_user_id
           ORDER BY al.id DESC
           LIMIT 120`,
        )
        .all() as any[];
      res.json({
        logs: rows.map((a) => ({
          id: a.id,
          actorUserId: a.actor_user_id,
          actorName: a.actor_name || 'Sistema',
          actorRole: a.actor_role,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          details: JSON.parse(a.details_json || '{}'),
          createdAt: a.created_at,
        })),
      });
    },
  );

  app.get(
    '/api/admin/settings',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({
        brand: mergeBrandConfig(getSettingJson('brand')),
        legal: getSettingJson('legal'),
        smtpPlaceholder: getSettingJson('smtp_placeholder'),
      });
    },
  );

  app.put(
    '/api/admin/settings',
    requireRoles(['superadmin', 'platform_admin', 'association_admin']),
    (req: AuthenticatedRequest, res: Response) => {
      const { brand, legal, smtpPlaceholder } = req.body ?? {};
      if (brand && typeof brand === 'object') {
        const currentBrand = mergeBrandConfig(getSettingJson('brand'));
        const nextPatch: Record<string, unknown> = { ...brand };
        for (const urlKey of [
          'logoMainUrl',
          'logoCompactUrl',
          'logoIconUrl',
          'faviconUrl',
          'heroImageUrl',
        ]) {
          if (urlKey in nextPatch && typeof nextPatch[urlKey] === 'string') {
            nextPatch[urlKey] = sanitizeSafeUrl(nextPatch[urlKey] as string);
          }
        }
        const mergedBrand = mergeBrandConfig({ ...currentBrand, ...nextPatch });
        db.prepare(
          `UPDATE institutional_settings SET value_json = ?, updated_at = datetime('now'), updated_by_user_id = ? WHERE key = 'brand'`,
        ).run(JSON.stringify(mergedBrand), req.user!.id);
      }
      if (legal && typeof legal === 'object') {
        const currentLegal = getSettingJson<Record<string, unknown>>('legal');
        db.prepare(
          `UPDATE institutional_settings SET value_json = ?, updated_at = datetime('now'), updated_by_user_id = ? WHERE key = 'legal'`,
        ).run(JSON.stringify({ ...currentLegal, ...legal }), req.user!.id);
      }
      if (smtpPlaceholder && typeof smtpPlaceholder === 'object') {
        const currentSmtp = getSettingJson<Record<string, unknown>>('smtp_placeholder');
        db.prepare(
          `UPDATE institutional_settings SET value_json = ?, updated_at = datetime('now'), updated_by_user_id = ? WHERE key = 'smtp_placeholder'`,
        ).run(JSON.stringify({ ...currentSmtp, ...smtpPlaceholder }), req.user!.id);
      }
      recordAudit(req.user!.id, req.user!.role, 'INSTITUTIONAL_SETTINGS_UPDATED', 'settings', 'brand');
      res.json({ ok: true });
    },
  );

  app.get(
    '/api/admin/plan-inquiries',
    requireRoles(ADMIN_ROLES),
    (_req: AuthenticatedRequest, res: Response) => {
      const rows = db
        .prepare('SELECT * FROM plan_inquiries ORDER BY id DESC LIMIT 200')
        .all() as any[];
      res.json({
        inquiries: rows.map((row) => ({
          id: row.id,
          protocol: row.protocol,
          userId: row.user_id,
          planId: row.plan_id,
          planName: row.plan_name,
          audienceType: row.audience_type,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          dependentsCount: row.dependents_count,
          referrerCode: row.referrer_code,
          estimatedMonthlyTotal: row.estimated_monthly_total,
          notes: row.notes,
          status: row.status,
          createdAt: row.created_at,
        })),
      });
    },
  );

  app.patch(
    '/api/admin/plan-inquiries/:id',
    requireRoles(ADMIN_ROLES),
    (req: AuthenticatedRequest, res: Response) => {
      const id = Number(req.params.id);
      const { status, notes } = req.body ?? {};
      const validStatuses: PlanInquiryStatus[] = ['pending', 'contacted', 'active', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Status de adesão inválido.' });
        return;
      }
      const existing = db.prepare('SELECT id FROM plan_inquiries WHERE id = ?').get(id);
      if (!existing) {
        res.status(404).json({ error: 'Solicitação de adesão não encontrada.' });
        return;
      }
      if (typeof notes === 'string') {
        db.prepare('UPDATE plan_inquiries SET status = ?, notes = ? WHERE id = ?').run(
          status,
          notes.trim().slice(0, 500),
          id,
        );
      } else {
        db.prepare('UPDATE plan_inquiries SET status = ? WHERE id = ?').run(status, id);
      }
      recordAudit(req.user!.id, req.user!.role, 'PLAN_INQUIRY_UPDATED', 'plan_inquiry', id, {
        status,
      });
      res.json({ ok: true });
    },
  );
}

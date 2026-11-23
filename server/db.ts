import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DEFAULT_BRAND_CONFIG, DEFAULT_LEGAL_CONFIG } from '../src/config/brand.ts';
import type { SmtpPlaceholderConfig } from '../src/types.ts';
import { hashPassword } from './security.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'ahrmp_clube.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'consumer',
      status TEXT NOT NULL DEFAULT 'active',
      is_member INTEGER NOT NULL DEFAULT 0,
      member_code TEXT,
      communication_email INTEGER NOT NULL DEFAULT 1,
      communication_whatsapp INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      icon_name TEXT NOT NULL DEFAULT 'Tag',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      subcategories_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trade_name TEXT NOT NULL,
      legal_name TEXT NOT NULL DEFAULT '',
      category_id INTEGER NOT NULL REFERENCES categories(id),
      description TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      neighborhood TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT 'Piracicaba - SP',
      phone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      business_hours TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      instagram TEXT NOT NULL DEFAULT '',
      logo_url TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      responsible_name TEXT NOT NULL DEFAULT '',
      commercial_tier TEXT NOT NULL DEFAULT 'essencial',
      is_featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      review_notes TEXT NOT NULL DEFAULT '',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      subcategory TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      benefit_type TEXT NOT NULL DEFAULT 'percentage',
      discount_label TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      valid_days TEXT NOT NULL DEFAULT 'Todos os dias',
      valid_hours TEXT NOT NULL DEFAULT 'Horário comercial',
      restrictions TEXT NOT NULL DEFAULT '',
      requires_scheduling INTEGER NOT NULL DEFAULT 0,
      usage_limit_total INTEGER,
      usage_limit_per_user INTEGER,
      status TEXT NOT NULL DEFAULT 'pending_approval',
      review_notes TEXT NOT NULL DEFAULT '',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      qr_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'available',
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      validated_by_user_id INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      validated_by_user_id INTEGER REFERENCES users(id),
      code TEXT NOT NULL,
      status_snapshot TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, company_id)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'Associados AHRMP e consumidores locais',
      conditions TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      offer_id INTEGER REFERENCES offers(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      consent_type TEXT NOT NULL,
      version TEXT NOT NULL,
      accepted INTEGER NOT NULL DEFAULT 1,
      ip_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS institutional_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plan_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocol TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      audience_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      dependents_count INTEGER NOT NULL DEFAULT 0,
      referrer_code TEXT NOT NULL DEFAULT '',
      estimated_monthly_total REAL NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const categoryCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (categoryCount === 0) {
    const initialCategories = [
      {
        name: 'Alimentação',
        slug: 'alimentacao',
        description: 'Padarias, cafés, restaurantes e gastronomia regional.',
        iconName: 'UtensilsCrossed',
        order: 1,
        subs: ['Padarias e Cafés', 'Restaurantes', 'Lanchonetes'],
      },
      {
        name: 'Supermercados',
        slug: 'supermercados',
        description: 'Mercados de bairro, hortifrutis e mercearias.',
        iconName: 'ShoppingBasket',
        order: 2,
        subs: ['Supermercados', 'Hortifruti', 'Mercearias'],
      },
      {
        name: 'Farmácias e saúde',
        slug: 'farmacias-e-saude',
        description: 'Drogarias, manipulados, óticas e clínicas parceiras.',
        iconName: 'HeartPulse',
        order: 3,
        subs: ['Drogarias', 'Manipulação', 'Óticas'],
      },
      {
        name: 'Academias e bem-estar',
        slug: 'academias-e-bem-estar',
        description: 'Academias, estúdios de pilates, esportes e cuidados pessoais.',
        iconName: 'Dumbbell',
        order: 4,
        subs: ['Academias', 'Pilates e Funcional', 'Estética'],
      },
      {
        name: 'Automotivo',
        slug: 'automotivo',
        description: 'Oficinas, troca de óleo, estética automotiva e autopeças.',
        iconName: 'Car',
        order: 5,
        subs: ['Manutenção', 'Lava-rápido', 'Autopeças'],
      },
      {
        name: 'Educação',
        slug: 'educacao',
        description: 'Escolas de idiomas, cursos técnicos, reforço e treinamentos.',
        iconName: 'GraduationCap',
        order: 6,
        subs: ['Idiomas', 'Cursos Livres', 'Material Escolar'],
      },
      {
        name: 'Serviços',
        slug: 'servicos',
        description: 'Serviços residenciais, manutenção, pet shop e conveniência.',
        iconName: 'Wrench',
        order: 7,
        subs: ['Casa e Reforma', 'Pet Shop', 'Assistência Técnica'],
      },
      {
        name: 'Compras',
        slug: 'compras',
        description: 'Vestuário, calçados, casa e decoração no comércio local.',
        iconName: 'ShoppingBag',
        order: 8,
        subs: ['Moda e Calçados', 'Casa e Decoração', 'Papelaria'],
      },
      {
        name: 'Lazer e entretenimento',
        slug: 'lazer-e-entretenimento',
        description: 'Cultura, cinema, parques, clubes e eventos regionais.',
        iconName: 'Ticket',
        order: 9,
        subs: ['Cultura e Lazer', 'Eventos', 'Turismo Regional'],
      },
      {
        name: 'Outros',
        slug: 'outros',
        description: 'Demais categorias e convênios institucionais futuros.',
        iconName: 'LayoutGrid',
        order: 10,
        subs: ['Conveniências', 'Parcerias Especiais'],
      },
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (name, slug, description, icon_name, display_order, is_active, subcategories_json)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);
    for (const c of initialCategories) {
      insertCat.run(c.name, c.slug, c.description, c.iconName, c.order, JSON.stringify(c.subs));
    }
  }

  // Institutional settings defaults
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO institutional_settings (key, value_json) VALUES (?, ?)
  `);
  insertSetting.run('brand', JSON.stringify(DEFAULT_BRAND_CONFIG));
  insertSetting.run('legal', JSON.stringify(DEFAULT_LEGAL_CONFIG));

  const defaultSmtp: SmtpPlaceholderConfig = {
    host: 'smtp.provedor-exemplo.com.br',
    port: 587,
    username: 'nao-responda@ahrmp-exemplo.org.br',
    fromEmail: 'clube@ahrmp-exemplo.org.br',
    fromName: 'Clube de Benefícios AHRMP',
    secure: true,
    configured: false,
  };
  insertSetting.run('smtp_placeholder', JSON.stringify(defaultSmtp));

  // Demo non-admin data (clearly marked with is_demo = 1)
  const existingDemoCompanyCount = (
    db.prepare('SELECT COUNT(*) as c FROM companies WHERE is_demo = 1').get() as { c: number }
  ).c;

  if (existingDemoCompanyCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role, status, is_member, member_code, communication_email, email_verified, is_demo)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, 1, 1, 1)
    `);

    // Demo accounts only use random unshared hashes because demo login uses explicit server-side demo route
    const demoPassHash = hashPassword('Demo#VTX2026!');

    const consumerRes = insertUser.run(
      'Mariana Silva (Consumidora Demo)',
      'consumidor.demo@ahrmp-exemplo.org.br',
      '(19) 99000-1100',
      demoPassHash,
      'consumer',
      1,
      'AHRMP-DEMO-0142',
    );
    const demoConsumerId = Number(consumerRes.lastInsertRowid);

    const partner1Res = insertUser.run(
      'Carlos Almeida (Parceiro Demo)',
      'parceiro.demo@ahrmp-exemplo.org.br',
      '(19) 99000-2200',
      demoPassHash,
      'partner_company',
      0,
      null,
    );
    const demoPartnerUser1Id = Number(partner1Res.lastInsertRowid);

    const partner2Res = insertUser.run(
      'Fernanda Costa (Parceira Demo)',
      'mercado.demo@ahrmp-exemplo.org.br',
      '(19) 99000-3300',
      demoPassHash,
      'partner_company',
      0,
      null,
    );
    const demoPartnerUser2Id = Number(partner2Res.lastInsertRowid);

    const getCatId = (slug: string): number => {
      const row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as { id: number };
      return row.id;
    };

    const insertCompany = db.prepare(`
      INSERT INTO companies (
        owner_user_id, trade_name, legal_name, category_id, description,
        address, neighborhood, city, phone, whatsapp, business_hours,
        website, instagram, logo_url, cover_image_url, responsible_name,
        commercial_tier, is_featured, status, review_notes, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'Cadastro ilustrativo para apresentação à diretoria.', 1)
    `);

    const c1 = Number(
      insertCompany.run(
        demoPartnerUser1Id,
        'Padaria & Café Engenho (Demo)',
        'Empresa Demonstrativa de Panificação Ltda',
        getCatId('alimentacao'),
        'Estabelecimento ilustrativo para demonstração do módulo de Alimentação. Pães artesanais, cafés especiais e refeições rápidas.',
        'Rua Governador Pedro de Toledo, 000 (Endereço ilustrativo)',
        'Centro',
        'Piracicaba - SP',
        '(19) 3400-0101',
        '(19) 99000-0101',
        'Segunda a Sábado, 06h30 às 20h00',
        '',
        '@padariaengenho.demo',
        '',
        '/src/assets/images/demo_bakery_cafe_1795453368320.jpg',
        'Carlos Almeida',
        'estrategico',
        1,
      ).lastInsertRowid,
    );

    const c2 = Number(
      insertCompany.run(
        demoPartnerUser2Id,
        'Mercado Vila Verde (Demo)',
        'Empresa Demonstrativa de Hortifruti e Mercearia Ltda',
        getCatId('supermercados'),
        'Estabelecimento ilustrativo para demonstração do módulo de Supermercados e Hortifruti na Região Metropolitana de Piracicaba.',
        'Av. Independência, 000 (Endereço ilustrativo)',
        'Paulista',
        'Piracicaba - SP',
        '(19) 3400-0202',
        '(19) 99000-0202',
        'Segunda a Domingo, 07h30 às 21h00',
        '',
        '@mercadovilaverde.demo',
        '',
        '/src/assets/images/demo_supermarket_offer_1795453368820.jpg',
        'Fernanda Costa',
        'institucional',
        1,
      ).lastInsertRowid,
    );

    const c3 = Number(
      insertCompany.run(
        demoPartnerUser1Id,
        'Drogaria Bem-Estar Piracicaba (Demo)',
        'Empresa Demonstrativa Farmacêutica Ltda',
        getCatId('farmacias-e-saude'),
        'Estabelecimento ilustrativo para demonstração da categoria Farmácias e Saúde.',
        'Av. Carlos Botelho, 000 (Endereço ilustrativo)',
        'Cidade Jardim',
        'Piracicaba - SP',
        '(19) 3400-0303',
        '(19) 99000-0303',
        'Segunda a Sábado, 08h00 às 22h00',
        '',
        '',
        '',
        '/src/assets/images/demo_pharmacy_health_1795453368129.jpg',
        'Carlos Almeida',
        'comercial',
        1,
      ).lastInsertRowid,
    );

    const c4 = Number(
      insertCompany.run(
        demoPartnerUser2Id,
        'Espaço Movimento Academia (Demo)',
        'Empresa Demonstrativa de Atividades Físicas Ltda',
        getCatId('academias-e-bem-estar'),
        'Estabelecimento ilustrativo para demonstração da categoria Academias e Bem-Estar.',
        'Rua do Rosário, 000 (Endereço ilustrativo)',
        'Nova Piracicaba',
        'Piracicaba - SP',
        '(19) 3400-0404',
        '(19) 99000-0404',
        'Segunda a Sexta, 06h00 às 22h00 · Sábados 08h00 às 13h00',
        '',
        '',
        '',
        '/src/assets/images/demo_fitness_wellness_1795453368015.jpg',
        'Fernanda Costa',
        'essencial',
        0,
      ).lastInsertRowid,
    );

    const insertOffer = db.prepare(`
      INSERT INTO offers (
        company_id, category_id, subcategory, title, description,
        benefit_type, discount_label, image_url, start_date, end_date,
        valid_days, valid_hours, restrictions, requires_scheduling,
        usage_limit_total, usage_limit_per_user, status, review_notes, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'Oferta demonstrativa aprovada para apresentação.', 1)
    `);

    const today = new Date().toISOString().slice(0, 10);
    const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

    insertOffer.run(
      c1,
      getCatId('alimentacao'),
      'Padarias e Cafés',
      '15% de desconto no café da manhã e pães artesanais (Demo)',
      'Apresente o cupom digital ou QR Code do Clube AHRMP no caixa antes do fechamento da compra. Válido para itens de padaria e cafeteria.',
      'percentage',
      '15% OFF',
      '/src/assets/images/demo_bakery_cafe_1795453368320.jpg',
      today,
      nextYear,
      'Segunda a Sexta-feira',
      '06h30 às 11h30',
      'Não cumulativo com combos promocionais do dia.',
      0,
      500,
      4,
    );

    insertOffer.run(
      c2,
      getCatId('supermercados'),
      'Hortifruti',
      '10% de desconto na seção de hortifruti selecionado (Demo)',
      'Benefício demonstrativo válido para compras de frutas, verduras e legumes frescos mediante validação de QR Code no caixa.',
      'percentage',
      '10% OFF',
      '/src/assets/images/demo_supermarket_offer_1795453368820.jpg',
      today,
      nextYear,
      'Terças e Quintas-feiras',
      '07h30 às 21h00',
      'Desconto aplicado sobre itens de hortifruti não anunciados em encarte.',
      0,
      1000,
      8,
    );

    insertOffer.run(
      c3,
      getCatId('farmacias-e-saude'),
      'Drogarias',
      'Até 20% em dermocosméticos e itens de cuidado diário (Demo)',
      'Condição demonstrativa especial para participantes do Clube AHRMP em linhas selecionadas de higiene, proteção solar e bem-estar.',
      'percentage',
      '20% OFF',
      '/src/assets/images/demo_pharmacy_health_1795453368129.jpg',
      today,
      nextYear,
      'Todos os dias',
      '08h00 às 22h00',
      'Sujeito à disponibilidade de estoque na loja física.',
      0,
      null,
      3,
    );

    insertOffer.run(
      c4,
      getCatId('academias-e-bem-estar'),
      'Academias',
      'Isenção de taxa de matrícula + avaliação física inicial (Demo)',
      'Benefício demonstrativo para novos alunos cadastrados no Clube de Benefícios da Associação. Necessário agendamento prévio.',
      'special_condition',
      'Taxa Isenta',
      '/src/assets/images/demo_fitness_wellness_1795453368015.jpg',
      today,
      nextYear,
      'Segunda a Sábado',
      'Horário de funcionamento',
      'Válido para primeira adesão mediante agendamento de avaliação.',
      1,
      200,
      1,
    );

    // Demo campaign (no sweepstakes or prizes)
    db.prepare(`
      INSERT INTO campaigns (title, description, company_id, start_date, end_date, target_audience, conditions, image_url, status, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)
    `).run(
      'Campanha de Valorização do Comércio Local de Piracicaba (Demo)',
      'Ação institucional demonstrativa voltada ao fortalecimento dos estabelecimentos de bairro e vantagens para associados da AHRMP.',
      c2,
      today,
      nextYear,
      'Associados AHRMP e moradores da Região Metropolitana de Piracicaba',
      'Válido mediante emissão gratuita de cupom pelo aplicativo web do Clube.',
      '/src/assets/images/hero_piracicaba_club_1795453368219.jpg',
    );

    // Record initial LGPD consent for demo consumer
    db.prepare(`
      INSERT INTO consents (user_id, consent_type, version, accepted, ip_hash)
      VALUES (?, 'terms_and_privacy', '1.0-demo', 1, 'demo-seed')
    `).run(demoConsumerId);

    db.prepare(`
      INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, details_json)
      VALUES (NULL, 'system', 'SEED_DEMO_ENVIRONMENT', 'system', 'initial', ?)
    `).run(JSON.stringify({ note: 'Ambiente demonstrativo inicializado com parceiros ilustrativos.' }));
  }

  const masterUser = process.env.MASTER_ADMIN_USER?.trim().toLowerCase();
  const masterPass = process.env.MASTER_ADMIN_PASSWORD;
  if (masterUser && masterPass) {
    const existingMaster = db.prepare('SELECT id FROM users WHERE email = ?').get(masterUser) as
      | { id: number }
      | undefined;
    if (!existingMaster) {
      db.prepare(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified, is_demo)
         VALUES (?, ?, '', ?, 'superadmin', 'active', 1, 0)`,
      ).run(masterUser, masterUser, hashPassword(masterPass));
    } else {
      db.prepare(
        `UPDATE users SET role = 'superadmin', status = 'active', password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(hashPassword(masterPass), existingMaster.id);
    }
  }
}

export function recordAudit(
  actorUserId: number | null,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string | number | bigint,
  details: Record<string, unknown> = {},
): void {
  db.prepare(`
    INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(actorUserId, actorRole, action, entityType, String(entityId), JSON.stringify(details));
}

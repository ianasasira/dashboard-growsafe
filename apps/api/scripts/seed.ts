import bcrypt from 'bcrypt';
import { Client } from 'pg';

const districts = [
  ['Kampala', 'Central', 0.3476, 32.5825, 0.4],
  ['Mbarara', 'Western', -0.6072, 30.6545, 0.2],
  ['Gulu', 'Northern', 2.7746, 32.299, 0.15],
  ['Jinja', 'Eastern', 0.4479, 33.2026, 0.06],
  ['Mbale', 'Eastern', 1.0806, 34.175, 0.05],
  ['Arua', 'Northern', 3.0201, 30.9111, 0.04],
  ['Masaka', 'Central', -0.3338, 31.7341, 0.04],
  ['Bushenyi', 'Western', -0.5417, 30.1858, 0.03],
  ['Lira', 'Northern', 2.2499, 32.8999, 0.02],
  ['Fort Portal', 'Western', 0.671, 30.275, 0.01]
] as const;

const products = [
  ['BKC-DC100', 'DUDU CYPER 100ml', 'Insecticides', 'Cypermethrin', 'EC', '100ml'],
  ['BKC-DC250', 'DUDU CYPER 250ml', 'Insecticides', 'Cypermethrin', 'EC', '250ml'],
  ['BKC-DC500', 'DUDU CYPER 500ml', 'Insecticides', 'Cypermethrin', 'EC', '500ml'],
  ['BKC-DC1L', 'DUDU CYPER 1L', 'Insecticides', 'Cypermethrin', 'EC', '1L'],
  ['BKC-MANC500', 'Mancozeb 500g', 'Fungicides', 'Mancozeb', 'WP', '500g'],
  ['BKC-GLY1L', 'Glyphosate 1L', 'Herbicides', 'Glyphosate', 'SL', '1L'],
  ['BKC-UREA50', 'Urea Fertilizer 50kg', 'Fertilizers', 'Nitrogen', 'Granules', '50kg'],
  ['BKC-NPK25', 'NPK 17-17-17 25kg', 'Fertilizers', 'NPK', 'Granules', '25kg'],
  ['BKC-MET500', 'Metalaxyl 500g', 'Fungicides', 'Metalaxyl', 'WP', '500g'],
  ['BKC-ABM250', 'Abamectin 250ml', 'Insecticides', 'Abamectin', 'EC', '250ml'],
  ['BKC-2D1L', '2,4-D Amine 1L', 'Herbicides', '2,4-D', 'SL', '1L'],
  ['BKC-BOR1L', 'Boron Plus 1L', 'Fertilizers', 'Boron', 'Liquid', '1L'],
  ['BKC-TEB250', 'Tebuconazole 250ml', 'Fungicides', 'Tebuconazole', 'EC', '250ml'],
  ['BKC-ACE100', 'Acephate 100g', 'Insecticides', 'Acephate', 'SP', '100g'],
  ['BKC-COP1K', 'Copper Oxychloride 1kg', 'Fungicides', 'Copper', 'WP', '1kg'],
  ['BKC-PAR1L', 'Paraquat 1L', 'Herbicides', 'Paraquat', 'SL', '1L'],
  ['BKC-MAG5K', 'Magnesium Sulphate 5kg', 'Fertilizers', 'Magnesium', 'Crystals', '5kg'],
  ['BKC-IMA100', 'Imidacloprid 100ml', 'Insecticides', 'Imidacloprid', 'SC', '100ml'],
  ['BKC-PEN500', 'Pendimethalin 500ml', 'Herbicides', 'Pendimethalin', 'EC', '500ml'],
  ['BKC-ZIN1L', 'Zinc Booster 1L', 'Fertilizers', 'Zinc', 'Liquid', '1L']
] as const;

function pickDistrict() {
  const random = Math.random();
  let cursor = 0;
  for (const district of districts) {
    cursor += district[4];
    if (random <= cursor) return district;
  }
  return districts[0];
}

function randomCode(index: number) {
  return `BKC-2026-${index.toString(36).toUpperCase().padStart(8, '0')}-${index % 10}`;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');

  const adminHash = await bcrypt.hash('Admin@2026', 12);
  const superHash = await bcrypt.hash('SuperAdmin@2026', 12);

  const company = await client.query(
    `INSERT INTO companies (name, slug, country, contact_email, contact_phone, address, subscription_plan)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Bukoola Chemicals', 'bukoola', 'Uganda', 'info@bukoola.com', '+256 414 000000', 'Kampala, Uganda', 'enterprise']
  );
  const companyId = company.rows[0].id;

  await client.query(
    `INSERT INTO users (company_id, first_name, last_name, email, password_hash, role)
     VALUES ($1, 'Bukoola', 'Admin', 'admin@bukoola.com', $2, 'company_admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [companyId, adminHash]
  );
  await client.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ('GrowSafe', 'Admin', 'admin@growsafe.com', $1, 'superadmin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [superHash]
  );

  const categoryIds = new Map<string, string>();
  for (const name of ['Crop Protection', 'Fertilizers', 'Herbicides', 'Fungicides', 'Insecticides']) {
    const result = await client.query(
      `INSERT INTO product_categories (company_id, name)
       VALUES ($1, $2)
       ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [companyId, name]
    );
    categoryIds.set(name, result.rows[0].id);
  }

  const productIds: string[] = [];
  for (const [sku, name, category, ingredient, formulation, size] of products) {
    const result = await client.query(
      `INSERT INTO products
       (company_id, category_id, sku, name, description, active_ingredients, formulation, packaging_size, usage_information, safety_information, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (company_id, sku) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        companyId,
        categoryIds.get(category),
        sku,
        name,
        `${name} from Bukoola Chemicals.`,
        ingredient,
        formulation,
        size,
        'Follow label instructions and local agronomist guidance.',
        'Wear protective equipment. Keep away from children and animals.',
        `/seed/products/${sku}.png`
      ]
    );
    productIds.push(result.rows[0].id);
  }

  const batchIds: string[] = [];
  for (let i = 0; i < 15; i += 1) {
    const result = await client.query(
      `INSERT INTO batches
       (company_id, product_id, batch_number, quantity, manufacture_date, expiry_date, manufacturing_plant, status, codes_generated, codes_generated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now())
       ON CONFLICT (company_id, batch_number) DO UPDATE SET quantity = EXCLUDED.quantity
       RETURNING id`,
      [
        companyId,
        productIds[i % productIds.length],
        `BK2026-${String(i + 1).padStart(4, '0')}`,
        650 + i * 20,
        '2026-03-01',
        '2029-03-01',
        i % 2 === 0 ? 'Kampala Factory' : 'Namanve Factory',
        i === 2 ? 'recalled' : 'active'
      ]
    );
    batchIds.push(result.rows[0].id);
  }

  for (let i = 1; i <= 10000; i += 1) {
    await client.query(
      `INSERT INTO verification_codes (company_id, batch_id, code, qr_image_url, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO NOTHING`,
      [companyId, batchIds[i % batchIds.length], randomCode(i), `/bukoola/batches/seed/${randomCode(i)}.png`, i % 17 === 0 ? 'flagged' : 'verified']
    );
  }

  for (let i = 1; i <= 50000; i += 1) {
    const [district, region, lat, lng] = pickDistrict();
    const result = i % 100 < 85 ? 'genuine' : i % 100 < 93 ? 'suspicious' : 'invalid';
    const code = result === 'invalid' ? `UNKNOWN-${i}` : randomCode((i % 10000) + 1);
    await client.query(
      `INSERT INTO scan_events
       (company_id, code, verification_code_id, result, channel, ip_address, latitude, longitude, district, region, scanned_at)
       VALUES ($1, $2, (SELECT id FROM verification_codes WHERE code = $2), $3, $4, $5, $6, $7, $8, $9, now() - ($10 || ' minutes')::interval)`,
      [
        companyId,
        code,
        result,
        ['qr_web', 'sms', 'ussd'][i % 3],
        `196.43.${i % 255}.${(i * 7) % 255}`,
        Number(lat) + (Math.random() - 0.5) / 10,
        Number(lng) + (Math.random() - 0.5) / 10,
        district,
        region,
        i
      ]
    );
  }

  for (let i = 1; i <= 30; i += 1) {
    const [district, region, lat, lng] = pickDistrict();
    await client.query(
      `INSERT INTO fraud_alerts (company_id, code, alert_type, risk_level, description, locations, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        companyId,
        randomCode(i * 17),
        ['code_cloning', 'high_frequency', 'invalid_spike', 'impossible_location'][i % 4],
        ['medium', 'high', 'critical'][i % 3],
        `Suspicious verification activity detected in ${district}.`,
        JSON.stringify([{ district, region, latitude: lat, longitude: lng }]),
        i % 5 === 0 ? 'resolved' : 'open'
      ]
    );
  }

  for (let i = 1; i <= 30; i += 1) {
    const [district, region, lat, lng] = pickDistrict();
    await client.query(
      `INSERT INTO supply_chain_partners
       (company_id, name, partner_type, location, district, region, latitude, longitude, contact_name, contact_phone, contact_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        companyId,
        i <= 10 ? `Bukoola Distributor ${i}` : `Retailer ${i - 10}`,
        i <= 10 ? 'distributor' : 'retailer',
        `${district} trading center`,
        district,
        region,
        lat,
        lng,
        `Contact ${i}`,
        `+256700${String(i).padStart(6, '0')}`,
        `partner${i}@example.com`
      ]
    );
  }

  for (let i = 1; i <= 200; i += 1) {
    await client.query(
      `INSERT INTO consumer_feedback (company_id, product_id, code, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, productIds[i % productIds.length], randomCode(i), (i % 5) + 1, 'Seed consumer feedback']
    );
  }

  for (let i = 1; i <= 15; i += 1) {
    const [district, region, lat, lng] = pickDistrict();
    await client.query(
      `INSERT INTO product_reports
       (company_id, product_id, batch_id, code, issue_type, description, latitude, longitude, district, region, severity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        companyId,
        productIds[i % productIds.length],
        batchIds[i % batchIds.length],
        randomCode(i * 9),
        ['fake_product', 'expired', 'damaged_packaging', 'wrong_info', 'quality_issue'][i % 5],
        'Seed complaint for case management.',
        lat,
        lng,
        district,
        region,
        ['medium', 'high', 'critical'][i % 3],
        ['open', 'under_review', 'investigating', 'resolved', 'closed'][i % 5]
      ]
    );
  }

  await client.query(
    `INSERT INTO recall_notices (company_id, batch_id, title, reason, instructions, affected_regions)
     VALUES ($1, $2, 'RECALL ACTIVE', 'Contamination detected', 'Do not use this product. Contact Bukoola Chemicals.', ARRAY['Kampala','Mbarara'])
     ON CONFLICT DO NOTHING`,
    [companyId, batchIds[2]]
  );

  await client.query('COMMIT');
  await client.end();
  console.log('Seed data inserted for Bukoola Chemicals');
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});

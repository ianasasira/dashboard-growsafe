CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    country VARCHAR(100) DEFAULT 'Uganda',
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    subscription_plan VARCHAR(50) DEFAULT 'starter',
    subscription_status VARCHAR(30) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    refresh_token_hash TEXT,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP
);

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(company_id, name)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    category_id UUID REFERENCES product_categories(id),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active_ingredients TEXT,
    formulation VARCHAR(100),
    packaging_size VARCHAR(100),
    image_url TEXT,
    usage_information TEXT,
    safety_information TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP,
    UNIQUE(company_id, sku)
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID REFERENCES products(id),
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    manufacture_date DATE,
    expiry_date DATE,
    manufacturing_plant VARCHAR(255),
    status VARCHAR(30) DEFAULT 'manufactured',
    recall_reason TEXT,
    recall_initiated_at TIMESTAMP,
    codes_generated BOOLEAN DEFAULT false,
    codes_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP,
    UNIQUE(company_id, batch_number)
);

CREATE TABLE verification_codes (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    batch_id UUID REFERENCES batches(id),
    code VARCHAR(30) UNIQUE NOT NULL,
    qr_image_url TEXT,
    status VARCHAR(20) DEFAULT 'unscanned',
    risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    scan_count INTEGER DEFAULT 0,
    first_scanned_at TIMESTAMP,
    last_scanned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_verification_codes_code ON verification_codes(code);
CREATE INDEX idx_verification_codes_batch ON verification_codes(batch_id);
CREATE INDEX idx_verification_codes_company ON verification_codes(company_id);

CREATE TABLE scan_events (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    code VARCHAR(30) NOT NULL,
    verification_code_id BIGINT REFERENCES verification_codes(id),
    result VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    phone_number VARCHAR(30),
    ip_address VARCHAR(45),
    user_agent TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    district VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Uganda',
    scanned_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_scan_events_code ON scan_events(code);
CREATE INDEX idx_scan_events_company ON scan_events(company_id);
CREATE INDEX idx_scan_events_scanned_at ON scan_events(scanned_at);
CREATE INDEX idx_scan_events_result ON scan_events(result);
CREATE INDEX idx_scan_events_geo ON scan_events(latitude, longitude);

CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(30),
    alert_type VARCHAR(50),
    risk_level VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    locations JSONB,
    scan_event_ids BIGINT[],
    status VARCHAR(30) DEFAULT 'open',
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_fraud_alerts_company ON fraud_alerts(company_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);

CREATE TABLE fraud_rule_evaluations (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    rule_name VARCHAR(100) NOT NULL,
    code VARCHAR(30),
    matched BOOLEAN DEFAULT false,
    metadata JSONB,
    evaluated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE supply_chain_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50),
    location TEXT,
    district VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE product_journey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    batch_id UUID REFERENCES batches(id),
    partner_id UUID REFERENCES supply_chain_partners(id),
    stage VARCHAR(50),
    quantity INTEGER,
    notes TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    event_at TIMESTAMP DEFAULT now()
);

CREATE TABLE product_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID REFERENCES products(id),
    batch_id UUID REFERENCES batches(id),
    code VARCHAR(30),
    issue_type VARCHAR(100),
    description TEXT,
    image_urls TEXT[],
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    district VARCHAR(100),
    region VARCHAR(100),
    retailer_name VARCHAR(255),
    reporter_phone VARCHAR(30),
    reporter_name VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(30) DEFAULT 'open',
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE recall_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    batch_id UUID REFERENCES batches(id),
    title VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    instructions TEXT,
    severity VARCHAR(20) DEFAULT 'high',
    affected_regions TEXT[],
    initiated_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE consumer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID REFERENCES products(id),
    code VARCHAR(30),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    phone_number VARCHAR(30),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    insight_type VARCHAR(50),
    content TEXT,
    data JSONB,
    generated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    reason TEXT,
    blocked_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER fraud_alerts_updated_at BEFORE UPDATE ON fraud_alerts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON supply_chain_partners FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_reports_updated_at BEFORE UPDATE ON product_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER recall_notices_updated_at BEFORE UPDATE ON recall_notices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

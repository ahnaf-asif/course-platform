-- Create Enums
CREATE TYPE order_status AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED');
CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED');

-- Payment Gates Table (Pricing for nodes)
CREATE TABLE payment_gates (
    node_id UUID PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL
);

-- Coupons Table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL,
    max_uses INT,
    used_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    payment_provider TEXT NOT NULL,
    provider_reference TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_node_id ON orders(node_id);
CREATE INDEX idx_coupons_code ON coupons(code);

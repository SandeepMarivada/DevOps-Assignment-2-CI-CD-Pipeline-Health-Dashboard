-- CI/CD Pipeline Health Dashboard Database Initialization
-- This file is executed when the PostgreSQL container starts for the first time

-- Note: Database is already created by PostgreSQL container
-- Connect to the database
\c cicd_dashboard;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    token TEXT,
    branch VARCHAR(100) DEFAULT 'main',
    status VARCHAR(50) DEFAULT 'active',
    last_build_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create builds table
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    build_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration INTEGER,
    commit_hash VARCHAR(100),
    branch VARCHAR(100),
    triggered_by VARCHAR(255),
    environment VARCHAR(100),
    message TEXT,
    test_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    enabled BOOLEAN DEFAULT true,
    conditions JSONB,
    notifications JSONB,
    channels JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create alert_history table
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recipients JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pipelines_type ON pipelines(type);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_builds_pipeline_id ON builds(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_started_at ON builds(started_at);
CREATE INDEX IF NOT EXISTS idx_metrics_pipeline_id ON metrics(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON alerts(enabled);

-- Insert sample data for testing
INSERT INTO users (email, password_hash, name, role, company) VALUES
('demo@example.com', '$2a$10$DCag.x5Z8gS7gNuUKYQ8IOdjf6jZMUAIPVzbUchw267KuPaYHkkfG', 'Demo User', 'admin', 'Demo Company')
ON CONFLICT (email) DO NOTHING;

INSERT INTO pipelines (name, type, url, token, branch, status) VALUES
('Sample GitHub Actions', 'github-actions', 'https://github.com/demo/repo', 'demo-token', 'main', 'active'),
('Sample Jenkins', 'jenkins', 'http://jenkins:8080', 'demo-token', 'main', 'active')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

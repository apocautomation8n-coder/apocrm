-- Add type to agents to distinguish between outbound and inbound
ALTER TABLE agents ADD COLUMN type TEXT CHECK (type IN ('outbound', 'inbound')) DEFAULT 'outbound';

-- Update existing agents to outbound (redundant due to default, but good for clarity)
UPDATE agents SET type = 'outbound' WHERE type IS NULL;

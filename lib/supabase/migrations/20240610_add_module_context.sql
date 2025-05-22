-- Add a context field to modules table
ALTER TABLE modules ADD COLUMN context TEXT DEFAULT 'standard';

-- Create an index on the context column for faster querying
CREATE INDEX idx_modules_context ON modules(context);

-- Update existing job readiness modules to have the correct context
UPDATE modules 
SET context = 'job_readiness' 
WHERE id IN (
  SELECT m.id 
  FROM modules m
  JOIN job_readiness_products jrp ON m.product_id = jrp.product_id
);

-- Create a comment to document the purpose of this field
COMMENT ON COLUMN modules.context IS 'Indicates the context/system this module belongs to (e.g., standard, job_readiness)'; 
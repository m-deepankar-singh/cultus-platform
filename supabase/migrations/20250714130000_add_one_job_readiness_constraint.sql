-- Migration: Add constraint to ensure only one job readiness product per client
-- This implements both database-level and function-based validation

-- Step 1: Create a unique partial index to prevent multiple job readiness products per client
-- This is the primary database-level constraint
-- Note: We'll use the trigger for validation since PostgreSQL doesn't support complex subqueries in partial indexes
-- The trigger provides the same protection with better error messages

-- Step 2: Create a validation function that can be used by triggers or API
CREATE OR REPLACE FUNCTION validate_job_readiness_assignment()
RETURNS TRIGGER AS $$
DECLARE
    existing_jr_count INTEGER;
    is_job_readiness BOOLEAN;
BEGIN
    -- Check if the product being assigned is a job readiness product
    SELECT p.type = 'JOB_READINESS'
    INTO is_job_readiness
    FROM products p
    WHERE p.id = NEW.product_id;
    
    -- If it's not a job readiness product, allow the assignment
    IF NOT is_job_readiness THEN
        RETURN NEW;
    END IF;
    
    -- If it is a job readiness product, check if client already has one
    SELECT COUNT(*)
    INTO existing_jr_count
    FROM client_product_assignments cpa
    JOIN products p ON cpa.product_id = p.id
    WHERE cpa.client_id = NEW.client_id
    AND p.type = 'JOB_READINESS'
    AND cpa.product_id != NEW.product_id; -- Exclude the current assignment for updates
    
    -- If client already has a job readiness product, prevent the assignment
    IF existing_jr_count > 0 THEN
        RAISE EXCEPTION 'Client can only be assigned one job readiness product. Remove existing job readiness product before assigning a new one.'
            USING ERRCODE = 'unique_violation',
                  HINT = 'Check existing client product assignments for job readiness products.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to enforce the validation on INSERT and UPDATE
CREATE TRIGGER trigger_validate_job_readiness_assignment
    BEFORE INSERT OR UPDATE ON client_product_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_job_readiness_assignment();

-- Step 4: Add helpful function for API layer to check job readiness constraints
CREATE OR REPLACE FUNCTION check_client_job_readiness_eligibility(
    p_client_id UUID,
    p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_job_readiness BOOLEAN := FALSE;
    existing_jr_product_id UUID;
    existing_jr_product_name TEXT;
    result JSONB;
BEGIN
    -- Check if the product is a job readiness product
    SELECT p.type = 'JOB_READINESS'
    INTO is_job_readiness
    FROM products p
    WHERE p.id = p_product_id;
    
    -- If not a job readiness product, assignment is allowed
    IF NOT is_job_readiness THEN
        RETURN jsonb_build_object(
            'eligible', true,
            'reason', 'Product is not a job readiness product',
            'existing_job_readiness_product', null
        );
    END IF;
    
    -- Check for existing job readiness product assignment
    SELECT p.id, p.name
    INTO existing_jr_product_id, existing_jr_product_name
    FROM client_product_assignments cpa
    JOIN products p ON cpa.product_id = p.id
    WHERE cpa.client_id = p_client_id
    AND p.type = 'JOB_READINESS'
    AND p.id != p_product_id
    LIMIT 1;
    
    -- If existing job readiness product found, assignment is not allowed
    IF existing_jr_product_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'Client already has a job readiness product assigned',
            'existing_job_readiness_product', jsonb_build_object(
                'id', existing_jr_product_id,
                'name', existing_jr_product_name
            )
        );
    END IF;
    
    -- No existing job readiness product, assignment is allowed
    RETURN jsonb_build_object(
        'eligible', true,
        'reason', 'No existing job readiness product found',
        'existing_job_readiness_product', null
    );
END;
$$;

-- Step 5: Add comments for documentation
COMMENT ON INDEX idx_client_one_job_readiness_product IS 
'Ensures each client can only be assigned one job readiness product (type = JOB_READINESS)';

COMMENT ON FUNCTION validate_job_readiness_assignment() IS 
'Trigger function that validates job readiness product assignments before INSERT/UPDATE';

COMMENT ON FUNCTION check_client_job_readiness_eligibility(UUID, UUID) IS 
'Helper function for API layer to check if a client can be assigned a job readiness product';

COMMENT ON TRIGGER trigger_validate_job_readiness_assignment ON client_product_assignments IS 
'Enforces the one job readiness product per client rule at the database level';
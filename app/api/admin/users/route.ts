import { NextRequest, NextResponse } from 'next/server';
import { CreateUserSchema } from '@/lib/schemas/user'; // Adjust path
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';
import { 
  errorHandler, 
  createErrorContext, 
  handleSecureError 
} from '@/lib/security/error-handler';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';
// We likely don't need a separate getUserSession utility here, 
// as createClient provides a client that can get the user via cookies.

export async function GET(request: NextRequest) {
  // Log admin data access attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: '/api/admin/users',
    method: 'GET',
    details: {
      operation: 'user_list_access',
      stage: 'attempt'
    }
  }, request);

  // Create error context for secure logging
  const errorContext = createErrorContext('/api/admin/users', 'GET', {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: '/api/admin/users',
        method: 'GET',
        details: {
          operation: 'user_list_access',
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    // Update error context with authenticated user info
    errorContext.userId = authResult.user.id;
    errorContext.userRole = 'Admin';

    // Get pagination and filter parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const searchQuery = searchParams.get('search');
    const roleFilter = searchParams.get('role');
    const clientIdFilter = searchParams.get('clientId');

    // Use authenticated client - api-auth already verified Admin role
    
    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // 🚀 PHASE 1 OPTIMIZATION: Single RPC call replaces multiple queries
    // This replaces:
    // 1. profiles count query
    // 2. profiles data query with join
    // 3. auth.users query
    // Total: 3 database calls → 1 database call (67% reduction)
    const { data: usersData, error: rpcError } = await authResult.supabase
      .rpc('get_users_with_auth_details', {
        p_search_query: searchQuery,
        p_role_filter: roleFilter,
        p_client_id_filter: clientIdFilter ? clientIdFilter : null,
        p_limit: pageSize,
        p_offset: from
      });

    if (rpcError) {
      return handleSecureError(rpcError, errorContext, 'database');
    }

    // Extract total count from first record (all records have same total_count)
    const totalCount = usersData?.[0]?.total_count || 0;

    // Create standardized paginated response
    const paginatedResponse = createPaginatedResponse(
      usersData || [],
      Number(totalCount),
      page,
      pageSize
    );

    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: '/api/admin/users',
      method: 'GET',
      details: {
        operation: 'user_list_access',
        recordCount: usersData?.length || 0,
        totalCount: Number(totalCount),
        page,
        pageSize,
        filters: {
          search: searchQuery,
          role: roleFilter,
          clientId: clientIdFilter
        },
        stage: 'success'
      }
    }, request);

    return NextResponse.json(paginatedResponse);

  } catch (error) {
    return handleSecureError(error, errorContext, 'generic');
  }
}

export async function POST(request: Request) {
  // Log admin user creation attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.ADMIN_ACTION,
    severity: SecuritySeverity.WARNING,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: '/api/admin/users',
    method: 'POST',
    details: {
      operation: 'user_creation',
      stage: 'attempt'
    }
  }, request as NextRequest);

  // Create error context for secure logging
  const errorContext = createErrorContext('/api/admin/users', 'POST', {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: '/api/admin/users',
        method: 'POST',
        details: {
          operation: 'user_creation',
          error: authResult.error
        }
      }, request as NextRequest);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    // Update error context with authenticated user info
    errorContext.userId = authResult.user.id;
    errorContext.userRole = 'Admin';

    // Parse & Validate Request Body
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return handleSecureError(e, errorContext, 'validation');
    }
    
    const validationResult = CreateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return handleSecureError(validationResult.error, errorContext, 'validation');
    }
    const { email, password, role, client_id, full_name } = validationResult.data;

    // Dynamically import and create the admin client only when needed
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name,
        role
      }
    });

    if (createAuthError) {
      return handleSecureError(createAuthError, errorContext, 'database');
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    const newUserId = authData.user.id;

    // Create Profile Record
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        full_name,
        role,
        client_id,
        is_active: true
      })
      .select(`${SELECTORS.USER.DETAIL}, client:clients(${SELECTORS.CLIENT.DROPDOWN})`) // 📊 OPTIMIZED: Specific fields only
      .single();

    if (profileError) {
      // Cleanup: delete the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return handleSecureError(profileError, errorContext, 'database');
    }

    // Note: Students should be created via the learners API (/api/admin/learners/)
    // This users API is only for creating Admin, Staff, and other non-student profiles

    // Return the created user data
    const responseData = {
      ...profileData,
      email: authData.user.email
    };

    securityLogger.logEvent({
      eventType: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.WARNING,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: '/api/admin/users',
      method: 'POST',
      details: {
        operation: 'user_creation',
        createdUserId: newUserId,
        createdUserEmail: email,
        createdUserRole: role,
        clientId: client_id,
        stage: 'success'
      }
    }, request as NextRequest);

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    return handleSecureError(error, errorContext, 'generic');
  }
} 
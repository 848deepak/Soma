/**
 * src/services/careCircleService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Care Circle Service - non-breaking wrapper around partner infrastructure
 * for role-based sharing system.
 *
 * Exports functions:
 *   - createConnection(code, role) – initiate a connection with role
 *   - acceptConnection(id) – accept pending connection (future multi-pending support)
 *   - getConnections(userId) – list all active connections
 *   - getSharedData(userId, partnerId, permissions) – fetch role-filtered shared data
 *   - updatePermissions(connectionId, permissions) – modify share toggles
 *   - revokeConnection(connectionId) – end a connection
 *
 * All functions delegate to existing supabase client + RPCs or new queries.
 * Error handling: throws descriptive errors for invalid codes, expired invites, or permission mismatches.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from '@/lib/supabase';
import { logDataAccess } from '@/src/services/auditService';
import type { PartnerRow, CareCircleRole, SharedDataLog, PartnerPermissions } from '@/types/database';

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a Care Circle connection by entering a partner's invite code.
 * Internally calls link_partner(code, role) RPC.
 * @param code – 6-character invite code (e.g., "AB-12-CD")
 * @param role – Care Circle role: 'viewer' | 'trusted' | 'mutual' (default: 'viewer')
 * @returns Created PartnerRow with role and permissions snapshot
 * @throws on invalid code, self-link, or network error
 */
export async function createConnection(
  code: string,
  role: CareCircleRole = 'viewer',
): Promise<PartnerRow> {
  if (!code || code.trim().length === 0) {
    throw new Error('Invite code cannot be empty');
  }

  if (!['viewer', 'trusted', 'mutual'].includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const { data, error } = await supabase.rpc('link_partner', {
    code: code.trim().toUpperCase(),
    role,
  });

  if (error) {
    if (error.message?.includes('Invalid partner code')) {
      throw new Error('Invalid or expired invite code. Please check and try again.');
    }
    if (error.message?.includes('cannot link to yourself')) {
      throw new Error('You cannot link to yourself.');
    }
    throw error;
  }

  if (!data || !data.id) {
    throw new Error('Failed to create connection. Please try again.');
  }

  void logDataAccess('care_circle', 'create_connection', {
    role,
    status: data.status,
  });

  return data as PartnerRow;
}

/**
 * Get all active Care Circle connections for the current user (both perspectives).
 * @returns Object with asPrimary (I share) and asViewer (I view)
 */
export async function getConnections() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { asPrimary: [], asViewer: [] };
  }

  const [primaryResult, viewerResult] = await Promise.all([
    supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('partners')
      .select('*')
      .eq('partner_user_id', user.id)
      .eq('status', 'active'),
  ]);

  if (primaryResult.error) throw primaryResult.error;
  if (viewerResult.error) throw viewerResult.error;

  void logDataAccess('care_circle', 'get_connections', {
    primaryCount: primaryResult.data?.length ?? 0,
    viewerCount: viewerResult.data?.length ?? 0,
  });

  return {
    asPrimary: (primaryResult.data as unknown as PartnerRow[]) ?? [],
    asViewer: (viewerResult.data as unknown as PartnerRow[]) ?? [],
  };
}

/**
 * Fetch role-filtered shared data for a connection.
 * Queries the shared_data view with the connection's role and permission settings.
 * @param partnerId – the data owner's user ID
 * @param limit – max rows to fetch (default: 7 for recent activity)
 * @returns Array of SharedDataLog rows with fields filtered by role + permissions
 */
export async function getSharedData(
  partnerId: string,
  limit: number = 7,
): Promise<SharedDataLog[]> {
  const { data, error } = await supabase
    .from('shared_data')
    .select('*')
    .eq('user_id', partnerId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    // RLS or permission errors are expected if connection doesn't exist or is revoked
    if (error.code === 'PGRST116') {
      throw new Error('Connection not found or access denied.');
    }
    throw error;
  }

  const rows = (data ?? []) as unknown as SharedDataLog[];

  void logDataAccess('care_circle', 'get_shared_data', {
    partnerId,
    resultCount: rows.length,
    limit,
  });

  return rows;
}

/**
 * Update Care Circle permissions for a connection.
 * Called when toggling share_mood, share_symptoms, share_notes, or share_fertility.
 * @param connectionId – the partners row id
 * @param updates – partial PartnerPermissions to merge
 * @returns Updated PartnerRow
 */
export async function updatePermissions(
  connectionId: string,
  updates: Partial<PartnerPermissions>,
): Promise<PartnerRow> {
  // Fetch the current permissions
  const { data: current, error: fetchError } = await supabase
    .from('partners')
    .select('permissions')
    .eq('id', connectionId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!current) {
    throw new Error('Connection not found.');
  }

  // Merge updates with existing permissions
  const merged = {
    ...(current.permissions as PartnerPermissions),
    ...updates,
  };

  // Update the row
  const { data, error } = await supabase
    .from('partners')
    .update({ permissions: merged })
    .eq('id', connectionId)
    .select()
    .single();

  if (error) throw error;

  void logDataAccess('care_circle', 'update_permissions', {
    connectionId,
    updatedKeys: Object.keys(updates),
  });

  return data as unknown as PartnerRow;
}

/**
 * Revoke a Care Circle connection (set status to 'revoked').
 * The data owner revokes access from a viewer.
 * @param connectionId – the partners row id
 */
export async function revokeConnection(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .update({ status: 'revoked' })
    .eq('id', connectionId);

  if (error) throw error;

  void logDataAccess('care_circle', 'revoke_connection', {
    connectionId,
  });
}

/**
 * Accept a pending connection (future multi-pending support).
 * For now, connections are auto-accepted on creation, but this hook
 * allows future UI where acceptance is explicit.
 * @param connectionId – the partners row id
 */
export async function acceptConnection(connectionId: string): Promise<PartnerRow> {
  const { data, error } = await supabase
    .from('partners')
    .update({ status: 'active' })
    .eq('id', connectionId)
    .select()
    .single();

  if (error) throw error;

  void logDataAccess('care_circle', 'accept_connection', {
    connectionId,
  });

  return data as unknown as PartnerRow;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS (optional; used by mutation hooks)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Coerce legacy and new PartnerPermissions to a safe default structure.
 * Ensures backward compatibility for rows created without role/share_notes.
 * @param perms – potentially incomplete JSONB permissions object
 * @returns fully hydrated PartnerPermissions with safe defaults
 */
export function coercePermissions(perms: any): PartnerPermissions {
  return {
    share_mood: perms?.share_mood ?? true,
    share_fertility: perms?.share_fertility ?? true,
    share_symptoms: perms?.share_symptoms ?? false,
    share_notes: perms?.share_notes ?? false,
    role: perms?.role ?? 'viewer',
  };
}

/**
 * Check if a role allows viewing a specific field.
 * @param role – 'viewer' | 'trusted' | 'mutual'
 * @param field – 'mood' | 'symptoms' | 'notes' | 'fertility'
 * @returns true if role can access field when permission is enabled
 */
export function roleAllowsField(role: CareCircleRole, field: string): boolean {
  if (role === 'viewer') {
    return field === 'fertility'; // viewers see fertility/cycles only
  }
  if (role === 'trusted' || role === 'mutual') {
    return true; // trusted+ can see all fields that have permissions enabled
  }
  return false;
}

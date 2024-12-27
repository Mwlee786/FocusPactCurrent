import { supabase } from './supabaseClient';
import type { AppLimit, LimitType } from '../../native/UsageStats';

export interface AppLimitRecord {
  id: string;
  user_id: string;
  package_name: string;
  app_name: string;
  time_limit_value: number | null;
  session_limit_value: number | null;
  time_limit_enabled: boolean;
  session_limit_enabled: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const checkAuth = async () => {
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('DEBUG: Session check:', {
    hasSession: !!session,
    sessionError,
    sessionUser: session?.user?.id
  });

  if (sessionError || !session?.user) {
    console.error('DEBUG: Session error or no user:', sessionError);
    throw new Error('Authentication failed');
  }

  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  console.log('DEBUG: Profile check:', {
    hasProfile: !!profile,
    profileError,
    profileId: profile?.id
  });

  if (!profile && !profileError) {
    // Create profile if it doesn't exist
    console.log('DEBUG: Creating new profile for user:', session.user.id);
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: session.user.id,
        username: session.user.email?.split('@')[0] || 'user',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('DEBUG: Failed to create profile:', createError);
      throw new Error('Failed to create user profile');
    }

    console.log('DEBUG: Created new profile:', newProfile);
    return session.user;
  }

  if (profileError) {
    console.error('DEBUG: Profile error:', profileError);
    throw new Error('Failed to verify user profile');
  }

  return session.user;
};

export const saveAppLimit = async (
  packageName: string,
  appName: string,
  limitType: LimitType,
  value: number | null,
  isPublic: boolean
): Promise<AppLimitRecord | null> => {
  try {
    const user = await checkAuth();
    
    console.log('DEBUG: Attempting operation with user:', {
      id: user.id,
      email: user.email,
      aud: user.aud
    });

    const updateData = {
      user_id: user.id,
      package_name: packageName,
      app_name: appName,
      time_limit_value: limitType === 'time' ? value : null,
      session_limit_value: limitType === 'sessions' ? value : null,
      time_limit_enabled: limitType === 'time' ? value !== null : false,
      session_limit_enabled: limitType === 'sessions' ? value !== null : false,
      is_public: isPublic
    };

    console.log('DEBUG: Attempting insert with data:', JSON.stringify(updateData, null, 2));

    // Check if record exists first
    const { data: existing, error: checkError } = await supabase
      .from('app_limits')
      .select('*')
      .eq('package_name', packageName)
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('DEBUG: Existing record check:', {
      exists: !!existing,
      error: checkError
    });

    if (existing) {
      // Update
      const { data: updatedData, error: updateError } = await supabase
        .from('app_limits')
        .update(updateData)
        .eq('package_name', packageName)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('DEBUG: Update error:', updateError);
        throw updateError;
      }

      return updatedData;
    } else {
      // Insert
      const { data: insertedData, error: insertError } = await supabase
        .from('app_limits')
        .insert(updateData)
        .select()
        .single();

      if (insertError) {
        console.error('DEBUG: Insert error:', insertError);
        throw insertError;
      }

      return insertedData;
    }
  } catch (error) {
    console.error('Error saving app limit:', error);
    throw error;
  }
};

export const removeAppLimit = async (packageName: string): Promise<boolean> => {
  try {
    const user = await checkAuth();
    console.log('DEBUG: Removing limit for package:', packageName);

    const { error } = await supabase
      .from('app_limits')
      .delete()
      .eq('package_name', packageName)
      .eq('user_id', user.id);

    if (error) {
      console.error('DEBUG: Error removing limit:', error);
      return false;
    }

    console.log('DEBUG: Successfully removed limit');
    return true;
  } catch (error) {
    console.error('Error removing app limit:', error);
    return false;
  }
};

export const getAppLimits = async (): Promise<AppLimitRecord[]> => {
  try {
    const user = await checkAuth();
    const { data, error } = await supabase
      .from('app_limits')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting app limits:', error);
    throw error;
  }
};

export const getAppLimit = async (packageName: string): Promise<AppLimitRecord | null> => {
  try {
    const user = await checkAuth();
    const { data, error } = await supabase
      .from('app_limits')
      .select('*')
      .eq('package_name', packageName)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error getting app limit:', error);
    throw error;
  }
}; 
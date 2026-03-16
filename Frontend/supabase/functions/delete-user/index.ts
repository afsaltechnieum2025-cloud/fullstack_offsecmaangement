// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
//     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

//     // Create admin client
//     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

//     // Get the authorization header from the request
//     const authHeader = req.headers.get('Authorization');
//     if (!authHeader) {
//       return new Response(
//         JSON.stringify({ error: 'No authorization header' }),
//         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       );
//     }

//     // Verify the requesting user is an admin
//     const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
//       authHeader.replace('Bearer ', '')
//     );

//     if (authError || !requestingUser) {
//       return new Response(
//         JSON.stringify({ error: 'Invalid token' }),
//         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       );
//     }

//     // Check if requesting user is admin
//     const { data: roleData, error: roleError } = await supabaseAdmin
//       .from('user_roles')
//       .select('role')
//       .eq('user_id', requestingUser.id)
//       .single();

//     if (roleError || roleData?.role !== 'admin') {
//       return new Response(
//         JSON.stringify({ error: 'Only admins can delete users' }),
//         { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       );
//     }

//     // Get the user ID to delete from the request body
//     const { userId } = await req.json();

//     if (!userId) {
//       return new Response(
//         JSON.stringify({ error: 'User ID is required' }),
//         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       );
//     }

//     // Prevent self-deletion
//     if (userId === requestingUser.id) {
//       return new Response(
//         JSON.stringify({ error: 'You cannot delete your own account' }),
//         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       );
//     }

//     // Delete the user from auth (this will cascade to profiles and roles due to foreign keys)
//     const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

//     if (deleteError) {
//       return new Response(
//         JSON.stringify({ error: deleteError.message }),
//         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       );
//     }

//     return new Response(
//       JSON.stringify({ success: true, message: 'User deleted successfully' }),
//       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//     );

//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//     return new Response(
//       JSON.stringify({ error: errorMessage }),
//       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//     );
//   }
// });

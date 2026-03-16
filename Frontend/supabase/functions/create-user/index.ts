// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
// };

// serve(async (req) => {
//   if (req.method === "OPTIONS") {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
//     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
//     // Create admin client
//     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
//       auth: {
//         autoRefreshToken: false,
//         persistSession: false,
//       },
//     });

//     // Verify the requesting user is an admin
//     const authHeader = req.headers.get("Authorization");
//     if (!authHeader) {
//       return new Response(JSON.stringify({ error: "No authorization header" }), {
//         status: 401,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     const token = authHeader.replace("Bearer ", "");
//     const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
//     if (authError || !requestingUser) {
//       return new Response(JSON.stringify({ error: "Invalid token" }), {
//         status: 401,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     // Check if requesting user is admin
//     const { data: roleData } = await supabaseAdmin
//       .from("user_roles")
//       .select("role")
//       .eq("user_id", requestingUser.id)
//       .single();

//     if (!roleData || roleData.role !== "admin") {
//       return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), {
//         status: 403,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     const { email, password, username, role } = await req.json();

//     if (!email || !password || !username || !role) {
//       return new Response(JSON.stringify({ error: "Missing required fields" }), {
//         status: 400,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     // Create user using admin API
//     const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
//       email,
//       password,
//       email_confirm: true,
//       user_metadata: { username },
//     });

//     if (createError) {
//       return new Response(JSON.stringify({ error: createError.message }), {
//         status: 400,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     // Add role for the new user
//     const { error: roleError } = await supabaseAdmin
//       .from("user_roles")
//       .insert({ user_id: newUser.user.id, role });

//     if (roleError) {
//       console.error("Error setting role:", roleError);
//     }

//     return new Response(
//       JSON.stringify({ success: true, user: { id: newUser.user.id, email } }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("Error:", error);
//     const errorMessage = error instanceof Error ? error.message : "Unknown error";
//     return new Response(JSON.stringify({ error: errorMessage }), {
//       status: 500,
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }
// });

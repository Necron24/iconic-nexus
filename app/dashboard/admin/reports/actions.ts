"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function resolveReport(formData:FormData){const id=String(formData.get('id')||'');const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');const {data:p}=await supabase.from('profiles').select('is_admin').eq('id',user.id).single();if(!p?.is_admin)redirect('/dashboard');await supabase.from('reports').update({resolved:true,resolved_at:new Date().toISOString(),resolved_by:user.id}).eq('id',id);revalidatePath('/dashboard/admin/reports');}

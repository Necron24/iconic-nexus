"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
function fail(message:string):never{redirect(`/dashboard/team?error=${encodeURIComponent(message)}`)}
export async function createWorkspace(formData:FormData){const name=String(formData.get("name")??"").trim();if(name.length<2)fail("Enter a workspace name.");const s=await createClient();const {error}=await s.rpc("create_organization",{p_name:name});if(error)fail(error.message);revalidatePath("/dashboard/team");redirect("/dashboard/team?success=Workspace created.");}
export async function addTeamMember(formData:FormData){const organizationId=String(formData.get("organizationId")??"");const email=String(formData.get("email")??"").trim();const role=String(formData.get("role")??"viewer");const s=await createClient();const {error}=await s.rpc("add_organization_member",{p_organization_id:organizationId,p_email:email,p_role:role});if(error)fail(error.message);revalidatePath("/dashboard/team");redirect("/dashboard/team?success=Team member added.");}

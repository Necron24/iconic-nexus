"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const topics=new Set(["overall","design","testing","community","payments","other"]);
export async function saveSiteReview(formData:FormData){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login?next=/rate");
 const rating=Number(formData.get("rating")),topic=String(formData.get("topic")||""),review=String(formData.get("review")||"").trim(),publicConsent=formData.get("publicConsent")==="on";
 if(!Number.isInteger(rating)||rating<1||rating>5||!topics.has(topic)||review.length<10||review.length>1200) redirect("/rate?error=Please%20complete%20a%20valid%20rating%20and%20review.");
 const {error}=await supabase.from("site_reviews").upsert({profile_id:user.id,rating,topic,review,public_consent:publicConsent,moderation_status:"pending",updated_at:new Date().toISOString()},{onConflict:"profile_id"});
 if(error) redirect(`/rate?error=${encodeURIComponent(error.message)}`); revalidatePath("/"); revalidatePath("/dashboard/admin/reviews"); redirect("/rate?success=Thank%20you.%20Your%20review%20has%20been%20saved.");
}

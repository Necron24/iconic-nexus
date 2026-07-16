import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayFastSignature, payFastProcessUrl } from "@/lib/payfast";

export const runtime = "nodejs";
function absoluteUrl(path: string) { const base=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,""); if(!base) throw new Error("NEXT_PUBLIC_SITE_URL is missing."); return `${base}${path}`; }
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]||c);}

export async function POST(request: Request) {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user) return NextResponse.redirect(new URL("/login",request.url),303);
 const form=await request.formData(); const planCode=String(form.get("planCode")??"").trim();
 const {data,error}=await supabase.rpc("create_subscription_order",{p_plan_code:planCode}); const order=Array.isArray(data)?data[0]:data;
 if(error||!order) return NextResponse.redirect(new URL(`/dashboard/subscription?error=${encodeURIComponent(error?.message||"Subscription order failed.")}`,request.url),303);
 const merchantId=process.env.PAYFAST_MERCHANT_ID?.trim(); const merchantKey=process.env.PAYFAST_MERCHANT_KEY?.trim();
 if(!merchantId||!merchantKey) return NextResponse.redirect(new URL("/dashboard/subscription?error=PayFast+is+not+configured.",request.url),303);
 const today=new Date().toISOString().slice(0,10);
 const fields:Record<string,string>={merchant_id:merchantId,merchant_key:merchantKey,return_url:absoluteUrl("/dashboard/subscription?success=Subscription+payment+received.+Activation+will+follow+after+verification."),cancel_url:absoluteUrl("/dashboard/subscription?error=Subscription+checkout+was+cancelled."),notify_url:absoluteUrl("/api/payfast/notify"),name_first:String(user.user_metadata?.display_name||"Iconic Nexus"),email_address:user.email||"",m_payment_id:String(order.order_id),amount:Number(order.amount_zar).toFixed(2),item_name:`${order.plan_name} subscription`,item_description:"Monthly Iconic Nexus membership",custom_str1:user.id,custom_str2:String(order.plan_code),custom_str5:"subscription",subscription_type:"1",billing_date:today,recurring_amount:Number(order.amount_zar).toFixed(2),frequency:"3",cycles:"0"};
 fields.signature=createPayFastSignature(fields);
 const inputs=Object.entries(fields).map(([k,v])=>`<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`).join("");
 return new NextResponse(`<!doctype html><html><body><form id="pf" method="post" action="${payFastProcessUrl()}">${inputs}</form><script>document.getElementById('pf').submit()</script></body></html>`,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
}

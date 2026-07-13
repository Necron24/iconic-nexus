"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateImageFile } from "@/lib/security/image-file";

const bucket = "feedback-media";
const maxSize = 5 * 1024 * 1024;

function fail(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }
function intField(data: FormData, name: string, min: number, max: number, path: string) {
  const value = Number(String(data.get(name) ?? ""));
  if (!Number.isInteger(value) || value < min || value > max) fail(path, `${name} must be between ${min} and ${max}.`);
  return value;
}

async function ownedMembership(supabase: Awaited<ReturnType<typeof createClient>>, membershipId: string, userId: string) {
  const { data } = await supabase.from("campaign_members").select("id, tester_id, status, campaign_id, testing_campaigns!inner(id, minimum_minutes, projects!inner(id, owner_id))").eq("id", membershipId).eq("tester_id", userId).maybeSingle();
  return data;
}

function storagePathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

export async function logTestSession(membershipId: string, formData: FormData) {
  const path = `/dashboard/testing/${membershipId}`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await ownedMembership(supabase, membershipId, user.id);
  if (!membership) fail("/dashboard/testing", "Testing membership not found.");
  if (["submitted", "approved"].includes(membership.status)) fail(path, "You cannot add sessions after submitting feedback.");
  const minutes = intField(formData, "minutesTested", 1, 600, path);
  const device = String(formData.get("deviceName") ?? "").trim();
  const os = String(formData.get("osVersion") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!device) fail(path, "Device name is required.");
  const { error } = await supabase.from("test_sessions").insert({ campaign_member_id: membershipId, minutes_tested: minutes, device_name: device, os_version: os || null, notes: notes || null });
  if (error) fail(path, error.message);
  if (membership.status === "joined") await supabase.from("campaign_members").update({ status: "in_progress" }).eq("id", membershipId).eq("tester_id", user.id);
  revalidatePath(path);
  revalidatePath("/dashboard/testing");
  redirect(`${path}?success=${encodeURIComponent("Test session saved.")}`);
}

export async function submitFeedback(membershipId: string, formData: FormData) {
  const path = `/dashboard/testing/${membershipId}`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await ownedMembership(supabase, membershipId, user.id);
  if (!membership) fail("/dashboard/testing", "Testing membership not found.");
  if (["submitted", "approved"].includes(membership.status)) fail(path, "Feedback has already been submitted.");
  const campaign = Array.isArray(membership.testing_campaigns) ? membership.testing_campaigns[0] : membership.testing_campaigns;
  const { data: sessions } = await supabase.from("test_sessions").select("minutes_tested").eq("campaign_member_id", membershipId);
  const total = (sessions ?? []).reduce((sum, s) => sum + s.minutes_tested, 0);
  if (!campaign || total < campaign.minimum_minutes) fail(path, `Log at least ${campaign?.minimum_minutes ?? 0} testing minutes before submitting.`);

  const severity = String(formData.get("severity") ?? "none");
  if (!["none", "minor", "major", "critical"].includes(severity)) fail(path, "Choose a valid bug severity.");
  const whatWorked = String(formData.get("whatWorked") ?? "").trim();
  const confusing = String(formData.get("whatWasConfusing") ?? "").trim();
  const bugDetails = String(formData.get("bugDetails") ?? "").trim();
  if (!whatWorked || !confusing) fail(path, "The main feedback fields are required.");
  const ratings = {
    performance_rating: intField(formData, "performanceRating", 1, 5, path),
    stability_rating: intField(formData, "stabilityRating", 1, 5, path),
    usability_rating: intField(formData, "usabilityRating", 1, 5, path),
    overall_rating: intField(formData, "overallRating", 1, 5, path)
  };

  const files = formData.getAll("attachments").filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length > 5) fail(path, "Upload a maximum of 5 screenshots.");
  for (const file of files) {
    try { await validateImageFile(file, maxSize, "Feedback attachment"); }
    catch (error) { fail(path, error instanceof Error ? error.message : "Invalid feedback attachment."); }
  }

  const reportPayload = {
    installation_success: formData.get("installationSuccess") === "true",
    crash_found: formData.get("crashFound") === "true",
    severity,
    what_worked: whatWorked,
    what_was_confusing: confusing,
    bug_details: bugDetails || null,
    review_note: null,
    reviewed_at: null,
    reviewed_by: null,
    review_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...ratings
  };

  const { data: existing } = await supabase.from("feedback_reports").select("id,feedback_attachments(id,file_url)").eq("campaign_member_id", membershipId).maybeSingle();
  let reportId = existing?.id as string | undefined;
  if (reportId) {
    const oldAttachments = existing?.feedback_attachments ?? [];
    if (oldAttachments.length) {
      await supabase.from("feedback_attachments").delete().eq("feedback_report_id", reportId);
      const paths = oldAttachments.map((a) => storagePathFromPublicUrl(a.file_url)).filter((v): v is string => Boolean(v));
      if (paths.length) await supabase.storage.from(bucket).remove(paths);
    }
    const { error } = await supabase.from("feedback_reports").update(reportPayload).eq("id", reportId);
    if (error) fail(path, error.message);
  } else {
    const { data: report, error } = await supabase.from("feedback_reports").insert({ campaign_member_id: membershipId, ...reportPayload }).select("id").single();
    if (error || !report) fail(path, error?.message || "Feedback could not be submitted.");
    reportId = report.id;
  }

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const objectPath = `${user.id}/${membershipId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      uploaded.push(objectPath);
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      const { error: attachError } = await supabase.from("feedback_attachments").insert({ feedback_report_id: reportId, file_url: publicData.publicUrl, file_type: file.type });
      if (attachError) throw new Error(attachError.message);
    }
    const { error: statusError } = await supabase.from("campaign_members").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", membershipId).eq("tester_id", user.id);
    if (statusError) throw new Error(statusError.message);
    const project = Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects;
    if (project?.owner_id && project?.id) {
      await supabase.from("notifications").insert({
        profile_id: project.owner_id,
        type: "feedback_submitted",
        title: "Feedback ready for review",
        message: "A tester submitted feedback. It will auto-approve after 7 days if no action is taken.",
        link_url: `/dashboard/projects/${project.id}/campaigns/${membership.campaign_id}/feedback`
      });
    }
  } catch (e) {
    if (uploaded.length) await supabase.storage.from(bucket).remove(uploaded);
    fail(path, e instanceof Error ? e.message : "Feedback attachments could not be saved.");
  }

  revalidatePath(path); revalidatePath("/dashboard/testing"); revalidatePath(`/campaigns/${membership.campaign_id}`);
  redirect(`${path}?success=${encodeURIComponent("Feedback submitted. The developer has 7 days to review it.")}`);
}

export async function reviewFeedback(membershipId: string, campaignId: string, projectId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/campaigns/${campaignId}/feedback`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();
  if (!["approve", "reject"].includes(decision)) fail(path, "Choose approve or request changes.");
  if (decision === "reject" && note.length < 10) fail(path, "Explain clearly what must be changed before requesting changes.");
  const { error } = await supabase.rpc("review_testing_feedback", { p_member_id: membershipId, p_approve: decision === "approve", p_review_note: note || null });
  if (error) fail(path, error.message);
  revalidatePath(path); revalidatePath("/dashboard"); revalidatePath("/dashboard/testing"); revalidatePath("/dashboard/credits");
  redirect(`${path}?success=${encodeURIComponent(decision === "approve" ? "Feedback approved and credits awarded." : "Feedback returned to the tester. They may appeal the decision.")}`);
}

export async function openFeedbackDispute(membershipId: string, formData: FormData) {
  const path = `/dashboard/testing/${membershipId}`;
  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 20 || reason.length > 2000) fail(path, "Explain the dispute in 20–2000 characters.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("open_feedback_dispute", { p_member_id: membershipId, p_reason: reason });
  if (error) fail(path, error.message);
  revalidatePath(path); revalidatePath("/dashboard/admin/reports");
  redirect(`${path}?success=${encodeURIComponent("Your appeal was submitted for admin review.")}`);
}

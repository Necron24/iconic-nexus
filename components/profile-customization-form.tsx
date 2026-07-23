"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Github, Globe2, LayoutTemplate, MapPin, Palette, Sparkles } from "lucide-react";
import { ImageUploadField } from "@/components/image-upload-field";

const colours = [
  ["lime", "Lime", "#9EFF3A"], ["cyan", "Cyan", "#57E6FF"],
  ["violet", "Violet", "#A78BFA"], ["amber", "Amber", "#FBBF24"],
  ["rose", "Rose", "#FB7185"], ["blue", "Blue", "#60A5FA"],
  ["emerald", "Emerald", "#34D399"], ["orange", "Orange", "#FB923C"],
  ["red", "Red", "#F87171"], ["pink", "Pink", "#F472B6"],
  ["indigo", "Indigo", "#818CF8"], ["teal", "Teal", "#2DD4BF"]
] as const;

const accentMap: Record<string, string> = Object.fromEntries(colours.map(([value, , hex]) => [value, hex]));
const themes = [["default","Default"],["neon","Neon"],["glass","Glass"],["minimal","Minimal"],["dark_pro","Dark Pro"]] as const;
const cardStyles = [["rounded","Rounded"],["compact","Compact"],["glass","Glass"],["borderless","Borderless"]] as const;
const bannerOverlays = [["gradient","Gradient"],["dark","Dark"],["blur","Blur"],["none","None"]] as const;
const avatarShapes = [["rounded","Rounded square"],["circle","Circle"],["hexagon","Hexagon"]] as const;
const buttonStyles = [["solid","Solid"],["outline","Outline"],["glass","Glass"]] as const;
const layouts = [["standard","Standard"],["creator","Creator focused"]] as const;

type ProfileData = {
  username: string | null; display_name: string | null; country: string | null; bio: string | null;
  headline: string | null; role: string | null; avatar_url: string | null; banner_url: string | null;
  accent_color: string | null; website_url: string | null; github_url: string | null; social_url: string | null;
  profile_theme: string | null; profile_card_style: string | null; banner_overlay: string | null;
  avatar_shape: string | null; profile_button_style: string | null; profile_layout: string | null;
  show_website: boolean | null; show_github: boolean | null; show_social: boolean | null;
  show_projects: boolean | null; show_reputation: boolean | null; show_badges: boolean | null; show_testing_stats: boolean | null;
};

function useObjectPreview(file: File | null, fallback: string | null) {
  const [preview, setPreview] = useState<string | null>(fallback || null);
  useEffect(() => {
    if (!file) { setPreview(fallback || null); return; }
    const next = URL.createObjectURL(file); setPreview(next); return () => URL.revokeObjectURL(next);
  }, [file, fallback]);
  return preview;
}

function ChoiceGrid({ name, value, setValue, options }: { name: string; value: string; setValue: (value: string) => void; options: readonly (readonly [string,string])[] }) {
  return <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{options.map(([option,label]) => <label key={option} className="cursor-pointer">
    <input className="peer sr-only" type="radio" name={name} value={option} checked={value===option} onChange={() => setValue(option)} />
    <span className="block rounded-xl border border-white/10 p-3 text-center text-sm font-semibold transition peer-checked:border-cyan/60 peer-checked:bg-cyan/10 peer-checked:text-cyan">{label}</span>
  </label>)}</div>;
}

export function ProfileCustomizationForm({ profile, saveAction, restartAction }: { profile: ProfileData; saveAction: (formData: FormData) => void | Promise<void>; restartAction: (formData: FormData) => void | Promise<void>; }) {
  const [username,setUsername]=useState(profile.username||""); const [displayName,setDisplayName]=useState(profile.display_name||profile.username||"");
  const [country,setCountry]=useState(profile.country||""); const [bio,setBio]=useState(profile.bio||""); const [headline,setHeadline]=useState(profile.headline||"");
  const [role,setRole]=useState(profile.role||"both"); const [accentColor,setAccentColor]=useState(profile.accent_color||"lime");
  const [websiteUrl,setWebsiteUrl]=useState(profile.website_url||""); const [githubUrl,setGithubUrl]=useState(profile.github_url||""); const [socialUrl,setSocialUrl]=useState(profile.social_url||"");
  const [theme,setTheme]=useState(profile.profile_theme||"default"); const [cardStyle,setCardStyle]=useState(profile.profile_card_style||"rounded");
  const [bannerOverlay,setBannerOverlay]=useState(profile.banner_overlay||"gradient"); const [avatarShape,setAvatarShape]=useState(profile.avatar_shape||"rounded");
  const [buttonStyle,setButtonStyle]=useState(profile.profile_button_style||"solid"); const [layout,setLayout]=useState(profile.profile_layout||"standard");
  const [removeAvatar,setRemoveAvatar]=useState(false); const [removeBanner,setRemoveBanner]=useState(false); const [avatarFile,setAvatarFile]=useState<File|null>(null); const [bannerFile,setBannerFile]=useState<File|null>(null);
  const avatarPreview=useObjectPreview(avatarFile,profile.avatar_url); const bannerPreview=useObjectPreview(bannerFile,profile.banner_url);
  const effectiveAvatar=removeAvatar?null:avatarPreview; const effectiveBanner=removeBanner?null:bannerPreview; const accent=accentMap[accentColor]||accentMap.lime;
  const previewName=displayName.trim()||username.trim()||"Iconic Creator"; const previewUsername=username.trim()||"your_username";
  const style=useMemo(()=>({"--profile-accent":accent} as CSSProperties),[accent]);
  const avatarClass=avatarShape==="circle"?"rounded-full":avatarShape==="hexagon"?"[clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)]":"rounded-3xl";
  const previewShell = theme === "minimal" ? "bg-[#0c1323]" : theme === "glass" ? "bg-white/[0.07] backdrop-blur-xl" : theme === "dark_pro" ? "bg-black/50" : "bg-white/[0.04]";

  return <div className="max-w-6xl">
    <div className="mb-6"><p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Account and public page</p><h2 className="mt-2 text-3xl font-black">Customize your profile</h2><p className="mt-2 text-soft">Choose your colours, layout, visual style and which public sections visitors can see.</p></div>
    <form id="profile-form" action={saveAction} className="space-y-5">
      <input type="hidden" name="currentAvatar" value={profile.avatar_url||""}/><input type="hidden" name="currentBanner" value={profile.banner_url||""}/>
      <section className={`card overflow-hidden ${previewShell}`} style={{...style,borderColor:cardStyle==="borderless"?"transparent":`${accent}66`,boxShadow:theme==="neon"?`0 0 55px ${accent}30`:`0 0 35px ${accent}14`,borderRadius:cardStyle==="compact"?"1rem":"1.5rem"}}>
        <div className="relative h-56 overflow-hidden border-b border-white/10 md:h-72">
          {effectiveBanner?<img src={effectiveBanner} alt="Profile banner preview" className={`h-full w-full object-cover ${bannerOverlay==="blur"?"scale-105 blur-sm":""}`}/>:<div className="h-full w-full" style={{background:`radial-gradient(circle at 18% 22%, ${accent}55, transparent 28%), linear-gradient(135deg,#16233b,#071127 68%)`}}/>}
          {bannerOverlay!=="none"&&<div className={`absolute inset-0 ${bannerOverlay==="dark"?"bg-black/55":bannerOverlay==="blur"?"bg-black/25 backdrop-blur-[2px]":"bg-gradient-to-t from-[#0c1323] via-[#0c132380] to-transparent"}`}/>}<div className="absolute inset-x-0 bottom-0 h-1" style={{background:`linear-gradient(90deg,transparent,${accent},transparent)`}}/>
          <div className="absolute left-5 right-5 top-5 flex justify-between"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[.2em]" style={{borderColor:`${accent}66`,background:`${accent}14`}}><Sparkles size={14}/>Live preview</span><span className="badge">{themes.find(([v])=>v===theme)?.[1]}</span></div>
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 md:p-6">
            {effectiveAvatar?<img src={effectiveAvatar} alt="Avatar preview" className={`h-24 w-24 border-4 border-[#11192b] object-cover shadow-2xl md:h-28 md:w-28 ${avatarClass}`}/>:<div className={`grid h-24 w-24 place-items-center border-4 border-[#11192b] text-3xl font-black text-ink md:h-28 md:w-28 ${avatarClass}`} style={{backgroundColor:accent}}>{previewName[0]?.toUpperCase()||"I"}</div>}
            <div><p className="text-sm font-bold uppercase tracking-[.2em]" style={{color:accent}}>{role==="both"?"tester and developer":role}</p><h3 className="mt-1 text-3xl font-black md:text-4xl">{previewName}</h3><p className="text-white/70">@{previewUsername}</p><p className="mt-2 font-semibold" style={{color:accent}}>{headline||"Your headline will appear here."}</p></div>
          </div>
        </div>
        <div className={`grid gap-5 p-6 ${layout==="creator"?"lg:grid-cols-[1fr_1.2fr]":"lg:grid-cols-[1.2fr_1fr]"}`}><div><p className="text-soft">{bio||"Tell people what you build, what devices you test on and the kind of feedback you give."}</p><div className="mt-4 flex flex-wrap gap-2">{country&&<span className="badge gap-2"><MapPin size={14}/>{country}</span>}{websiteUrl&&<span className="badge gap-2"><Globe2 size={14}/>Website</span>}{githubUrl&&<span className="badge gap-2"><Github size={14}/>GitHub</span>}</div></div><div className="grid grid-cols-3 gap-3">{["Projects","Reputation","Badges"].map((x,i)=><div key={x} className="rounded-2xl border bg-white/5 p-4" style={{borderColor:`${accent}44`}}><p className="text-xs text-soft">{x}</p><p className="mt-2 font-black" style={{color:accent}}>{i===0?"Portfolio":i===1?"4.8":"Trusted"}</p></div>)}</div></div>
      </section>

      <section className="card grid gap-5 p-6 md:grid-cols-2"><div><ImageUploadField name="avatar" label="Profile image" helpText="PNG, JPG or WebP · maximum 3 MB" maxBytesPerFile={3*1024*1024} existingPreview={removeAvatar?null:profile.avatar_url} aspect="square" onAccepted={(files)=>{setAvatarFile(files[0]||null);setRemoveAvatar(false)}} onCleared={()=>setAvatarFile(null)}/>{(profile.avatar_url||avatarFile)&&<label className="mt-3 flex gap-2 text-sm text-soft"><input type="checkbox" name="removeAvatar" checked={removeAvatar} onChange={e=>setRemoveAvatar(e.currentTarget.checked)}/>Remove current avatar</label>}</div><div><ImageUploadField name="banner" label="Profile banner" helpText="PNG, JPG or WebP · maximum 5 MB" maxBytesPerFile={5*1024*1024} existingPreview={removeBanner?null:profile.banner_url} aspect="wide" onAccepted={(files)=>{setBannerFile(files[0]||null);setRemoveBanner(false)}} onCleared={()=>setBannerFile(null)}/>{(profile.banner_url||bannerFile)&&<label className="mt-3 flex gap-2 text-sm text-soft"><input type="checkbox" name="removeBanner" checked={removeBanner} onChange={e=>setRemoveBanner(e.currentTarget.checked)}/>Remove current banner</label>}</div></section>

      <section className="card grid gap-5 p-6 sm:grid-cols-2"><label><span className="label">Username</span><input name="username" required minLength={3} maxLength={30} value={username} onChange={e=>setUsername(e.target.value)} className="field"/></label><label><span className="label">Display name</span><input name="displayName" maxLength={80} value={displayName} onChange={e=>setDisplayName(e.target.value)} className="field"/></label><label><span className="label">Country</span><input name="country" maxLength={80} value={country} onChange={e=>setCountry(e.target.value)} className="field"/></label><label><span className="label">Headline</span><input name="headline" maxLength={120} value={headline} onChange={e=>setHeadline(e.target.value)} className="field"/></label><label><span className="label">Role</span><select name="role" value={role} onChange={e=>setRole(e.target.value)} className="field"><option value="both">Tester and developer</option><option value="tester">Tester</option><option value="developer">Developer</option></select></label><label className="sm:col-span-2"><span className="label">About you</span><textarea name="bio" maxLength={1000} rows={6} value={bio} onChange={e=>setBio(e.target.value)} className="field"/></label></section>

      <section className="card p-6"><h3 className="flex items-center gap-2 text-xl font-black"><Palette size={20}/>Accent colour</h3><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{colours.map(([value,label,hex])=><label key={value} className="cursor-pointer"><input type="radio" className="peer sr-only" name="accentColor" value={value} checked={accentColor===value} onChange={()=>setAccentColor(value)}/><span className="flex items-center gap-2 rounded-xl border p-3" style={accentColor===value?{borderColor:hex,backgroundColor:`${hex}22`,boxShadow:`0 0 18px ${hex}22`}:{borderColor:"rgba(255,255,255,.10)"}}><span className="h-5 w-5 rounded-full" style={{backgroundColor:hex}}/><span className="text-sm font-semibold">{label}</span></span></label>)}</div></section>

      <section className="card p-6">
        <h3 className="flex items-center gap-2 text-xl font-black"><LayoutTemplate size={20}/>Page appearance</h3>
        <p className="mt-2 text-sm text-soft">Mix and match the style controls below. The small page preview updates immediately.</p>

        <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div><span className="label">Profile theme</span><ChoiceGrid name="profileTheme" value={theme} setValue={setTheme} options={themes}/></div>
            <div><span className="label">Card style</span><ChoiceGrid name="profileCardStyle" value={cardStyle} setValue={setCardStyle} options={cardStyles}/></div>
            <div><span className="label">Banner overlay</span><ChoiceGrid name="bannerOverlay" value={bannerOverlay} setValue={setBannerOverlay} options={bannerOverlays}/></div>
            <div><span className="label">Avatar shape</span><ChoiceGrid name="avatarShape" value={avatarShape} setValue={setAvatarShape} options={avatarShapes}/></div>
            <div><span className="label">Button style</span><ChoiceGrid name="profileButtonStyle" value={buttonStyle} setValue={setButtonStyle} options={buttonStyles}/></div>
            <div><span className="label">Profile layout</span><ChoiceGrid name="profileLayout" value={layout} setValue={setLayout} options={layouts}/></div>
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan">Page preview</p>
              <span className="text-xs text-soft">Live</span>
            </div>

            <div
              className={`overflow-hidden border ${previewShell}`}
              style={{
                ...style,
                borderColor: cardStyle === "borderless" ? "transparent" : `${accent}66`,
                boxShadow: theme === "neon" ? `0 0 42px ${accent}30` : `0 0 24px ${accent}16`,
                borderRadius: cardStyle === "compact" ? ".9rem" : "1.35rem"
              }}
            >
              <div className="relative h-36 overflow-hidden border-b border-white/10">
                {effectiveBanner ? (
                  <img src={effectiveBanner} alt="Small profile banner preview" className={`h-full w-full object-cover ${bannerOverlay === "blur" ? "scale-105 blur-sm" : ""}`}/>
                ) : (
                  <div className="h-full w-full" style={{background:`radial-gradient(circle at 20% 22%, ${accent}55, transparent 30%), linear-gradient(135deg,#16233b,#071127 68%)`}}/>
                )}
                {bannerOverlay !== "none" && <div className={`absolute inset-0 ${bannerOverlay === "dark" ? "bg-black/55" : bannerOverlay === "blur" ? "bg-black/25 backdrop-blur-[2px]" : "bg-gradient-to-t from-[#0c1323] via-[#0c132380] to-transparent"}`}/>} 
                <div className="absolute inset-x-0 bottom-0 h-0.5" style={{background:`linear-gradient(90deg,transparent,${accent},transparent)`}}/>
              </div>

              <div className="relative px-5 pb-5">
                <div className="-mt-9 flex items-end gap-3">
                  {effectiveAvatar ? (
                    <img src={effectiveAvatar} alt="Small avatar preview" className={`h-20 w-20 border-4 border-[#11192b] object-cover shadow-xl ${avatarClass}`}/>
                  ) : (
                    <div className={`grid h-20 w-20 place-items-center border-4 border-[#11192b] text-2xl font-black text-ink ${avatarClass}`} style={{backgroundColor:accent}}>{previewName[0]?.toUpperCase()||"I"}</div>
                  )}
                  <div className="min-w-0 pb-1">
                    <h4 className="truncate text-xl font-black">{previewName}</h4>
                    <p className="truncate text-sm text-white/65">@{previewUsername}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold" style={{color:accent}}>{headline || "Your headline will appear here."}</p>
                <p className="mt-2 line-clamp-3 text-sm text-soft">{bio || "Tell visitors what you build and what kind of testing you do."}</p>

                <div className={`mt-4 grid gap-2 ${layout === "creator" ? "grid-cols-2" : "grid-cols-3"}`}>
                  {(layout === "creator" ? ["Projects","Reputation"] : ["Projects","Reputation","Badges"]).map((item,index)=><div key={item} className="rounded-xl border bg-white/[0.04] p-3" style={{borderColor:`${accent}3d`}}><p className="text-[10px] text-soft">{item}</p><p className="mt-1 text-xs font-black" style={{color:accent}}>{index===0?"Portfolio":index===1?"4.8":"Trusted"}</p></div>)}
                </div>

                <button
                  type="button"
                  className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-black ${buttonStyle === "solid" ? "text-ink" : "text-white"}`}
                  style={buttonStyle === "solid" ? {backgroundColor:accent} : buttonStyle === "outline" ? {border:`1px solid ${accent}`,background:"transparent"} : {border:`1px solid ${accent}55`,background:`${accent}18`,backdropFilter:"blur(12px)"}}
                >
                  View profile
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="card grid gap-5 p-6 sm:grid-cols-2"><label><span className="label">Website</span><input name="websiteUrl" type="url" value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} className="field"/></label><label><span className="label">GitHub</span><input name="githubUrl" type="url" value={githubUrl} onChange={e=>setGithubUrl(e.target.value)} className="field"/></label><label className="sm:col-span-2"><span className="label">Other social/profile link</span><input name="socialUrl" type="url" value={socialUrl} onChange={e=>setSocialUrl(e.target.value)} className="field"/></label></section>

      <section className="card p-6"><h3 className="text-xl font-black">Public section visibility</h3><p className="mt-2 text-sm text-soft">Choose which sections appear on your public profile.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["showWebsite","Website",profile.show_website],["showGithub","GitHub",profile.show_github],["showSocial","Social link",profile.show_social],["showProjects","Projects",profile.show_projects],["showReputation","Reputation",profile.show_reputation],["showBadges","Badges",profile.show_badges],["showTestingStats","Testing statistics",profile.show_testing_stats]].map(([name,label,checked])=><label key={String(name)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"><input type="checkbox" name={String(name)} defaultChecked={checked!==false}/><span className="font-semibold">{String(label)}</span></label>)}</div></section>
    </form>
    <div className="mt-5 flex flex-wrap gap-3"><button form="profile-form" className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-bold text-ink" style={{backgroundColor:accent,boxShadow:`0 0 24px ${accent}33`}}>Save profile and page</button><Link href={`/profiles/${previewUsername}`} className="btn-secondary gap-2">View public profile <ExternalLink size={16}/></Link><Link href="/help" className="btn-secondary">Profile help</Link><form action={restartAction}><button className="btn-secondary" type="submit">Restart introduction</button></form></div>
  </div>;
}

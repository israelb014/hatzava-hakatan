/** האם גרסה a חדשה מגרסה b (תומך בקידומת v) */
export function newer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

export interface ReleaseInfo {
  tag_name?: string;
  assets?: { name: string; browser_download_url: string }[];
}

/** מחזיר את פרטי העדכון אם בגרסה האחרונה ב-GitHub יש APK חדש יותר מהגרסה המותקנת */
export function pickApkUpdate(release: ReleaseInfo, current: string): { version: string; url: string } | null {
  if (!release.tag_name || !newer(release.tag_name, current)) return null;
  const apk = release.assets?.find((a) => a.name.endsWith('.apk'));
  if (!apk) return null;
  return { version: release.tag_name.replace(/^v/, ''), url: apk.browser_download_url };
}

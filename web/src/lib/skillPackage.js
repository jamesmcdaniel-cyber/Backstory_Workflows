import { strToU8, zipSync } from 'fflate';

// A fixed timestamp keeps the catalogue's committed ZIPs byte-identical between
// builds. Built from local parts because ZIP stores local time.
const MTIME = new Date(2026, 0, 1);

// Claude's skill upload wants a ZIP with the skill's folder at its root, named
// after the skill, and SKILL.md inside that folder.
export function packageSkill({ name, skillMd, files = {} }) {
  const entries = { [`${name}/SKILL.md`]: [strToU8(skillMd), { mtime: MTIME }] };
  for (const [file, bytes] of Object.entries(files)) entries[`${name}/${file}`] = [bytes, { mtime: MTIME }];
  return zipSync(entries);
}

export function downloadSkill(skill) {
  const url = URL.createObjectURL(new Blob([packageSkill(skill)], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${skill.name}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

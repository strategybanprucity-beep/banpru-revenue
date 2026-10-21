export const DRIVE_FILE_SCOPE='https://www.googleapis.com/auth/drive.file';
export function hasOnlyFileDriveScope(value:string){const scopes=value.split(/\s+/).filter(Boolean);return scopes.includes(DRIVE_FILE_SCOPE)&&!scopes.some(s=>s.startsWith('https://www.googleapis.com/auth/drive')&&s!==DRIVE_FILE_SCOPE)}
export function matchesSelectedFolders(ids:string[],expected:string[]){return ids.length===expected.length&&new Set(ids).size===expected.length&&expected.every(id=>ids.includes(id))}

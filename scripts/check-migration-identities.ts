import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export type MigrationIdentity={path:string;blob:string};
const versionOf=(path:string)=>/^supabase\/migrations\/(\d{14})_[a-z0-9_-]+\.sql$/i.exec(path)?.[1];
export function migrationIdentity(path:string,bytes:Uint8Array):MigrationIdentity{
 return {path,blob:createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex')};
}
function indexed(rows:readonly MigrationIdentity[]){
 const result=new Map<string,MigrationIdentity>();
 for(const row of rows){const version=versionOf(row.path);if(!version)throw Error('migration_filename_invalid: '+row.path);
  if(result.has(version))throw Error('migration_version_reused: '+version);result.set(version,row);
 }
 return result;
}
/** Existing history must remain byte-identical; a new version cannot be silently
 * consumed by another open PR. Git blob identities include the exact file bytes. */
export function assertMigrationIdentities(local:readonly MigrationIdentity[],base:readonly MigrationIdentity[]=[],pending:readonly MigrationIdentity[]=[]){
 const current=indexed(local),existing=indexed(base);
 for(const [version,row] of existing){const here=current.get(version);
  if(!here||here.path!==row.path||here.blob!==row.blob)throw Error('migration_history_changed: '+row.path);
 }
 for(const row of pending){const version=versionOf(row.path);if(!version)throw Error('migration_filename_invalid: '+row.path);
  const here=current.get(version);if(here&&!existing.has(version)&&(here.path!==row.path||here.blob!==row.blob))throw Error('migration_pending_collision: '+version);
 }
 return current.size;
}
async function main(){
 const dir='supabase/migrations',names=(await readdir(dir)).filter(n=>n.endsWith('.sql')).sort();
 const local=await Promise.all(names.map(async n=>migrationIdentity(`${dir}/${n}`,await readFile(`${dir}/${n}`))));
 if(!process.argv.includes('--github')){console.log(`PASS: ${assertMigrationIdentities(local)} unique migration identities`);return;}
 const repo=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
 if(!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repo??'')||!token)throw Error('migration_github_configuration_missing');
 const api=async(path:string)=>{
  const r=await fetch(`https://api.github.com/repos/${repo}${path}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('migration_github_read_failed: '+r.status);return r.json();
 };
 const metadata=await api(''),tree=await api(`/git/trees/${encodeURIComponent(metadata.default_branch)}?recursive=1`);
 if(tree.truncated||!Array.isArray(tree.tree))throw Error('migration_base_inventory_incomplete');
 const base=tree.tree.filter((r:{path:string;type:string})=>r.type==='blob'&&r.path.startsWith(dir+'/')&&r.path.endsWith('.sql'))
  .map((r:{path:string;sha:string})=>({path:r.path,blob:r.sha}));
 // Bounded pagination fails closed instead of silently omitting a busy repository.
 const pages=async(path:string)=>{const all=[];for(let page=1;page<=10;page++){
  const rows=await api(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);
  if(!Array.isArray(rows))throw Error('migration_github_inventory_invalid');all.push(...rows);if(rows.length<100)return all;
 }throw Error('migration_github_inventory_incomplete');};
 const pulls=await pages('/pulls?state=open'),pending:MigrationIdentity[]=[];
 for(const pull of pulls){for(const f of await pages(`/pulls/${pull.number}/files`)){
  if(f.status!=='removed'&&f.filename.startsWith(dir+'/')&&f.filename.endsWith('.sql'))pending.push({path:f.filename,blob:f.sha});
 }}
 console.log(`PASS: ${assertMigrationIdentities(local,base,pending)} migrations; main history preserved; ${pulls.length} open PRs checked`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

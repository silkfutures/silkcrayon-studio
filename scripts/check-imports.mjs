import fs from 'fs';import path from 'path';
const roots=['app','components','lib'];let bad=[];
function walk(d){for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(js|jsx|mjs)$/.test(n)){const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/from\s+['"](\.[^'"]+)['"]/g)){const q=path.resolve(path.dirname(p),m[1]);if(!['','.js','.jsx','.mjs','/index.js','/index.jsx'].some(x=>fs.existsSync(q+x)))bad.push(`${p}: ${m[1]}`)}}}}
for(const r of roots)if(fs.existsSync(r))walk(r);if(bad.length){console.error('Missing relative imports:\n'+bad.join('\n'));process.exit(1)}console.log('Relative imports OK');

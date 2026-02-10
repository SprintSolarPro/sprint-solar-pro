const fs = require('fs');
const s = fs.readFileSync('app.js','utf8');
const lines = s.split(/\r?\n/);
const stack = [];
const pairs = { '(':')', '{':'}', '[':']' };
const open = Object.keys(pairs).join('');
const close = Object.values(pairs).join('');
let inQuote = null;
let escaped = false;
let inLineComment = false;
let inBlockComment = false;
let line = 1, col = 1;

function showContext(lineno){
  const start = Math.max(0, lineno-6);
  const end = Math.min(lines.length-1, lineno+6);
  for(let i=start;i<=end;i++){
    console.log((i+1)+': '+lines[i]);
  }
}

for(let i=0;i<s.length;i++){
  const ch = s[i];
  const next = s[i+1];

  if(ch === '\n'){ line++; col = 1; inLineComment = false; continue; }

  if(!inQuote && !inBlockComment && !inLineComment && ch === '/' && next === '/'){ inLineComment = true; i++; col+=2; continue; }
  if(!inQuote && !inBlockComment && !inLineComment && ch === '/' && next === '*'){ inBlockComment = true; i++; col+=2; continue; }
  if(inBlockComment && ch === '*' && next === '/'){ inBlockComment = false; i++; col+=2; continue; }
  if(inLineComment){ col++; continue; }
  if(inBlockComment){ col++; continue; }

  if(inQuote){
    if(escaped){ escaped = false; col++; continue; }
    if(ch === '\\'){ escaped = true; col++; continue; }
    if(ch === inQuote){ inQuote = null; col++; continue; }
    col++; continue;
  } else {
    if(ch === '"' || ch === "'" || ch === '`'){ inQuote = ch; col++; continue; }
  }

  if(open.includes(ch)){ stack.push({ch, line, col}); col++; continue; }
  if(close.includes(ch)){
    const last = stack[stack.length-1];
    if(!last){
      console.log('UNMATCHED CLOSING', ch, 'at', line+':'+col);
      showContext(line-1);
      process.exit(0);
    }
    const expected = pairs[last.ch];
    if(ch !== expected){
      console.log('MISMATCH: expected', expected, 'but found', ch, 'at', line+':'+col);
      showContext(line-1);
      process.exit(0);
    }
    stack.pop();
    col++; continue;
  }

  col++;
}

if(inQuote){
  console.log('UNCLOSED QUOTE', inQuote, 'at EOF (around line', line, ')');
  showContext(lines.length-1);
  process.exit(0);
}
if(inBlockComment){
  console.log('UNCLOSED BLOCK COMMENT at EOF (around line', line, ')');
  showContext(lines.length-1);
  process.exit(0);
}
if(stack.length){
  const last = stack[stack.length-1];
  console.log('UNCLOSED', last.ch, 'opened at line', last.line+':'+last.col);
  showContext(last.line-1);
  process.exit(0);
}
console.log('No unmatched brackets or quotes found by this scan.');
#!/usr/bin/env node
/**
 * Read-only W3C compatibility experiment. It never edits src/ or dist/.
 * Generates standalone *source-level* CSS candidates from existing design tokens.
 * Candidates are NOT integrated into Vite: test CSS Modules and browser behavior
 * before using generated rules in production.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, relative, dirname, extname, join } from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const postcss = require('postcss')

// Vite bundles imported config helpers into a temporary config file.
// Resolve from the npm/Vite working directory, never from import.meta.dirname.
const project = resolve(process.cwd())
const src = join(project, 'src')
const themeCss = join(src, 'shared/styles/global.css')

function allCss(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name)
    return item.isDirectory() ? allCss(path) : extname(path) === '.css' ? [path] : []
  }).sort()
}
function isRoot(selector) {
  return selector.split(',').every((s) => /^:root(?:\[data-theme=['"](?:light|dark)['"]\])?$/.test(s.trim()))
}
function buildThemeTokens(files) {
  const base = new Map(), light = new Map(), dark = new Map(), unsafe = new Map()
  postcss.parse(readFileSync(themeCss, 'utf8')).walkRules((rule) => {
    const sels = rule.selector.split(',').map((s) => s.trim())
    const rootBase = sels.includes(':root')
    const rootLight = sels.some((s) => /:root\[data-theme=['"]light['"]\]/.test(s))
    const rootDark = sels.some((s) => /:root\[data-theme=['"]dark['"]\]/.test(s))
    rule.walkDecls(/^--/, (decl) => {
      if (rootBase) base.set(decl.prop, decl.value)
      if (rootLight) light.set(decl.prop, decl.value)
      if (rootDark) dark.set(decl.prop, decl.value)
    })
  })
  // Any token overridden by component state, landing scope, or local selectors
  // is unsafe to resolve only from :root. Never silently inline it.
  for (const file of files) {
    postcss.parse(readFileSync(file, 'utf8'), { from: file }).walkRules((rule) => {
      if (file === themeCss && isRoot(rule.selector)) return
      rule.walkDecls(/^--/, (decl) => {
        if (!unsafe.has(decl.prop)) unsafe.set(decl.prop, [])
        unsafe.get(decl.prop).push(`${relative(project, file)}:${decl.source?.start?.line ?? '?'}`)
      })
    })
  }
  return {
    light: new Map([...base, ...light]),
    dark: new Map([...base, ...light, ...dark]),
    unsafe,
  }
}
function splitTopLevel(str, separator = ',') {
  const parts = []; let start = 0, depth = 0, quote = ''
  for (let i=0; i<str.length; i++) {
    const c = str[i]
    if (quote) { if (c === quote && str[i-1] !== '\\') quote = ''; continue }
    if (c === '"' || c === "'") { quote = c; continue }
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === separator && depth === 0) {parts.push(str.slice(start, i).trim()); start = i+1}
  }
  parts.push(str.slice(start).trim())
  return parts
}
function mapFunctions(text, fn) {
  let out = ''
  for (let i=0; i<text.length;) {
    const match = /^(var|color-mix)\(/.exec(text.slice(i))
    if (!match) { out += text[i++]; continue }
    const start=i, type=match[1]; i += match[0].length
    let nesting=1, quote=''; const begin=i
    while(i<text.length && nesting) {
      const c=text[i]
      if (quote) { if (c===quote && text[i-1] !== '\\') quote=''; i++; continue }
      if (c==='"'||c==="'") quote=c
      else if(c==='(') nesting++
      else if(c===')') nesting--
      i++
    }
    if(nesting) {out += text.slice(start); break}
    out += fn(type, text.slice(begin,i-1), text.slice(start,i))
  }
  return out
}
function parseColor(color) {
  let s=color.trim().toLowerCase()
  if (s==='transparent') return [0,0,0,0]
  if (s==='black') return [0,0,0,1]
  if (s==='white') return [255,255,255,1]
  if (/^#[0-9a-f]{3}$/.test(s)) s='#'+[...s.slice(1)].map(c=>c+c).join('')
  if (/^#[0-9a-f]{6}$/.test(s)) return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)).concat(1)
  if (/^#[0-9a-f]{8}$/.test(s)) return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)).concat(parseInt(s.slice(7,9),16)/255)
  const m=/^rgba?\((.*)\)$/.exec(s)
  if (m) {
    const parts=m[1].replace(/,/g,' ').replace(/\//g,' ').split(/\s+/).filter(Boolean)
    if(parts.length===3 || parts.length===4) {
      const channels=parts.slice(0,3).map(v=>v.endsWith('%')?Number.parseFloat(v)*2.55:Number.parseFloat(v))
      const a=parts.length===4?(parts[3].endsWith('%')?Number.parseFloat(parts[3])/100:Number.parseFloat(parts[3])):1
      if([...channels,a].every(Number.isFinite)) return [...channels,a]
    }
  }
  return null
}
function mixColor(args) {
  const parts=splitTopLevel(args)
  if(parts.length!==3 || parts[0].trim().toLowerCase() !== 'in srgb') return null
  const stops=parts.slice(1).map((stop) => {
    const m=/^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/.exec(stop.trim())
    return {color:parseColor(m[1]), weight:m[2]===undefined?null:parseFloat(m[2])/100}
  })
  if(stops.some(x=>!x.color)) return null
  let [a,b]=stops
  if(a.weight===null && b.weight===null) {a.weight=.5; b.weight=.5}
  else if(a.weight===null) a.weight=1-b.weight
  else if(b.weight===null) b.weight=1-a.weight
  let sum=a.weight+b.weight
  if(sum<=0) return 'transparent'
  const multiplier=Math.min(sum,1)
  a.weight/=sum; b.weight/=sum
  const alpha=(a.color[3]*a.weight+b.color[3]*b.weight)*multiplier
  const denom=(a.color[3]*a.weight+b.color[3]*b.weight)
  const ch=[0,1,2].map(i=> denom ? (a.color[i]*a.color[3]*a.weight+b.color[i]*b.color[3]*b.weight)/denom : 0)
  const short=n => Math.round(n*1000)/1000
  return alpha>=0.999999?`rgb(${ch.map(short).join(' ')})`:`rgb(${ch.map(short).join(' ')} / ${short(alpha)})`
}
function resolveValue(input, tokens, unsafe) {
  const errors=new Set()
  let text=input
  for(let iteration=0;iteration<10;iteration++) {
    const previous=text
    text=mapFunctions(text,(type,args,original)=>{
      if(type==='var') {
        const [name]=splitTopLevel(args)
        if(unsafe.has(name)) {errors.add(`scoped token ${name}`); return original}
        if(!tokens.has(name)) {errors.add(`unknown/runtime token ${name}`); return original}
        return tokens.get(name)
      }
      if(type==='color-mix') {
        const nested=resolveValue(args,tokens,unsafe)
        if(nested.errors.length) nested.errors.forEach(e=>errors.add(e))
        const result=mixColor(nested.value)
        if(result===null) { errors.add(`unresolved color-mix: ${original.slice(0,90)}`); return original }
        return result
      }
      return original
    })
    if(text===previous) break
  }
  if(/(?:var|color-mix)\(/.test(text)) errors.add('unresolved function')
  return {value:text,errors:[...errors]}
}
function themedSelector(selector, isModule) {
  return splitTopLevel(selector).map((s)=> {
    if(/^:root(?=\W|$)/.test(s)) return s.replace(/^:root/ , ":root[data-theme='dark']")
    if(/^html(?=\W|$)/.test(s)) return s.replace(/^html/ , "html[data-theme='dark']")
    const prefix=isModule?":global(:where(html[data-theme='dark']))":":where(html[data-theme='dark'])"
    return `${prefix} ${s}`
  }).join(',\n')
}
// CSS minifiers may legally unquote multi-word fallback family names, which
// produces a warning in the selected W3C CSS Level 3 + SVG validator profile.
// For the approved HelmSight display stack, retain Georgia and the generic
// serif fallback. This only changes the fallback if Georgia is unavailable;
// it does not change the source design token or any component's first choice.
function validatorFontFamily(value) {
  return /^Georgia\s*,\s*['"]Times New Roman['"]\s*,\s*serif$/i.test(value.trim())
    ? 'Georgia, serif'
    : value
}

function transform(css, file, tokens) {
  const root=postcss.parse(css,{from:file})
  const issues=[]
  let changed=0, darkRules=0, unhandled=0
  root.walkRules((rule)=> {
    // Existing dark selectors must not receive a second dark selector.
    const darkOnly=/data-theme=['"]dark['"]/.test(rule.selector)
    const lightOnly=/data-theme=['"]light['"]/.test(rule.selector) && !darkOnly
    const darkDecls=[]
    rule.walkDecls((decl)=> {
      if(decl.prop.startsWith('--')) return
      if(!/(?:var|color-mix)\(/.test(decl.value)) return
      const light=resolveValue(decl.value, lightOnly?tokens.light:darkOnly?tokens.dark:tokens.light,tokens.unsafe)
      const dark=resolveValue(decl.value,tokens.dark,tokens.unsafe)
      if(light.errors.length || dark.errors.length) {
        unhandled++
        issues.push({line:decl.source.start.line,property:decl.prop,reason:[...new Set([...light.errors,...dark.errors])].join('; ')})
        return
      }
      const lightValue = decl.prop === 'font-family' ? validatorFontFamily(light.value) : light.value
      const darkValue = decl.prop === 'font-family' ? validatorFontFamily(dark.value) : dark.value
      decl.value=lightValue; changed++
      if(!darkOnly && !lightOnly && lightValue!==darkValue) darkDecls.push(decl.clone({value:darkValue}))
    })
    if(darkDecls.length) {
      const darkRule=postcss.rule({selector:themedSelector(rule.selector,file.endsWith('.module.css'))})
      for(const decl of darkDecls) darkRule.append(decl)
      rule.after(darkRule); darkRules++
    }
  })
  return {css:root.toString(), report:{file:relative(project,file),changed,darkRules,unhandled,issues}}
}
function main() {
  const args=process.argv.slice(2)
  if(args.includes('--help')||!args.length) {
    console.log('Usage: npm run w3c:preview -- --file src/shared/ui/StatusToast/StatusToast.module.css\n       npm run w3c:preview -- --all\nRead-only; writes w3c-preview/* (ignored by Git). Does NOT alter Vite build.')
    return
  }
  const all=allCss(src),tokens=buildThemeTokens(all)
  const position=args.indexOf('--file')
  const selected=args.includes('--all')?all:position>=0?[resolve(project,args[position+1])]:[]
  if(!selected.length || selected.some(f=>!f.startsWith(src+'/')||!all.includes(f))) throw new Error('Select an existing src/*.css with --file, or use --all')
  const reports=[]
  for(const file of selected) {
    const result=transform(readFileSync(file,'utf8'),file,tokens)
    const out=join(project,'w3c-preview',relative(src,file))
    mkdirSync(dirname(out),{recursive:true});writeFileSync(out,result.css)
    reports.push(result.report)
    console.log(`${result.report.file}: ${result.report.changed} static, ${result.report.darkRules} dark rules, ${result.report.unhandled} unresolved`)
  }
  const summary={note:'Preview only. Do not deploy before browser/HTML/CSS QA.',unsafeTokens:Object.fromEntries(tokens.unsafe),reports}
  writeFileSync(join(project,'w3c-preview','report.json'),JSON.stringify(summary,null,2)+'\n')
  console.log('See w3c-preview/report.json. Originals and production files are untouched.')
}
export {allCss, buildThemeTokens, resolveValue, mixColor, transform, themedSelector}
if(process.argv[1] && resolve(process.argv[1])===resolve(import.meta.filename))main()

import {registerHooks} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the actual TSX component under normal React conditions, not a schema mirror.
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('@/'))return next(pathToFileURL(path.resolve(specifier.slice(2)+'.ts')).href,context);
  return next(specifier,context);
},load(url,context,next){
  if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};
  return next(url,context);
}});
const {RentalEvidence}=await import('../../components/report-dashboard/rent.tsx');
process.stdout.write(renderToStaticMarkup(createElement(RentalEvidence,{report:JSON.parse(fs.readFileSync(0,'utf8'))})));

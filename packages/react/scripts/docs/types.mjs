// Reads the package's types with the TypeScript compiler API (L09 "Props"): the entry's exports,
// each component's props by axis and branch, and what its JSX renders (root element, data-*).
//
// It walks the props alias as declared, never the resolved type: TypeScript normalises
// `A & (B | C) & (D | E)` into a cross product. Every union of prop sets is a named alias
// intersected at the top level of `<Name>Props` (CONVENTIONS rule 3); anything else is an error.
import { readdirSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import { byCodeUnit, cleanDoc, collapse, slash } from './util.mjs';

/**
 * Display names for recurring non-exported aliases, by their expanded text. Used by the Markdown
 * renderer only; the manifest keeps the type.
 */
export const TYPE_DISPLAY = {
  'Exclude<ReactNode, boolean | null | undefined>':
    'visible content: anything React renders except null, undefined or a boolean',
};

/**
 * @param {string} root The package root, with `/` separators.
 * @param {{ reorder?: boolean, crlf?: boolean }} [options] Test switches: reverse the program's
 *   root files, or read every source file with CRLF line endings. Neither may change the output.
 */
export function createTypes(root, { reorder = false, crlf = false } = {}) {
  const src = `${root}/src`;
  const entryPath = `${src}/index.ts`;
  const componentDirs = readdirSync(`${src}/components`, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(byCodeUnit);

  // A virtual module that names each element's full native attribute set, so `omitted` can be
  // computed against it.
  const elements = new Set();
  for (const file of sourceFiles(src)) {
    for (const [, element] of readFileSync(file, 'utf8').matchAll(/NativeProps<'([a-z]+)'>/g)) {
      elements.add(element);
    }
  }
  const nativePath = `${src}/__senui_native_attributes__.ts`;
  const nativeText = [
    "import type { ComponentPropsWithoutRef } from 'react';",
    ...[...elements]
      .sort(byCodeUnit)
      .map((e) => `export type Native_${e} = ComponentPropsWithoutRef<'${e}'>;`),
  ].join('\n');

  const parsed = ts.getParsedCommandLineOfConfigFile(
    `${root}/tsconfig.json`,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      },
    },
  );
  if (!parsed) throw new Error(`can't read ${root}/tsconfig.json`);
  const host = ts.createCompilerHost(parsed.options, true);
  const { fileExists, readFile } = host;
  host.fileExists = (file) => slash(file) === nativePath || fileExists.call(host, file);
  host.readFile = (file) => {
    if (slash(file) === nativePath) return nativeText;
    const text = readFile.call(host, file);
    return crlf && text !== undefined && slash(file).startsWith(`${src}/`)
      ? text.replace(/\r?\n/g, '\r\n')
      : text;
  };
  const roots = [
    entryPath,
    ...componentDirs.map((name) => `${src}/components/${name}/${name}.tsx`),
    nativePath,
  ];
  const program = ts.createProgram({
    rootNames: reorder ? roots.reverse() : roots,
    options: parsed.options,
    host,
  });
  const checker = program.getTypeChecker();
  const errors = [];

  const sourceFile = (path) => {
    const file = program.getSourceFile(path);
    if (!file) throw new Error(`not in the program: ${path}`);
    return file;
  };

  /** A symbol, through any import or re-export alias. */
  const resolve = (node) => {
    const symbol = checker.getSymbolAtLocation(node);
    return symbol && symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  };

  /** Where a declaration lives: the package's own source, React's types, TypeScript's lib. */
  const originOf = (decl) => {
    const file = decl.getSourceFile();
    if (program.isSourceFileDefaultLibrary(file)) return 'lib';
    const name = slash(file.fileName);
    if (name.includes('/node_modules/@types/react/')) return 'react';
    if (name.startsWith(`${src}/`)) return 'own';
    return 'other';
  };

  // --- The entry's exports ---------------------------------------------------------------------

  const entrySymbol = checker.getSymbolAtLocation(sourceFile(entryPath));
  /** @type {Map<ts.Symbol, string>} Every exported symbol, by its declared symbol. */
  const exportedName = new Map();
  const exports = [];
  for (const exported of checker.getExportsOfModule(entrySymbol)) {
    const target =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    exportedName.set(target, exported.name);
    let kind = 'type';
    if (target.flags & ts.SymbolFlags.Function) kind = 'function';
    else if (target.flags & ts.SymbolFlags.Variable) {
      kind = 'component';
      if (!componentDirs.includes(exported.name)) {
        errors.push(
          `index.ts: value export '${exported.name}' is neither a component nor a function`,
        );
      }
    }
    exports.push({
      name: exported.name,
      kind,
      description: cleanDoc(ts.displayPartsToString(target.getDocumentationComment(checker))),
    });
  }
  exports.sort((a, b) => byCodeUnit(a.name, b.name));
  for (const name of componentDirs) {
    if (!exports.some((e) => e.name === name && e.kind === 'component')) {
      errors.push(`index.ts: component directory '${name}' has no component export`);
    }
  }

  // --- Printing types --------------------------------------------------------------------------

  /**
   * Prints a type node as written, with union members in code-unit order. An exported alias prints
   * by its exported name; a non-exported alias is expanded once. Anything that names an identifier
   * a consumer can't import (not from the entry, React or TypeScript's lib) is an error.
   */
  function printType(node, where, depth = 0) {
    const p = (n) => printType(n, where, depth);
    switch (node.kind) {
      case ts.SyntaxKind.UnionType: {
        const parts = [...new Set(node.types.map(p))].sort(byCodeUnit);
        return parts.join(' | ');
      }
      case ts.SyntaxKind.IntersectionType:
        return node.types.map(p).join(' & ');
      case ts.SyntaxKind.ParenthesizedType:
        return `(${p(node.type)})`;
      case ts.SyntaxKind.ArrayType:
        return `${wrap(node.elementType, p)}[]`;
      case ts.SyntaxKind.TypeOperator:
        return `${ts.tokenToString(node.operator)} ${p(node.type)}`;
      case ts.SyntaxKind.TupleType:
        return `[${node.elements.map(p).join(', ')}]`;
      case ts.SyntaxKind.LiteralType:
      case ts.SyntaxKind.StringKeyword:
      case ts.SyntaxKind.NumberKeyword:
      case ts.SyntaxKind.BooleanKeyword:
      case ts.SyntaxKind.UndefinedKeyword:
      case ts.SyntaxKind.NullKeyword:
      case ts.SyntaxKind.NeverKeyword:
      case ts.SyntaxKind.UnknownKeyword:
      case ts.SyntaxKind.VoidKeyword:
      case ts.SyntaxKind.ObjectKeyword:
      case ts.SyntaxKind.BigIntKeyword:
      case ts.SyntaxKind.SymbolKeyword:
        return collapse(node.getText());
      case ts.SyntaxKind.TemplateLiteralType:
        return collapse(node.getText());
      case ts.SyntaxKind.TypeLiteral:
        return `{ ${node.members.map((m) => printMember(m, where, depth)).join('; ')} }`;
      case ts.SyntaxKind.FunctionType: {
        const params = node.parameters.map(
          (param) =>
            `${param.dotDotDotToken ? '...' : ''}${param.name.getText()}${param.questionToken ? '?' : ''}: ${param.type ? p(param.type) : 'unknown'}`,
        );
        return `(${params.join(', ')}) => ${p(node.type)}`;
      }
      case ts.SyntaxKind.TypeReference: {
        const symbol = resolve(node.typeName);
        const args = node.typeArguments ? `<${node.typeArguments.map(p).join(', ')}>` : '';
        const decl = symbol?.declarations?.[0];
        if (!symbol || !decl) {
          errors.push(`${where}: can't resolve type '${node.typeName.getText()}'`);
          return node.typeName.getText() + args;
        }
        if (exportedName.has(symbol)) return exportedName.get(symbol) + args;
        const origin = originOf(decl);
        if (origin === 'react' || origin === 'lib') return node.typeName.getText() + args;
        if (origin === 'own' && ts.isTypeAliasDeclaration(decl) && depth === 0 && !args) {
          return printType(decl.type, `${where} (${symbol.name})`, depth + 1);
        }
        errors.push(
          `${where}: the printed type names '${symbol.name}', which isn't exported from the entry or React`,
        );
        return symbol.name + args;
      }
      default:
        errors.push(`${where}: can't print a ${ts.SyntaxKind[node.kind]} type`);
        return collapse(node.getText());
    }
  }

  function wrap(node, p) {
    const text = p(node);
    return ts.isUnionTypeNode(node) || ts.isFunctionTypeNode(node) ? `(${text})` : text;
  }

  function printMember(member, where, depth) {
    if (!ts.isPropertySignature(member) || !member.type) {
      errors.push(`${where}: can't print a ${ts.SyntaxKind[member.kind]} member`);
      return collapse(member.getText());
    }
    const readonly = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword);
    return `${readonly ? 'readonly ' : ''}${propName(member)}${member.questionToken ? '?' : ''}: ${printType(member.type, where, depth)}`;
  }

  // --- Props -----------------------------------------------------------------------------------

  /** The JSDoc on a property: its text (or `undefined`) and its `@default` tag. */
  function docOf(node) {
    const docs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
    const doc = docs.at(-1);
    if (!doc) return { text: undefined, default: undefined };
    const text = collapse(cleanDoc(ts.getTextOfJSDocComment(doc.comment) ?? ''));
    const tag = doc.tags?.find((t) => t.tagName.text === 'default');
    return {
      text: text || undefined,
      default: tag ? collapse(ts.getTextOfJSDocComment(tag.comment) ?? '') : undefined,
    };
  }

  /** The last `/** … *\/` comment in a source range: the JSDoc written before a union member. */
  function docBefore(file, from, to) {
    const comments = [...file.text.slice(from, to).matchAll(/\/\*\*([\s\S]*?)\*\//g)];
    const last = comments.at(-1);
    if (!last) return undefined;
    const text = collapse(
      cleanDoc(
        last[1]
          .split(/\r?\n/)
          .map((line) => line.replace(/^\s*\*\s?/, ''))
          .join('\n'),
      ),
    );
    return text || undefined;
  }

  /** A type node with its parentheses removed. */
  const bare = (node) => (ts.isParenthesizedTypeNode(node) ? bare(node.type) : node);

  /** Whether a type node is a set of props: an object literal, or an intersection of them. */
  const isPropSet = (node) => {
    const n = bare(node);
    return (
      ts.isTypeLiteralNode(n) ||
      (ts.isIntersectionTypeNode(n) && n.types.some((t) => ts.isTypeLiteralNode(bare(t))))
    );
  };

  /** The declared alias a type reference names, when it is a type alias in the package. */
  function aliasOf(reference) {
    const symbol = resolve(reference.typeName);
    const decl = symbol?.declarations?.find(ts.isTypeAliasDeclaration);
    return decl && originOf(decl) === 'own' ? { symbol, decl } : undefined;
  }

  /** `NativeProps<'x'>`, found through `Omit`, `Pick` and aliases: the native element. */
  function nativeElementOf(node, seen = new Set()) {
    const n = bare(node);
    if (!ts.isTypeReferenceNode(n)) return undefined;
    const name = n.typeName.getText();
    if (name === 'NativeProps') {
      const arg = n.typeArguments?.[0];
      return arg && ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)
        ? arg.literal.text
        : undefined;
    }
    if ((name === 'Omit' || name === 'Pick') && n.typeArguments?.[0]) {
      return nativeElementOf(n.typeArguments[0], seen);
    }
    const alias = aliasOf(n);
    if (alias && !seen.has(alias.decl)) {
      seen.add(alias.decl);
      return nativeElementOf(alias.decl.type, seen);
    }
    return undefined;
  }

  const nativeAttributes = new Map();
  for (const statement of sourceFile(nativePath).statements) {
    if (!ts.isTypeAliasDeclaration(statement)) continue;
    const element = statement.name.text.slice('Native_'.length);
    const names = checker
      .getTypeFromTypeNode(statement.type)
      .getProperties()
      .map((s) => s.name)
      .filter((n) => n !== 'key' && n !== 'ref');
    nativeAttributes.set(element, new Set(names));
  }

  /** The values of a prop typed as a union of string or number literals. */
  function valuesOf(typeNode) {
    const type = checker.getTypeFromTypeNode(typeNode);
    const members = (type.isUnion() ? type.types : [type]).filter(
      (t) => !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)),
    );
    if (members.length === 0) return undefined;
    if (!members.every((t) => t.isStringLiteral() || t.isNumberLiteral())) return undefined;
    return members.map((t) => t.value).sort((a, b) => byCodeUnit(String(a), String(b)));
  }

  const isNever = (member) => member.type?.kind === ts.SyntaxKind.NeverKeyword;

  /**
   * Analyses `<Name>Props`. Returns the props by axis and branch, the forbidden props and the
   * native attributes, or records errors.
   */
  function componentProps(name) {
    const path = `${src}/components/${name}/${name}.tsx`;
    const file = sourceFile(path);
    const where = `${name}Props`;
    const alias = file.statements.find(
      (s) => ts.isTypeAliasDeclaration(s) && s.name.text === `${name}Props`,
    );
    if (!alias) {
      errors.push(`${name}: ${path} declares no \`${name}Props\` type`);
      return undefined;
    }
    const top = bare(alias.type);
    const members = ts.isIntersectionTypeNode(top) ? top.types : [top];

    const commonLiterals = [];
    const axes = [];
    const nativeBases = [];
    for (const member of members) {
      const node = bare(member);
      if (ts.isTypeLiteralNode(node)) {
        commonLiterals.push(node);
      } else if (ts.isUnionTypeNode(node)) {
        errors.push(
          `${where}: an inline union (${collapse(node.getText()).slice(0, 60)}…). Every union in a props type is a named alias, intersected at the top level (CONVENTIONS rule 3)`,
        );
      } else if (ts.isTypeReferenceNode(node)) {
        const target = aliasOf(node);
        const declared = target && bare(target.decl.type);
        if (declared && ts.isUnionTypeNode(declared) && declared.types.every(isPropSet)) {
          axes.push({ symbol: target.symbol, decl: target.decl, union: declared });
        } else if (declared && containsPropUnion(declared)) {
          errors.push(
            `${where}: '${target.symbol.name}' nests a union of props. Every union in a props type is a named alias, intersected at the top level (CONVENTIONS rule 3)`,
          );
        } else {
          nativeBases.push(node);
        }
      } else {
        errors.push(`${where}: can't read a ${ts.SyntaxKind[node.kind]} member`);
      }
    }

    // Native bases: every prop must be declared by React's types.
    const element = nativeBases.map((b) => nativeElementOf(b)).find(Boolean);
    const nativeProps = new Set();
    for (const base of nativeBases) {
      for (const prop of checker.getTypeFromTypeNode(base).getProperties()) {
        const decl = prop.declarations?.[0];
        if (!decl || originOf(decl) !== 'react') {
          errors.push(
            `${where}: '${collapse(base.getText()).slice(0, 40)}' contributes '${prop.name}', which isn't a native attribute; declare own props in an object type`,
          );
          continue;
        }
        if (prop.name !== 'key' && prop.name !== 'ref') nativeProps.add(prop.name);
      }
    }
    if (!element) errors.push(`${where}: no \`NativeProps<'element'>\` base`);
    const attributes = nativeAttributes.get(element) ?? new Set();

    // Every own declaration of each prop, in order: the common literals, then each branch.
    const declarations = new Map();
    const declare = (member) => {
      const prop = propName(member);
      if (!declarations.has(prop)) declarations.set(prop, []);
      declarations.get(prop).push(member);
    };
    for (const literal of commonLiterals) literal.members.forEach(declare);
    const axisBranches = axes.map(({ union }) =>
      union.types.map((branch) => {
        const node = bare(branch);
        const parts = ts.isIntersectionTypeNode(node) ? node.types.map(bare) : [node];
        const literals = parts.filter(ts.isTypeLiteralNode);
        const nested = parts.filter((part) => !ts.isTypeLiteralNode(part));
        literals.forEach((l) => l.members.forEach(declare));
        return { node: branch, literals, nested };
      }),
    );
    for (const branches of axisBranches) {
      for (const { nested } of branches) {
        for (const part of nested) {
          if (ts.isUnionTypeNode(part) && part.types.every((t) => ts.isTypeLiteralNode(bare(t)))) {
            part.types.forEach((t) => bare(t).members.forEach(declare));
          }
        }
      }
    }

    /** The first JSDoc across a prop's declarations (L09 "Descriptions"). */
    const describe = (prop) => {
      for (const member of declarations.get(prop) ?? []) {
        const doc = docOf(member);
        if (doc.text) return doc;
      }
      return { text: undefined, default: undefined };
    };

    /** Props some declaration (or a native base) accepts, i.e. types as something but `never`. */
    const accepted = new Set(nativeProps);
    for (const [prop, decls] of declarations) {
      if (decls.some((d) => !isNever(d))) accepted.add(prop);
    }

    const toProp = (member, at) => {
      const prop = propName(member);
      if (!ts.isPropertySignature(member) || !member.type) {
        errors.push(`${at}: '${prop}' is not a property signature`);
        return undefined;
      }
      const doc = describe(prop);
      if (!doc.text) errors.push(`${at}: prop '${prop}' has no JSDoc`);
      const fallback = doc.text && /\bDefaults to `([^`]+)`/.exec(doc.text)?.[1];
      const values = valuesOf(member.type);
      return {
        name: prop,
        type: printType(member.type, `${at}.${prop}`),
        required: !member.questionToken,
        description: doc.text ?? '',
        ...((doc.default ?? fallback) ? { default: doc.default ?? fallback } : {}),
        ...(values ? { values } : {}),
        ...(attributes.has(prop) ? { overridesNative: true } : {}),
      };
    };
    const toForbidden = (member, at) => {
      const prop = propName(member);
      const doc = docOf(member);
      if (!doc.text)
        errors.push(`${at}: forbidden prop '${prop}' has no JSDoc saying what to use instead`);
      return { name: prop, useInstead: doc.text ?? '' };
    };

    const props = [];
    const forbidden = [];
    for (const literal of commonLiterals) {
      for (const member of literal.members) {
        if (isNever(member)) forbidden.push(toForbidden(member, where));
        else {
          const prop = toProp(member, where);
          if (prop) props.push(prop);
        }
      }
    }

    const manifestAxes = axes.map(({ symbol, decl, union }, index) => {
      const at = `${where} › ${symbol.name}`;
      const branches = axisBranches[index];
      const requiredIn = branches.map(({ literals }) =>
        literals.flatMap((l) =>
          l.members.filter((m) => !m.questionToken && !isNever(m)).map(propName),
        ),
      );
      const neverIn = branches.map(({ literals }) =>
        literals.flatMap((l) => l.members.filter(isNever).map(propName)),
      );
      return {
        name: symbol.name,
        exported: exportedName.has(symbol),
        ...(descriptionOf(decl) ? { description: descriptionOf(decl) } : {}),
        branches: branches.map(({ node, literals, nested }, i) => {
          // The union may be declared in another module (AlertDialog uses Dialog's DialogName).
          const declaredIn = decl.getSourceFile();
          const from = i === 0 ? union.pos : union.types[i - 1].end;
          const summary = docBefore(declaredIn, from, node.getStart(declaredIn));
          if (!summary) errors.push(`${at}: branch ${String(i + 1)} has no JSDoc summary`);
          const discriminant = requiredIn[i].filter((prop) =>
            neverIn.some((never, j) => j !== i && never.includes(prop)),
          );
          const branchProps = [];
          const notInBranch = [];
          const branchForbidden = [];
          for (const member of literals.flatMap((l) => [...l.members])) {
            if (!isNever(member)) {
              const prop = toProp(member, `${at} branch ${String(i + 1)}`);
              if (prop) branchProps.push(prop);
            } else if (accepted.has(propName(member))) {
              const note = docOf(member).text;
              notInBranch.push({ name: propName(member), ...(note ? { note } : {}) });
            } else {
              branchForbidden.push(toForbidden(member, `${at} branch ${String(i + 1)}`));
            }
          }
          const requiresOneOf = [];
          for (const part of nested) {
            if (
              ts.isUnionTypeNode(part) &&
              part.types.every((t) => ts.isTypeLiteralNode(bare(t)))
            ) {
              requiresOneOf.push(
                ...part.types.map((t) =>
                  bare(t)
                    .members.map((m) => toProp(m, `${at} branch ${String(i + 1)}`))
                    .filter(Boolean)
                    .sort(byName),
                ),
              );
            } else {
              errors.push(
                `${at} branch ${String(i + 1)}: only object types, and one nested union of them, can be intersected in a branch`,
              );
            }
          }
          return {
            summary: summary ?? '',
            discriminant: [...new Set(discriminant)].sort(byCodeUnit),
            props: branchProps.sort(byName),
            notInBranch: notInBranch.sort(byName),
            forbidden: branchForbidden.sort(byName),
            ...(requiresOneOf.length > 0 ? { requiresOneOf } : {}),
          };
        }),
      };
    });

    // Every prop present anywhere in the type, against the element's attributes.
    const present = new Set([...nativeProps, ...declarations.keys()]);
    const own = [...declarations.keys()];
    return {
      element,
      props: props.sort(byName),
      forbidden: forbidden.sort(byName),
      axes: manifestAxes,
      native: {
        element: element ?? '',
        omitted: [...attributes].filter((a) => !present.has(a)).sort(byCodeUnit),
        overridden: own
          .filter((p) => attributes.has(p) && (declarations.get(p) ?? []).some((d) => !isNever(d)))
          .sort(byCodeUnit),
      },
    };
  }

  /** Whether a type node contains a union of prop sets anywhere but at its own top level. */
  function containsPropUnion(node) {
    let found = false;
    const visit = (n) => {
      if (ts.isUnionTypeNode(n) && n.types.some(isPropSet)) found = true;
      else ts.forEachChild(n, visit);
    };
    visit(node);
    return found;
  }

  function descriptionOf(decl) {
    const doc = ts.getJSDocCommentsAndTags(decl).filter(ts.isJSDoc).at(-1);
    const text = doc ? collapse(cleanDoc(ts.getTextOfJSDocComment(doc.comment) ?? '')) : '';
    return text || undefined;
  }

  // --- Rendered markup: root element and data attributes ---------------------------------------

  /**
   * Walks the JSX the component renders, into the internal components it delegates to, and finds
   * the element carrying the root class and every `data-*` attribute with its values (from the
   * checker: the type of the attribute's expression, or of the prop it forwards).
   */
  function markup(name, rootClass) {
    const data = new Map();
    let rootElement;
    const rootPattern = new RegExp(`(^|[^a-z0-9_-])${rootClass}(?![a-z0-9_-])`);
    const visited = new Set();

    const visitFile = (file, callSite) => {
      if (visited.has(file.fileName)) return;
      visited.add(file.fileName);
      const visit = (node) => {
        if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
          element(node, callSite);
        ts.forEachChild(node, visit);
      };
      visit(file);
    };

    /** The expression an attribute's value forwards: a call-site attribute of the same name. */
    const forwarded = (expression, callSite) => {
      if (expression && ts.isIdentifier(expression) && callSite?.has(expression.text)) {
        return callSite.get(expression.text);
      }
      return expression;
    };

    const element = (node, callSite) => {
      const tag = node.tagName.getText();
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      if (/^[a-z]/.test(tag)) {
        for (const attribute of attributes) {
          const attrName = attribute.name.getText();
          const value = attribute.initializer;
          const expression = value && ts.isJsxExpression(value) ? value.expression : value;
          if (attrName.startsWith('data-')) {
            const source = forwarded(expression, callSite);
            const values = source ? literalValues(checker.getTypeAtLocation(source)) : ['true'];
            if (!values) {
              errors.push(
                `${name}: \`${attrName}\` on <${tag}> isn't typed as literal values, so its public values can't be listed`,
              );
            } else {
              const set = data.get(attrName) ?? new Set();
              values.forEach((v) => set.add(v));
              data.set(attrName, set);
            }
          }
          if (attrName === 'className' && rootElement === undefined && expression) {
            const mentions =
              rootPattern.test(expression.getText()) ||
              identifiers(expression).some((id) => {
                const site = callSite?.get(id);
                return site !== undefined && rootPattern.test(site.getText());
              });
            if (mentions) rootElement = tag;
          }
        }
      } else {
        const symbol = resolve(node.tagName);
        const decl = symbol?.declarations?.[0];
        const file = decl?.getSourceFile();
        if (file && slash(file.fileName).startsWith(`${src}/internal/`)) {
          const site = new Map();
          for (const attribute of attributes) {
            const value = attribute.initializer;
            const expression = value && ts.isJsxExpression(value) ? value.expression : value;
            if (expression) site.set(attribute.name.getText(), forwarded(expression, callSite));
          }
          visitFile(file, site);
        }
      }
    };

    visitFile(sourceFile(`${src}/components/${name}/${name}.tsx`), undefined);
    const dataAttributes = {};
    for (const key of [...data.keys()].sort(byCodeUnit)) {
      dataAttributes[key] = [...data.get(key)].sort(byCodeUnit);
    }
    return { rootElement, dataAttributes };
  }

  /** A type's literal members as attribute values (`true` renders `"true"`), or `undefined`. */
  function literalValues(type) {
    const values = [];
    for (const t of type.isUnion() ? type.types : [type]) {
      if (t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) continue;
      if (t.isStringLiteral() || t.isNumberLiteral()) values.push(String(t.value));
      else if (t.flags & ts.TypeFlags.BooleanLiteral) {
        // `false` renders no attribute, like `undefined`.
        if (checker.typeToString(t) === 'true') values.push('true');
      } else return undefined;
    }
    return values;
  }

  return { program, errors, exports, componentDirs, componentProps, markup };
}

function identifiers(node) {
  const names = [];
  const visit = (n) => {
    if (ts.isIdentifier(n)) names.push(n.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return names;
}

function propName(member) {
  const { name } = member;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : name.getText();
}

const byName = (a, b) => byCodeUnit(a.name, b.name);

function sourceFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && /\.tsx?$/.test(d.name) && !/\.(test|stories)/.test(d.name))
    .map((d) => slash(`${d.parentPath}/${d.name}`))
    .sort(byCodeUnit);
}

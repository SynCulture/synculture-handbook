// Splitting a line-wise cell into the statements it is made of.
//
// Some cells are not one program but a sequence of separate things to try:
// six traversal times, or a run of rewrites made while the instrument sounds.
// On a desktop those were run a line at a time, by putting the caret on a line
// and pressing Shift Enter. A phone has no caret to place and no Shift to hold,
// so the cell offered nothing to press and the reader was stuck.
//
// The statements are already written one per paragraph, separated by a blank
// line, with any explanation in the comment above. Each becomes a box of its
// own with its own button. Parenthesised blocks hold together because they
// carry no blank line inside them.
//
// Imported by sc-workspace.mjs in the browser and by the build when it renders
// the static listings, so the two always divide a cell the same way.

export function splitStatements(code) {
  return String(code)
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/\s+$/, ''))
    .filter((block) => block.trim().length > 0);
}

// The leading comment is what the statement is for, and the rest is the thing
// that runs. Separating them lets the comment be set as prose above the box
// rather than read as code inside it.
export function describeStatement(block) {
  const lines = block.split('\n');
  const comment = [];
  let i = 0;
  while (i < lines.length && /^\s*\/\//.test(lines[i])) {
    comment.push(lines[i].replace(/^\s*\/\/\s?/, ''));
    i += 1;
  }
  const code = lines.slice(i).join('\n').trim();
  // A block that is only a comment has nothing to run; keep it with its code.
  if (!code) return { note: '', code: block.trim() };
  return { note: comment.join(' ').trim(), code };
}

// The label for one statement of a cell: 04a, 04b, and so on. Lettered rather
// than renumbered so a cell keeps the number the entry refers to.
export function statementLabel(number, index) {
  return `${number}${String.fromCharCode(97 + index)}`;
}

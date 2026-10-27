// Duplicated and recurring tasks may share a stored attachment.
export function unreferencedAttachments(removed, remaining) {
  const attachments = task => Array.isArray(task.attachments) ? task.attachments : [];
  const used = new Set(remaining.flatMap(attachments).map(a => a?.pathname).filter(Boolean));
  return [...new Set(removed.flatMap(attachments).map(a => a?.pathname)
    .filter(p => typeof p === 'string' && p.startsWith('attachments/') && !used.has(p)))];
}

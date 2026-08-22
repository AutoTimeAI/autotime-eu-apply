// Pure pagination-display math, deliberately kept out of admin-users.ts
// (which imports "server-only" and so can't be imported from the client
// table component, or from a plain-node test) so both have something
// testable/importable to share.
export function getVisibleRowRange(
  page: number,
  perPage: number,
  total: number,
): { firstRow: number; lastRow: number } {
  if (total <= 0) {
    return { firstRow: 0, lastRow: 0 };
  }

  const firstRow = (page - 1) * perPage + 1;
  const lastRow = Math.min(page * perPage, total);
  return { firstRow, lastRow };
}

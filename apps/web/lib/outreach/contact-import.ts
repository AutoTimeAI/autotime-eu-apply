export const CONTACT_TYPES = ["recruiter", "hiring_manager", "peer_target_role"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export type ContactImportRow = {
  name: string;
  role: string;
  company: string;
  email: string;
  profileUrl: string;
  contactType: ContactType;
};

export type ParsedContactRow = ContactImportRow & { row: number; errors: string[] };

const aliases: Record<keyof Omit<ContactImportRow, "contactType"> | "contactType", string[]> = {
  name: ["name", "full name", "contact name"],
  role: ["role", "title", "job title"],
  company: ["company", "organisation", "organization", "employer"],
  email: ["email", "email address"],
  profileUrl: ["profile url", "profile", "linkedin", "linkedin url", "url"],
  contactType: ["contact type", "type"],
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += character;
  }
  values.push(value.trim());
  return values;
}
function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function validHttpUrl(value: string) {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

export function parseContactCsv(csv: string): ParsedContactRow[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(normaliseHeader);
  const column = (key: keyof ContactImportRow) => headers.findIndex((header) => aliases[key].includes(header));
  const columns = { name: column("name"), role: column("role"), company: column("company"), email: column("email"), profileUrl: column("profileUrl"), contactType: column("contactType") };
  return lines.slice(1, 101).map((line, index) => {
    const cells = parseCsvLine(line);
    const read = (position: number) => position < 0 ? "" : (cells[position] ?? "").trim();
    const rawType = read(columns.contactType).toLowerCase().replace(/[ -]+/g, "_");
    const contactType = CONTACT_TYPES.includes(rawType as ContactType) ? rawType as ContactType : "recruiter";
    const row: ParsedContactRow = { row: index + 2, name: read(columns.name), role: read(columns.role), company: read(columns.company), email: read(columns.email).toLowerCase(), profileUrl: read(columns.profileUrl), contactType, errors: [] };
    if (!row.name) row.errors.push("Name is required");
    if (!row.company) row.errors.push("Company is required");
    if (!row.email && !row.profileUrl) row.errors.push("Email or profile URL is required");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row.errors.push("Email is invalid");
    if (!validHttpUrl(row.profileUrl)) row.errors.push("Profile URL must use HTTP or HTTPS");
    if (rawType && !CONTACT_TYPES.includes(rawType as ContactType)) row.errors.push("Contact type is invalid");
    return row;
  });
}

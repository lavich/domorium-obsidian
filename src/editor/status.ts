export interface VersionStatus {
  kind: string;
  version?: string;
  dialect?: string;
  system?: string;
}

export interface GedcomStatus {
  version: VersionStatus | undefined;
  problems: number | undefined;
}

export function formatStatus(status: GedcomStatus): string {
  const problems = formatProblems(status.problems);
  return problems === undefined
    ? formatVersion(status.version)
    : `${formatVersion(status.version)} · ${problems}`;
}

function formatVersion(version: VersionStatus | undefined): string {
  switch (version?.kind) {
    case "supported":
      return `GEDCOM ${version.version}`;
    case "substituted":
      return `GEDCOM ${version.version}, checked as ${version.dialect}`;
    case "unsupported":
      return `GEDCOM ${version.version}, not checked`;
    case "paf":
      return `${version.system ?? "Personal Ancestral File"}, not checked`;
    case "undetermined":
      return "GEDCOM version missing, not checked";
    default:
      return "GEDCOM";
  }
}

function formatProblems(problems: number | undefined): string | undefined {
  if (problems === undefined) {
    return undefined;
  }
  if (problems === 0) {
    return "no problems";
  }
  return problems === 1 ? "1 problem" : `${problems} problems`;
}

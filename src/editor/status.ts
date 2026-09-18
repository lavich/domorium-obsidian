import { plural, t } from "../i18n";

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
      return t("status.supported", { version: version.version ?? "" });
    case "substituted":
      return t("status.substituted", {
        version: version.version ?? "",
        dialect: version.dialect ?? "",
      });
    case "unsupported":
      return t("status.unsupported", { version: version.version ?? "" });
    case "paf":
      return t("status.paf", {
        system: version.system ?? "Personal Ancestral File",
      });
    case "undetermined":
      return t("status.undetermined");
    default:
      return "GEDCOM";
  }
}

function formatProblems(problems: number | undefined): string | undefined {
  if (problems === undefined) {
    return undefined;
  }
  if (problems === 0) {
    return t("status.noProblems");
  }
  return plural("status.problems", problems);
}

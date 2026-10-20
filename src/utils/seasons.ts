type CompetitionRelation = { name: string } | { name: string }[] | null;

export function competitionName(relation: CompetitionRelation): string {
  const competition = Array.isArray(relation) ? relation[0] : relation;
  return competition?.name ?? "Competition";
}

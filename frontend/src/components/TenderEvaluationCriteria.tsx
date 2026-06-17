import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEvaluationCriteriaTree } from "../api/evaluationCriteria";
import { EvaluationCriteriaTreeView } from "../components/EvaluationCriteriaTree";
import type { CriterionLivello } from "../types/evaluationCriteria";

interface TenderEvaluationCriteriaProps {
  tenderId: number;
  isProcessing?: boolean;
}

export function TenderEvaluationCriteria({
  tenderId,
  isProcessing,
}: TenderEvaluationCriteriaProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [livelloFilter, setLivelloFilter] = useState<CriterionLivello | "">("");

  const filters = useMemo(
    () => ({
      q: searchQuery,
      livello: livelloFilter,
    }),
    [searchQuery, livelloFilter],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["tenders", tenderId, "evaluation-criteria", filters],
    queryFn: () => fetchEvaluationCriteriaTree(tenderId, filters),
    refetchInterval: isProcessing ? 2000 : false,
  });

  return (
    <EvaluationCriteriaTreeView
      tenderId={tenderId}
      criteria={data?.criteria ?? []}
      summary={
        data?.summary ?? {
          criteri_count: 0,
          punteggio_totale: null,
          elementi_premianti_count: 0,
        }
      }
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      livelloFilter={livelloFilter}
      onLivelloChange={setLivelloFilter}
    />
  );
}

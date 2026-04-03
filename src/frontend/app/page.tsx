"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Database,
  FileCode2,
  FileUp,
  FolderKanban,
  Home as HomeIcon,
  Sparkles,
  ChevronsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HeroWebGLBackground = dynamic(
  () =>
    import("@/components/hero-webgl-background").then((m) => m.HeroWebGLBackground),
  {
    ssr: false,
    loading: () => (
      <div
        className="pointer-events-none absolute inset-0 z-0 min-h-[calc(100vh-52px)] w-full min-w-full bg-background"
        aria-hidden
      />
    ),
  }
);

type AnalysisResult = {
  quality_score?: string | number;
  risk_flags?: string[];
  dataset_info?: {
    rows?: number;
    columns?: number;
    column_names?: string[];
  };
  missing_analysis?: Record<
    string,
    {
      missing_count?: number;
      missing_percent?: number;
    }
  >;
  outlier_analysis?: Record<
    string,
    {
      outlier_count?: number;
      outlier_percent?: number;
    }
  >;
  duplicates?: number;
  class_distribution?: Record<string, number> | string;
  /** Column used for the class-balance chart (chosen by name or heuristic). */
  class_distribution_column?: string | null;
  class_distribution_imbalance?: {
    imbalance_ratio?: number | null;
    max_class_share?: number | null;
    is_imbalanced?: boolean;
  } | null;
  column_metadata?: Record<
    string,
    {
      dtype?: string;
      non_null_count?: number;
      null_count?: number;
      unique_count?: number;
      null_percent?: number;
      sample_values?: string[];
      min?: number;
      max?: number;
      mean?: number;
    }
  >;
};

type SuggestionConfidence = "high" | "medium" | "low";
type SuggestionFillMethod = "median" | "mode" | "minmax";
type SuggestionKind = "impute" | "normalize";

type ColumnSuggestion = {
  column: string;
  suggestion_kind?: SuggestionKind;
  missing_percent: number;
  suggested_fix: string;
  confidence: SuggestionConfidence;
  fill_method: SuggestionFillMethod;
  reason?: string;
};

const suggestionKey = (s: ColumnSuggestion) =>
  `${s.column}::${s.fill_method}`;

type LabelDistRow = { label: string; percent: number; count: number };

function LabelDistributionPanel({
  rows,
  columnName,
  imbalance,
  hint,
}: {
  rows: LabelDistRow[];
  columnName?: string | null;
  imbalance?: AnalysisResult["class_distribution_imbalance"];
  hint: string | null;
}) {
  const ratio = imbalance?.imbalance_ratio ?? null;
  const showWarning = Boolean(imbalance?.is_imbalanced && ratio != null);

  return (
    <div
      className="rounded-lg border border-border bg-muted/20 p-4 transition-colors duration-200"
      data-cursor-hover
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Label distribution
          </p>
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">
            {columnName ? (
              <>
                Values in{" "}
                <span className="font-mono text-foreground/90">{columnName}</span>
                . Bars show each value’s share of rows (≈100% total). Counts are estimated from row
                totals.
              </>
            ) : (
              <>
                Categorical or low-cardinality column chosen automatically. Each bar is a distinct
                value’s share of rows.
              </>
            )}
          </p>
        </div>
        {rows.length >= 2 && ratio != null ? (
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Imbalance ratio
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {ratio.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">max ÷ min class count</p>
          </div>
        ) : null}
      </div>

      {showWarning ? (
        <div className="mt-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <span className="font-medium">⚠️ Imbalanced dataset detected</span>
          <p className="mt-1 text-xs text-amber-100/85">
            One class dominates the distribution. Consider resampling, weights, or stratified splits
            before training.
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {rows.length ? (
          rows.slice(0, 10).map((row) => {
            const w = Math.min(Math.max(row.percent, 0), 100);
            return (
              <div
                key={`ld-${row.label}`}
                className="group relative"
              >
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={row.label}>
                    {row.label}
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    <span className="text-foreground">{row.count.toLocaleString()}</span>
                    <span className="mx-1.5 text-border">·</span>
                    <span>{row.percent.toFixed(1)}%</span>
                  </span>
                </div>
                <div className="relative h-2.5 overflow-visible rounded-full bg-muted">
                  <div
                    className="h-2.5 max-w-full rounded-full bg-white/90 transition-[width] duration-700 ease-out motion-reduce:transition-none group-hover:bg-white group-hover:shadow-[0_0_14px_rgba(255,255,255,0.18)]"
                    style={{ width: `${w}%` }}
                  />
                </div>
                <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden min-w-[180px] rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md group-hover:block">
                  <p className="font-mono font-semibold text-foreground">{row.label}</p>
                  <p className="mt-1 tabular-nums text-muted-foreground">
                    {row.count.toLocaleString()} rows · {row.percent.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-base text-muted-foreground">
            {hint ??
              "No suitable column found. We look for common label names (label, class, y, …) or a low-cardinality categorical column."}
          </p>
        )}
      </div>
    </div>
  );
}

type AnalyzeResponse = {
  analysis?: AnalysisResult;
  ai_insights?: string;
  suggestions?: ColumnSuggestion[];
};

type BiasSignal = {
  message: string;
  severity: "low" | "medium" | "high";
};

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dataset");
  const [datasetUploadOpen, setDatasetUploadOpen] = useState(false);
  const [activityLog, setActivityLog] = useState<string[]>([
    "Workspace initialized. Upload a dataset to begin analysis.",
  ]);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<
    Array<{ column: string; fill_method: SuggestionFillMethod }>
  >([]);
  const [ignoredSuggestionKeys, setIgnoredSuggestionKeys] = useState<string[]>([]);
  const [updatedDatasetUrl, setUpdatedDatasetUrl] = useState<string | null>(null);
  const [applyingSuggestions, setApplyingSuggestions] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tableRows = useMemo(() => {
    const missing = result?.analysis?.missing_analysis ?? {};
    const outliers = result?.analysis?.outlier_analysis ?? {};

    return Object.entries(missing)
      .map(([column, stats]) => ({
        column,
        missingPercent: Number(stats?.missing_percent ?? 0),
        missingCount: Number(stats?.missing_count ?? 0),
        outlierPercent: Number(outliers[column]?.outlier_percent ?? 0),
      }))
      .sort((a, b) => b.missingPercent - a.missingPercent);
  }, [result]);

  const qualityMetrics = useMemo(() => {
    const analysis = result?.analysis;
    if (!analysis?.dataset_info?.rows || !analysis?.dataset_info?.columns) {
      return {
        completenessPercent: 0,
        totalMissingCells: 0,
        totalCells: 0,
      };
    }

    const totalRows = analysis.dataset_info.rows;
    const totalColumns = analysis.dataset_info.columns;
    const totalCells = totalRows * totalColumns;
    const totalMissingCells = Object.values(analysis.missing_analysis ?? {}).reduce(
      (acc, col) => acc + Number(col?.missing_count ?? 0),
      0
    );
    const completenessPercent = totalCells
      ? Math.max(0, 100 - (totalMissingCells / totalCells) * 100)
      : 0;

    return {
      completenessPercent,
      totalMissingCells,
      totalCells,
    };
  }, [result]);

  /** Label distribution: shares + approximate counts for tooltips. */
  const classDistributionRows = useMemo(() => {
    const classDist = result?.analysis?.class_distribution;
    const totalRows = result?.analysis?.dataset_info?.rows ?? 0;
    if (!classDist || typeof classDist !== "object" || Array.isArray(classDist)) return [];

    const entries = Object.entries(classDist as Record<string, number>);
    if (!entries.length) return [];

    const parsed = entries.map(([label, value]) => ({
      label,
      n: Number(value),
    }));
    const sum = parsed.reduce((acc, row) => acc + (Number.isFinite(row.n) ? row.n : 0), 0);
    if (!sum || !Number.isFinite(sum)) return [];

    const treatAsProportions = sum <= 1.01;
    return parsed
      .map((row) => {
        const percent = treatAsProportions ? row.n * 100 : (row.n / sum) * 100;
        const count = treatAsProportions
          ? Math.max(0, Math.round(row.n * totalRows))
          : Math.round(row.n);
        return { label: row.label, percent, count };
      })
      .filter((row) => Number.isFinite(row.percent))
      .sort((a, b) => b.percent - a.percent);
  }, [result]);

  const classDistributionHint = useMemo(() => {
    const cd = result?.analysis?.class_distribution;
    if (!result?.analysis) return null;
    if (typeof cd === "string") return cd;
    return null;
  }, [result]);

  const aiSections = useMemo(() => {
    const raw = result?.ai_insights ?? "";
    const sections: Record<string, string[]> = {};
    let current = "";

    raw.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.endsWith(":")) {
        current = trimmed.replace(":", "").toUpperCase();
        sections[current] = [];
        return;
      }
      if (current) {
        sections[current].push(trimmed.replace(/^- /, ""));
      }
    });

    return sections;
  }, [result]);

  const biasingSignals = useMemo(() => {
    const analysis = result?.analysis;
    if (!analysis) return [];

    const signals: BiasSignal[] = [];
    const rows = analysis.dataset_info?.rows ?? 0;
    const duplicates = analysis.duplicates ?? 0;
    const duplicatePercent = rows ? (duplicates / rows) * 100 : 0;

    if (duplicatePercent > 25) {
      signals.push({
        message: `Very high duplicate rate detected (${duplicatePercent.toFixed(2)}%).`,
        severity: "high",
      });
    } else if (duplicatePercent > 10) {
      signals.push({
        message: `High duplicate rate detected (${duplicatePercent.toFixed(2)}%).`,
        severity: "medium",
      });
    }

    const highMissing = Object.entries(analysis.missing_analysis ?? {})
      .filter(([, value]) => Number(value?.missing_percent ?? 0) > 20)
      .map(([column]) => column);
    if (highMissing.length) {
      signals.push({
        message: `High missingness in: ${highMissing.slice(0, 5).join(", ")}.`,
        severity: highMissing.length >= 3 ? "high" : "medium",
      });
    }

    if (
      analysis.class_distribution &&
      typeof analysis.class_distribution === "object" &&
      Object.keys(analysis.class_distribution).length
    ) {
      const values = Object.values(analysis.class_distribution);
      const maxShare = Math.max(...values);
      if (maxShare > 0.8) {
        signals.push({
          message: `Class imbalance present (largest class ${(maxShare * 100).toFixed(2)}%).`,
          severity: maxShare > 0.9 ? "high" : "medium",
        });
      }
    }

    if (!signals.length) {
      signals.push({
        message: "No major biasing signals detected from current quality metrics.",
        severity: "low",
      });
    }
    return signals;
  }, [result]);

  const getSeverityClass = (severity: BiasSignal["severity"]) => {
    if (severity === "high") {
      return "border-red-500/40 bg-red-500/10 text-red-300";
    }
    if (severity === "medium") {
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    }
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  };

  const getConfidenceClass = (confidence: SuggestionConfidence) => {
    if (confidence === "high") {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    }
    if (confidence === "medium") {
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    }
    return "border-red-500/40 bg-red-500/10 text-red-300";
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 2400);
  };

  useEffect(() => {
    return () => {
      if (updatedDatasetUrl) URL.revokeObjectURL(updatedDatasetUrl);
    };
  }, [updatedDatasetUrl]);

  const handleAnalyze = async () => {
    if (!file) {
      alert("Select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setDatasetUploadOpen(false);

    setLoading(true);
    setActivityLog((prev) => [
      `Analysis started for file: ${file.name}`,
      ...prev,
    ]);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data?.error) {
        const msg = data?.error || `Request failed with status ${res.status}`;
        throw new Error(msg);
      }
      setResult(data as AnalyzeResponse);
      setActiveTab("insights");
      setAppliedSuggestions([]);
      setIgnoredSuggestionKeys([]);
      setUpdatedDatasetUrl(null);
      setActivityLog((prev) => [
        `Analysis completed. Quality score: ${
          (data as AnalyzeResponse)?.analysis?.quality_score ?? "n/a"
        }`,
        ...prev,
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Backend error while analyzing file.";
      setActivityLog((prev) => [`Analysis failed: ${message}`, ...prev]);
      alert(`Analyze failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnoreSuggestion = (suggestion: ColumnSuggestion) => {
    const key = suggestionKey(suggestion);
    if (appliedSuggestions.some((s) => s.column === suggestion.column && s.fill_method === suggestion.fill_method)) {
      return;
    }
    setIgnoredSuggestionKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const handleApplySuggestion = async (suggestion: ColumnSuggestion) => {
    if (!file) {
      alert("Select a file first.");
      return;
    }

    if (
      appliedSuggestions.some(
        (s) => s.column === suggestion.column && s.fill_method === suggestion.fill_method
      )
    ) {
      return;
    }

    const nextApplied = [
      ...appliedSuggestions,
      { column: suggestion.column, fill_method: suggestion.fill_method },
    ];

    setApplyingSuggestions(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("applied", JSON.stringify(nextApplied));

      const res = await fetch(`${apiBase}/apply_suggestions`, {
        method: "POST",
        body: formData,
      });

      const csvText = await res.text();
      if (!res.ok) {
        const msg = csvText || `Request failed with status ${res.status}`;
        throw new Error(msg);
      }

      const blob = new Blob([csvText], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      setUpdatedDatasetUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setAppliedSuggestions(nextApplied);
      if (suggestion.fill_method === "minmax") {
        showToast(`Column ${suggestion.column} normalized (Min-Max)`);
      } else {
        showToast(`Applied suggestion for ${suggestion.column}`);
      }
      setActivityLog((prev) => [
        `Applied suggestion: ${suggestion.column} (${suggestion.fill_method}).`,
        ...prev,
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Backend error while applying suggestions.";
      setActivityLog((prev) => [`Apply failed: ${message}`, ...prev]);
      alert(`Apply failed: ${message}`);
    } finally {
      setApplyingSuggestions(false);
    }
  };

  const handleDownloadUpdatedCsv = () => {
    if (!updatedDatasetUrl) return;
    const a = document.createElement("a");
    a.href = updatedDatasetUrl;
    a.download = "updated_dataset.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {toastMessage ? (
        <div className="fixed right-5 top-16 z-50 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg">
          {toastMessage}
        </div>
      ) : null}

      <section
        ref={heroRef}
        className="relative flex min-h-[calc(100vh-52px)] w-full flex-col items-center justify-center px-6 py-10 text-center md:px-10"
      >
        <HeroWebGLBackground heroRef={heroRef} />
        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <h1 className="font-mono text-6xl font-semibold tracking-tight drop-shadow-md md:text-7xl">
            DAL
          </h1>
          <p className="mt-4 font-serif text-lg text-muted-foreground drop-shadow md:text-xl">
            your ai powered dataset analyzer
          </p>
        </div>
      </section>

      <section className="mx-auto min-h-screen w-full max-w-[1600px] px-6 pb-8 pt-10 text-xl md:px-10">
        <div className="flex flex-col items-center">
          <ChevronsDown className="-mt-8 h-6 w-6 animate-bounce text-muted-foreground" />
        </div>
        <div className="grid gap-5">
          <Card>
              <CardHeader className="border-b">
                <CardTitle>Dashboard Preview</CardTitle>
                <CardDescription>Fluid layout for dataset operations and AI insights.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="h-11">
                    <TabsTrigger value="dataset" className="text-lg">Dataset</TabsTrigger>
                    <TabsTrigger value="charts" className="text-lg">Charts</TabsTrigger>
                    <TabsTrigger value="insights" className="text-lg">Insights</TabsTrigger>
                    <TabsTrigger value="biasing" className="text-lg">Biasing</TabsTrigger>
                    <TabsTrigger value="suggestions" className="text-lg">Suggestions</TabsTrigger>
                    <TabsTrigger value="activity" className="text-lg">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dataset" className="mt-4 space-y-4">
                      <div className="rounded-xl border border-dashed border-border p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xl font-medium">Drag and drop dataset files</p>
                          <p className="text-lg text-muted-foreground">
                            Supports CSV, JSON, XLSX and Parquet.
                          </p>
                        </div>
                        <Dialog
                          open={datasetUploadOpen}
                          onOpenChange={setDatasetUploadOpen}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline"><FileCode2 className="size-4" /> Open Upload Flow</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload Flow</DialogTitle>
                              <DialogDescription>Attach a file and trigger DAL analysis.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                              <Input
                                type="file"
                                onChange={(e) => {
                                  const picked = e.target.files?.[0] ?? null;
                                  setFile(picked);
                                  if (picked) {
                                    setActivityLog((prev) => [
                                      `Selected file: ${picked.name}`,
                                      ...prev,
                                    ]);
                                  }
                                }}
                              />
                              <Button onClick={handleAnalyze}>{loading ? "Analyzing..." : "Analyze Dataset"}</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    {result?.analysis ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-4 text-lg">
                        <p className="text-xl font-medium">Latest analysis completed.</p>
                        <p className="mt-1 text-lg text-muted-foreground">
                          Quality score: {result.analysis.quality_score} | Risk flags:{" "}
                          {result.analysis.risk_flags?.length ?? 0}
                        </p>
                      </div>
                    ) : null}

                    <Card className="overflow-hidden py-0">
                      <CardHeader className="border-b px-4 py-4">
                        <CardTitle className="text-base">Dataset preview</CardTitle>
                        <CardDescription>
                          Column-level missingness and outliers (sorted by missing %).
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-0 pb-0 pt-0">
                        <ScrollArea className="h-[min(75vh,720px)] rounded-b-xl">
                          <div className="p-6">
                            <Table className="font-mono text-base">
                              <TableHeader className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm [&_tr]:border-b-0">
                                <TableRow className="border-b-0 hover:bg-transparent">
                                  <TableHead className="h-14 min-w-[200px] text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Column
                                  </TableHead>
                                  <TableHead className="h-14 text-right text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Missing %
                                  </TableHead>
                                  <TableHead className="h-14 text-right text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Missing cells
                                  </TableHead>
                                  <TableHead className="h-14 text-right text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Outlier %
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tableRows.length ? (
                                  tableRows.map((row) => (
                                    <TableRow
                                      key={row.column}
                                      className="border-border/60 odd:bg-muted/20 hover:bg-muted/30 transition-colors"
                                    >
                                      <TableCell className="max-w-[300px] py-4 font-medium text-foreground">
                                        {row.column}
                                      </TableCell>
                                      <TableCell className="text-right py-4 tabular-nums text-foreground/90">
                                        {row.missingPercent.toFixed(2)}%
                                      </TableCell>
                                      <TableCell className="text-right py-4 tabular-nums text-muted-foreground">
                                        {row.missingCount}
                                      </TableCell>
                                      <TableCell className="text-right py-4 tabular-nums text-muted-foreground">
                                        {row.outlierPercent.toFixed(2)}%
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell
                                      colSpan={4}
                                      className="py-16 text-center text-lg text-muted-foreground"
                                    >
                                      Upload and analyze a dataset to populate this table.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="charts" className="mt-4">
                    <Card className="py-4">
                        <CardHeader className="px-4">
                          <CardTitle className="text-base">Charts & Insights</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                              <div className="rounded-lg border border-border bg-muted/20 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Completeness
                                </p>
                                <div className="mt-3 flex items-center gap-4">
                                  <div
                                    className="h-16 w-16 rounded-full border border-border"
                                    style={{
                                      background: `conic-gradient(white ${
                                        qualityMetrics.completenessPercent * 3.6
                                      }deg, rgba(255,255,255,0.12) 0deg)`,
                                    }}
                                  />
                                  <div>
                                <p className="text-3xl font-semibold">
                                      {qualityMetrics.completenessPercent.toFixed(1)}%
                                    </p>
                                <p className="text-base text-muted-foreground">
                                      {qualityMetrics.totalMissingCells} missing /{" "}
                                      {qualityMetrics.totalCells} total cells
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-border bg-muted/20 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Top Missing Columns
                                </p>
                                <div className="mt-3 space-y-2">
                                  {(tableRows.slice(0, 4) || []).map((row) => (
                                    <div key={`miss-${row.column}`}>
                                      <div className="mb-1 flex items-center justify-between text-base">
                                        <span className="truncate">{row.column}</span>
                                        <span>{row.missingPercent.toFixed(1)}%</span>
                                      </div>
                                      <div className="h-2 rounded-full bg-muted">
                                        <div
                                          className="h-2 rounded-full bg-white"
                                          style={{ width: `${Math.min(row.missingPercent, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                  {!tableRows.length ? (
                                    <p className="text-base text-muted-foreground">
                                      Analyze a dataset to render missingness trends.
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <LabelDistributionPanel
                              rows={classDistributionRows}
                              columnName={result?.analysis?.class_distribution_column}
                              imbalance={result?.analysis?.class_distribution_imbalance}
                              hint={classDistributionHint}
                            />
                          </div>
                        </CardContent>
                      </Card>
                  </TabsContent>

                  <TabsContent value="insights" className="mt-4">
                    <Card>
                      <CardContent className="px-4 pt-4">
                        <ScrollArea className="h-[min(55vh,550px)]">
                          <div className="space-y-4 text-base leading-relaxed">
                            {!result?.analysis ? (
                              <div className="text-muted-foreground p-4">
                                Run analysis to see AI insights conversation.
                              </div>
                            ) : (
                              <div className="bg-card/50 backdrop-blur-sm px-4 py-1 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <p className="text-base text-muted-foreground font-medium">
                                    DAL (Live)
                                    </p>
                                  <p className="text-2xl font-semibold leading-none relative top-[1px]">
                                    Quality score: {result.analysis.quality_score}
                                    </p>
                                </div>
                                <div className="mt-2 space-y-3">
                                  {[
                                    ["ABOUT DATASET", "About Dataset"],
                                    ["RISKS", "Risks"],
                                    ["BIAS", "Bias"],
                                    ["CLEANING", "Cleaning"],
                                    ["ML IMPACT", "ML Impact"],
                                  ].map(([key, label]) =>
                                    (aiSections[key] ?? []).length ? (
                                      <div key={key} className="bg-muted/20 p-4 rounded-lg">
                                        <p className="text-base font-semibold uppercase tracking-wide text-foreground">
                                          {label}
                                        </p>
                                        <div className="mt-2 space-y-1.5">
                                          {(aiSections[key] ?? []).map((item, i) => (
                                            <p key={`${key}-${i}`} className="leading-relaxed">
                                              - {item}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="biasing" className="mt-4">
                    <Card className="py-4">
                      <CardHeader className="px-4">
                        <CardTitle className="text-xl">Biasing Report</CardTitle>
                        <CardDescription className="text-lg">
                          Potential bias/leakage risks derived from metadata and AI review.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-4 space-y-4 text-lg">
                        <div className="bg-muted/10 p-4 rounded-lg">
                          <p className="text-xl font-medium">What This Dataset Is About</p>
                          {(aiSections["ABOUT DATASET"] ?? []).length ? (
                            <div className="mt-2 space-y-1">
                              {(aiSections["ABOUT DATASET"] ?? []).map((item, i) => (
                                <p key={`about-meta-${i}`}>- {item}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-muted-foreground">
                              Re-run analysis to generate an easy explanation from metadata.
                            </p>
                          )}
                        </div>
                        <div className="bg-muted/10 p-4 rounded-lg">
                          <p className="text-xl font-medium">Computed Biasing Signals</p>
                          <div className="mt-2 space-y-2">
                            {biasingSignals.map((item, i) => (
                              <div key={`signal-${i}`} className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${getSeverityClass(
                                    item.severity
                                  )}`}
                                >
                                  {item.severity}
                                </span>
                                <p className="leading-none">- {item.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-muted/10 p-4 rounded-lg">
                          <p className="text-xl font-medium">AI Bias Assessment</p>
                          {(aiSections["BIAS"] ?? []).length ? (
                            <div className="mt-2 space-y-1">
                              {(aiSections["BIAS"] ?? []).map((item, i) => (
                                <p key={`biasing-${i}`}>- {item}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-muted-foreground">
                              No AI bias report yet. Re-run analysis to fetch BIAS section.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="suggestions" className="mt-4">
                    <Card className="py-4">
                      <CardHeader className="border-b px-4">
                        <CardTitle className="text-base">Suggestions</CardTitle>
                        <CardDescription className="text-lg">
                          Apply fixes column-by-column. Nothing auto-runs. Confidence bands (High /
                          Medium / Low) reflect how safe each suggested fix is expected to be.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-4">
                        {!result?.analysis ? (
                          <div className="rounded-lg border border-border bg-muted/20 p-4 text-muted-foreground">
                            Run analysis first to generate suggestions.
                          </div>
                        ) : !result?.suggestions?.length ? (
                          <div className="rounded-lg border border-border bg-muted/20 p-4 text-muted-foreground">
                            No suggestions for this dataset (missing values or advanced ML-prep).
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <ScrollArea className="h-[min(58vh,560px)] pr-4">
                              <div className="space-y-3">
                                {result.suggestions.map((s) => {
                                  const sk = suggestionKey(s);
                                  const isApplied = appliedSuggestions.some(
                                    (x) => x.column === s.column && x.fill_method === s.fill_method
                                  );
                                  const isIgnored = ignoredSuggestionKeys.includes(sk);
                                  const isNorm = s.suggestion_kind === "normalize" || s.fill_method === "minmax";
                                  return (
                                    <div
                                      key={sk}
                                      className="rounded-lg border border-border bg-muted/20 p-4 transition-colors duration-200 hover:border-border"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-base font-semibold">{s.column}</p>
                                            {isNorm ? (
                                              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                                ML-prep
                                              </span>
                                            ) : null}
                                          </div>
                                          {!isNorm ? (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                              {s.missing_percent.toFixed(2)}% missing
                                            </p>
                                          ) : (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                              Numeric column · advanced normalization
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Confidence
                                          </span>
                                          <span
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getConfidenceClass(
                                              s.confidence
                                            )}`}
                                          >
                                            {s.confidence === "high"
                                              ? "High"
                                              : s.confidence === "medium"
                                                ? "Medium"
                                                : "Low"}
                                          </span>
                                        </div>
                                      </div>

                                      <p className="mt-2 text-sm text-foreground/80">
                                        {s.suggested_fix}
                                      </p>
                                      {s.reason ? (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          Reason: {s.reason}
                                        </p>
                                      ) : null}

                                      <div className="mt-4 flex flex-wrap gap-2">
                                        <Button
                                          onClick={() => handleApplySuggestion(s)}
                                          disabled={applyingSuggestions || isApplied || isIgnored}
                                          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                        >
                                          Yes (Apply)
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => handleIgnoreSuggestion(s)}
                                          disabled={applyingSuggestions || isApplied || isIgnored}
                                        >
                                          No (Ignore)
                                        </Button>
                                      </div>

                                      {isApplied ? (
                                        <p className="mt-2 text-xs text-emerald-300">
                                          Applied.
                                        </p>
                                      ) : isIgnored ? (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                          Ignored.
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>

                            {updatedDatasetUrl ? (
                              <div className="rounded-lg border border-border bg-muted/20 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-base font-semibold">Download updated dataset</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      Export as CSV after applying your suggestions.
                                    </p>
                                  </div>
                                  <Button
                                    onClick={handleDownloadUpdatedCsv}
                                    disabled={applyingSuggestions}
                                  >
                                    Download CSV
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4">
                    <Card className="py-4">
                      <CardHeader className="px-4">
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 text-lg text-muted-foreground space-y-3">
                        <div className="rounded-lg border border-border p-3">
                          <p>
                            Last quality score: {result?.analysis?.quality_score ?? "-"} | Rows:{" "}
                            {result?.analysis?.dataset_info?.rows ?? "-"} | Columns:{" "}
                            {result?.analysis?.dataset_info?.columns ?? "-"}
                          </p>
                        </div>
                        <ScrollArea className="h-52 rounded-lg border border-border p-3">
                          <div className="space-y-2">
                            {activityLog.map((entry, idx) => (
                              <p key={`${entry}-${idx}`}>- {entry}</p>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
      </section>
    </div>
  );
}

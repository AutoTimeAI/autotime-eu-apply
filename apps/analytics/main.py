from __future__ import annotations

from collections import Counter, defaultdict
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


ScoreBand = Literal["0-39", "40-59", "60-79", "80-100", "unknown"]
LearningStage = Literal["collecting", "early-calibration", "calibration-ready"]


class EvidenceRecord(BaseModel):
    applicationId: str | None = None
    checkKey: str = ""
    checkLabel: str = ""
    status: Literal["found", "missing", "risk", "limit"] = "limit"
    evidenceText: str = ""
    sourceType: str = ""
    missingInput: str | None = None
    riskFlag: str | None = None


class OutcomeRecord(BaseModel):
    applicationId: str
    roleTitle: str = ""
    company: str | None = None
    country: str | None = None
    source: str | None = None
    status: str = "Saved"
    outcomeReason: str = "Unknown"
    decisionIndexAtSave: float | None = None
    decisionLabelAtSave: str | None = None
    contentGateAtSave: str | None = None


class AnalyticsRequest(BaseModel):
    evidenceRecords: list[EvidenceRecord] = Field(default_factory=list)
    outcomeRecords: list[OutcomeRecord] = Field(default_factory=list)


class FeatureRow(BaseModel):
    applicationId: str
    scoreBand: ScoreBand
    decisionIndexAtSave: float | None
    missingEvidenceCount: int
    riskCount: int
    foundEvidenceCount: int
    limitCount: int
    contentGateAtSave: str | None
    status: str
    outcomeReason: str
    interviewSignal: bool


def score_band(score: float | None) -> ScoreBand:
    if score is None:
        return "unknown"
    if score < 40:
        return "0-39"
    if score < 60:
        return "40-59"
    if score < 80:
        return "60-79"
    return "80-100"


def pct(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round((part / whole) * 100, 2)


def is_interview(record: OutcomeRecord) -> bool:
    return record.status == "Interview" or record.outcomeReason == "Interview secured"


def learning_stage(outcome_count: int) -> LearningStage:
    if outcome_count >= 100:
        return "calibration-ready"
    if outcome_count >= 30:
        return "early-calibration"
    return "collecting"


def learning_message(stage: LearningStage, outcome_count: int) -> str:
    if stage == "calibration-ready":
        return "Enough tracked outcomes exist to train and validate an explainable baseline model."
    if stage == "early-calibration":
        return "Enough outcomes exist for early calibration charts, but predictive wording should stay limited."
    remaining = 30 - outcome_count
    return f"Collect {remaining} more outcome record{'s' if remaining != 1 else ''} before early calibration."


def build_feature_rows(
    evidence: list[EvidenceRecord], outcomes: list[OutcomeRecord]
) -> list[FeatureRow]:
    evidence_by_application: dict[str, Counter[str]] = defaultdict(Counter)

    for record in evidence:
        if record.applicationId:
            evidence_by_application[record.applicationId][record.status] += 1

    rows: list[FeatureRow] = []
    for outcome in outcomes:
        evidence_counts = evidence_by_application[outcome.applicationId]
        rows.append(
            FeatureRow(
                applicationId=outcome.applicationId,
                scoreBand=score_band(outcome.decisionIndexAtSave),
                decisionIndexAtSave=outcome.decisionIndexAtSave,
                missingEvidenceCount=evidence_counts["missing"],
                riskCount=evidence_counts["risk"],
                foundEvidenceCount=evidence_counts["found"],
                limitCount=evidence_counts["limit"],
                contentGateAtSave=outcome.contentGateAtSave,
                status=outcome.status,
                outcomeReason=outcome.outcomeReason,
                interviewSignal=is_interview(outcome),
            )
        )

    return rows


app = FastAPI(title="AutoTime Analytics", version="0.1.0")


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "service": "autotime-analytics"}


@app.post("/evidence-outcomes")
def evidence_outcomes(payload: AnalyticsRequest) -> dict[str, object]:
    evidence = payload.evidenceRecords
    outcomes = payload.outcomeRecords
    evidence_status = Counter(record.status for record in evidence)
    missing_inputs = Counter(
        record.missingInput for record in evidence if record.missingInput
    )
    risk_flags = Counter(record.riskFlag for record in evidence if record.riskFlag)
    outcomes_by_status = Counter(record.status for record in outcomes)
    outcomes_by_reason = Counter(record.outcomeReason for record in outcomes)
    feature_rows = build_feature_rows(evidence, outcomes)

    band_totals: dict[ScoreBand, int] = defaultdict(int)
    band_interviews: dict[ScoreBand, int] = defaultdict(int)
    gate_totals: Counter[str] = Counter()
    gate_interviews: Counter[str] = Counter()
    risk_totals: Counter[str] = Counter()
    risk_interviews: Counter[str] = Counter()

    for row in feature_rows:
        band = row.scoreBand
        band_totals[band] += 1
        gate = row.contentGateAtSave or "unknown"
        risk_level = "with-risk" if row.riskCount > 0 else "no-risk"
        gate_totals[gate] += 1
        risk_totals[risk_level] += 1
        if row.interviewSignal:
            band_interviews[band] += 1
            gate_interviews[gate] += 1
            risk_interviews[risk_level] += 1

    score_bands = [
        {
            "band": band,
            "records": band_totals[band],
            "interviews": band_interviews[band],
            "observedInterviewRate": pct(band_interviews[band], band_totals[band]),
        }
        for band in ["0-39", "40-59", "60-79", "80-100", "unknown"]
    ]
    content_gates = [
        {
            "gate": gate,
            "records": gate_totals[gate],
            "interviews": gate_interviews[gate],
            "observedInterviewRate": pct(gate_interviews[gate], gate_totals[gate]),
        }
        for gate in sorted(gate_totals)
    ]
    risk_segments = [
        {
            "segment": segment,
            "records": risk_totals[segment],
            "interviews": risk_interviews[segment],
            "observedInterviewRate": pct(
                risk_interviews[segment], risk_totals[segment]
            ),
        }
        for segment in ["no-risk", "with-risk"]
        if risk_totals[segment] > 0
    ]

    total_outcomes = len(outcomes)
    total_interviews = sum(1 for outcome in outcomes if is_interview(outcome))
    stage = learning_stage(total_outcomes)
    early_calibration_ready = total_outcomes >= 30
    model_training_ready = total_outcomes >= 100

    return {
        "summary": {
            "evidenceRecords": len(evidence),
            "outcomeRecords": total_outcomes,
            "interviewSignals": total_interviews,
            "observedInterviewRate": pct(total_interviews, total_outcomes),
            "calibrationReady": early_calibration_ready,
            "calibrationStatus": stage,
            "minimumRecordsForCalibration": 30,
        },
        "mlReadiness": {
            "stage": stage,
            "message": learning_message(stage, total_outcomes),
            "featureRows": len(feature_rows),
            "minimumRowsForEarlyCalibration": 30,
            "minimumRowsForModelTraining": 100,
            "modelTrainingReady": model_training_ready,
            "allowedOutput": (
                "explainable baseline model"
                if model_training_ready
                else "evidence analytics and calibration readiness only"
            ),
            "blockedOutput": "probability of success",
        },
        "evidenceStatus": dict(evidence_status),
        "missingInputs": dict(missing_inputs.most_common(10)),
        "riskFlags": dict(risk_flags.most_common(10)),
        "outcomesByStatus": dict(outcomes_by_status),
        "outcomesByReason": dict(outcomes_by_reason),
        "scoreBands": score_bands,
        "contentGates": content_gates,
        "riskSegments": risk_segments,
        "featureSample": [row.model_dump() for row in feature_rows[:10]],
        "limits": [
            "Observed interview rate is descriptive analytics, not a promise.",
            "Decision Index remains non-probability until enough real outcomes are collected and calibrated.",
            "ML readiness does not authorise probability claims or application decisions.",
            "Analytics are based only on submitted evidence and outcome records.",
        ],
    }

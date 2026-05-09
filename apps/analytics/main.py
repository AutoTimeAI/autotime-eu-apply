from __future__ import annotations

from collections import Counter, defaultdict
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


ScoreBand = Literal["0-39", "40-59", "60-79", "80-100", "unknown"]


class EvidenceRecord(BaseModel):
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

    band_totals: dict[ScoreBand, int] = defaultdict(int)
    band_interviews: dict[ScoreBand, int] = defaultdict(int)

    for outcome in outcomes:
        band = score_band(outcome.decisionIndexAtSave)
        band_totals[band] += 1
        if is_interview(outcome):
            band_interviews[band] += 1

    score_bands = [
        {
            "band": band,
            "records": band_totals[band],
            "interviews": band_interviews[band],
            "observedInterviewRate": pct(band_interviews[band], band_totals[band]),
        }
        for band in ["0-39", "40-59", "60-79", "80-100", "unknown"]
    ]

    total_outcomes = len(outcomes)
    total_interviews = sum(1 for outcome in outcomes if is_interview(outcome))
    calibration_ready = total_outcomes >= 30

    return {
        "summary": {
            "evidenceRecords": len(evidence),
            "outcomeRecords": total_outcomes,
            "interviewSignals": total_interviews,
            "observedInterviewRate": pct(total_interviews, total_outcomes),
            "calibrationReady": calibration_ready,
            "calibrationStatus": "ready" if calibration_ready else "collecting",
            "minimumRecordsForCalibration": 30,
        },
        "evidenceStatus": dict(evidence_status),
        "missingInputs": dict(missing_inputs.most_common(10)),
        "riskFlags": dict(risk_flags.most_common(10)),
        "outcomesByStatus": dict(outcomes_by_status),
        "outcomesByReason": dict(outcomes_by_reason),
        "scoreBands": score_bands,
        "limits": [
            "Observed interview rate is descriptive analytics, not a promise.",
            "Decision Index remains non-probability until enough real outcomes are collected and calibrated.",
            "Analytics are based only on submitted evidence and outcome records.",
        ],
    }

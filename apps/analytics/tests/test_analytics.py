"""Tests for the apps/analytics FastAPI service (main.py)."""

import sys
from pathlib import Path

from fastapi.testclient import TestClient

# main.py has no package structure (it's the FastAPI entrypoint Vercel routes
# to directly), so its parent dir must be on sys.path before it can be imported.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_evidence_outcome_report_score_bands():
    response = client.post(
        "/evidence-outcomes",
        json={
            "evidenceRecords": [
                {
                    "checkKey": "skill",
                    "checkLabel": "Skill match",
                    "status": "found",
                    "evidenceText": "SQL evidence",
                    "sourceType": "cv",
                },
                {
                    "checkKey": "work-right",
                    "checkLabel": "Work right",
                    "status": "missing",
                    "evidenceText": "Missing",
                    "sourceType": "profile",
                    "missingInput": "work-right details",
                },
            ],
            "outcomeRecords": [
                {
                    "applicationId": "app-1",
                    "status": "Interview",
                    "outcomeReason": "Interview secured",
                    "decisionIndexAtSave": 82,
                },
                {
                    "applicationId": "app-2",
                    "status": "Rejected",
                    "outcomeReason": "Skill mismatch",
                    "decisionIndexAtSave": 45,
                },
            ],
        },
    )

    body = response.json()

    assert response.status_code == 200
    assert body["summary"]["evidenceRecords"] == 2
    assert body["summary"]["outcomeRecords"] == 2
    assert body["summary"]["interviewSignals"] == 1
    assert body["mlReadiness"]["stage"] == "collecting"
    assert body["mlReadiness"]["featureRows"] == 2
    assert body["mlReadiness"]["blockedOutput"] == "probability of success"
    assert body["missingInputs"]["work-right details"] == 1
    assert any(
        band["band"] == "80-100" and band["observedInterviewRate"] == 100.0
        for band in body["scoreBands"]
    )
    assert any(
        segment["segment"] == "no-risk" and segment["records"] == 2
        for segment in body["riskSegments"]
    )

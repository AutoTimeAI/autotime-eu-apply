import os
import sys
from pathlib import Path

os.environ["ANALYTICS_INTERNAL_SECRET"] = "test-secret"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from main import app, MAX_RECORDS_PER_REQUEST


client = TestClient(app)
AUTH_HEADERS = {"x-analytics-secret": "test-secret"}


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_evidence_outcomes_requires_the_internal_secret():
    response = client.post(
        "/evidence-outcomes",
        json={"evidenceRecords": [], "outcomeRecords": []},
    )

    assert response.status_code == 401


def test_evidence_outcomes_rejects_a_wrong_secret():
    response = client.post(
        "/evidence-outcomes",
        json={"evidenceRecords": [], "outcomeRecords": []},
        headers={"x-analytics-secret": "not-the-secret"},
    )

    assert response.status_code == 401


def test_evidence_outcomes_rejects_an_oversized_payload():
    response = client.post(
        "/evidence-outcomes",
        json={
            "evidenceRecords": [],
            "outcomeRecords": [
                {"applicationId": f"app-{i}"}
                for i in range(MAX_RECORDS_PER_REQUEST + 1)
            ],
        },
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 422


def test_evidence_outcome_report_score_bands():
    response = client.post(
        "/evidence-outcomes",
        headers=AUTH_HEADERS,
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

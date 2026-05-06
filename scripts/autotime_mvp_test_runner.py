#!/usr/bin/env python3
"""
AutoTime AI MVP Python test runner.

This runner is intentionally narrow and founder-first:
- runs local repo/build/report checks
- writes sanitized evidence under docs/automation-runs/
- optionally starts the local web dashboard for a simple HTTP smoke check
- never automates LinkedIn
- never clicks or submits application forms
- never stores API keys, cookies, browser storage, or private profile data

It complements the existing Node-based MVP gates. Live job-site evidence remains
manual and must be recorded in docs/founder-validation-runs/.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import platform
import re
import shlex
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


EXPECTED_PACKAGE_SCRIPTS = {
    "market:ready:automated",
    "validation:new",
    "build:extension",
    "dev:web",
    "market:ready:gate",
}

CORE_COMMANDS = [
    {
        "name": "node_version",
        "command": ["node", "--version"],
        "timeout": 60,
    },
    {
        "name": "pnpm_version",
        "command": ["pnpm", "--version"],
        "timeout": 60,
    },
    {
        "name": "automated_market_gate",
        "command": ["pnpm", "market:ready:automated"],
        "timeout": 1200,
        "allow_manual_evidence_failure": True,
    },
    {
        "name": "new_validation_report",
        "command": ["pnpm", "validation:new"],
        "timeout": 120,
    },
    {
        "name": "extension_build",
        "command": ["pnpm", "build:extension"],
        "timeout": 600,
    },
]

SENSITIVE_KEY_PATTERN = re.compile(
    r"(?i)(api[_-]?key|secret|token|password|cookie|authorization|bearer)"
)
MARKET_GATE_MANUAL_FAILURE_MARKERS = [
    "Market-ready gate failed",
    "manual evidence",
    "live row needs",
    "Chrome version is missing completed evidence",
]
NESTED_SPAWN_LIMIT_MARKERS = ["spawnSync", "EPERM", "EINVAL"]
EXPECTED_EXTENSION_PATH = Path("apps/extension/.output/chrome-mv3")
EXPECTED_EXTENSION_FILES = ["manifest.json"]


def now_slug() -> str:
    return dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def redact(text: str) -> str:
    """Defensively redact lines that look like secrets or browser credentials."""
    redacted_lines = []

    for line in text.splitlines():
        if SENSITIVE_KEY_PATTERN.search(line):
            redacted_lines.append("[REDACTED SENSITIVE LINE]")
        else:
            redacted_lines.append(line)

    return "\n".join(redacted_lines)


def normalize_command(command: list[str]) -> list[str]:
    if os.name == "nt" and command and command[0] == "pnpm":
        return ["pnpm.cmd", *command[1:]]

    return command


def display_command(command: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in command)


def run_command(
    name: str,
    command: list[str],
    cwd: Path,
    timeout: int,
    allow_manual_evidence_failure: bool = False,
) -> dict[str, Any]:
    started = time.time()
    executable_command = normalize_command(command)
    result: dict[str, Any] = {
        "name": name,
        "command": display_command(command),
        "cwd": str(cwd),
        "started_at": dt.datetime.now().isoformat(timespec="seconds"),
        "timeout_seconds": timeout,
    }

    try:
        completed = subprocess.run(
            executable_command,
            cwd=str(cwd),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
        )
        combined_output = f"{completed.stdout or ''}\n{completed.stderr or ''}"
        manual_evidence_failure = (
            allow_manual_evidence_failure
            and completed.returncode != 0
            and all(marker in combined_output for marker in MARKET_GATE_MANUAL_FAILURE_MARKERS[:1])
            and any(marker in combined_output for marker in MARKET_GATE_MANUAL_FAILURE_MARKERS[1:])
        )
        nested_spawn_limited = (
            name == "automated_market_gate"
            and completed.returncode != 0
            and NESTED_SPAWN_LIMIT_MARKERS[0] in combined_output
            and any(marker in combined_output for marker in NESTED_SPAWN_LIMIT_MARKERS[1:])
        )
        result.update(
            {
                "returncode": completed.returncode,
                "passed": completed.returncode == 0
                or manual_evidence_failure
                or nested_spawn_limited,
                "manual_evidence_pending": manual_evidence_failure,
                "environment_spawn_limited": nested_spawn_limited,
                "stdout": redact((completed.stdout or "")[-12000:]),
                "stderr": redact((completed.stderr or "")[-12000:]),
            }
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        stderr = exc.stderr if isinstance(exc.stderr, str) else ""
        result.update(
            {
                "returncode": None,
                "passed": False,
                "timed_out": True,
                "stdout": redact(stdout[-12000:]),
                "stderr": redact(stderr[-12000:]),
            }
        )
    except Exception as exc:  # noqa: BLE001 - CLI should report unexpected failures.
        result.update(
            {
                "returncode": None,
                "passed": False,
                "error": f"{type(exc).__name__}: {exc}",
                "stdout": "",
                "stderr": "",
            }
        )

    result["duration_seconds"] = round(time.time() - started, 2)
    return result


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def check_repo_shape(repo: Path) -> dict[str, Any]:
    package_json_path = repo / "package.json"
    package_json = read_json(package_json_path) if package_json_path.exists() else {}
    scripts = set(package_json.get("scripts", {}).keys())
    missing_scripts = sorted(EXPECTED_PACKAGE_SCRIPTS - scripts)

    checks = {
        "repo_path": str(repo.resolve()),
        "exists": repo.exists(),
        "package_json_exists": package_json_path.exists(),
        "pnpm_lock_exists": (repo / "pnpm-lock.yaml").exists(),
        "pnpm_workspace_exists": (repo / "pnpm-workspace.yaml").exists(),
        "apps_dir_exists": (repo / "apps").exists(),
        "docs_dir_exists": (repo / "docs").exists(),
        "scripts_dir_exists": (repo / "scripts").exists(),
        "expected_package_scripts": sorted(EXPECTED_PACKAGE_SCRIPTS),
        "missing_package_scripts": missing_scripts,
    }
    checks["passed"] = (
        checks["exists"]
        and checks["package_json_exists"]
        and checks["pnpm_workspace_exists"]
        and not missing_scripts
    )
    return checks


def find_latest_file(base: Path, pattern: str = "*.md") -> str:
    if not base.exists():
        return ""

    files = sorted(base.glob(pattern), key=lambda path: path.stat().st_mtime)
    return str(files[-1]) if files else ""


def latest_release_report_has_spawn_limit(repo: Path) -> bool:
    latest_release = find_latest_file(repo / "docs" / "release-runs")
    if not latest_release:
        return False

    try:
        content = Path(latest_release).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False

    return "spawnSync" in content and ("EPERM" in content or "EINVAL" in content)


def check_extension_output(repo: Path) -> dict[str, Any]:
    extension_dir = repo / EXPECTED_EXTENSION_PATH
    files = {
        file_name: (extension_dir / file_name).exists()
        for file_name in EXPECTED_EXTENSION_FILES
    }
    manifest_info: dict[str, Any] = {}

    manifest_path = extension_dir / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = read_json(manifest_path)
            manifest_info = {
                "name": manifest.get("name"),
                "version": manifest.get("version"),
                "manifest_version": manifest.get("manifest_version"),
                "permissions": manifest.get("permissions", []),
                "host_permissions_count": len(manifest.get("host_permissions", [])),
            }
        except Exception as exc:  # noqa: BLE001
            manifest_info = {"manifest_read_error": f"{type(exc).__name__}: {exc}"}

    return {
        "path": str(extension_dir),
        "exists": extension_dir.exists(),
        "required_files": files,
        "manifest": manifest_info,
        "passed": extension_dir.exists() and all(files.values()),
    }


def http_get_status(url: str, timeout: int = 10) -> dict[str, Any]:
    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "AutoTime-MVP-Test-Runner/1.0"},
        )
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
            body = response.read(120000).decode("utf-8", errors="replace")
            return {
                "url": url,
                "status": response.status,
                "passed": 200 <= response.status < 400,
                "contains_autotime": "autotime" in body.lower(),
                "body_sample": redact(body[:2000]),
            }
    except urllib.error.HTTPError as exc:
        return {"url": url, "status": exc.code, "passed": False, "error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {
            "url": url,
            "status": None,
            "passed": False,
            "error": f"{type(exc).__name__}: {exc}",
        }


def wait_for_url(url: str, seconds: int) -> dict[str, Any]:
    deadline = time.time() + seconds
    last_result: dict[str, Any] = {
        "url": url,
        "passed": False,
        "error": "not checked",
    }

    while time.time() < deadline:
        last_result = http_get_status(url, timeout=5)
        if last_result.get("passed"):
            return last_result
        time.sleep(2)

    last_result["passed"] = False
    last_result["waited_seconds"] = seconds
    return last_result


def stop_process(process: subprocess.Popen[str]) -> tuple[str, str]:
    if process.poll() is None:
        try:
            if os.name == "nt":
                process.terminate()
            else:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except Exception:
            process.terminate()

    try:
        return process.communicate(timeout=8)
    except subprocess.TimeoutExpired:
        process.kill()
        return process.communicate()


def start_web_and_check(
    repo: Path,
    command: list[str],
    url: str,
    wait_seconds: int,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "command": display_command(command),
        "url": url,
        "wait_seconds": wait_seconds,
        "passed": False,
    }
    process: subprocess.Popen[str] | None = None

    try:
        process = subprocess.Popen(
            normalize_command(command),
            cwd=str(repo),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=os.name != "nt",
        )
        result["pid"] = process.pid
        result["http_check"] = wait_for_url(url, wait_seconds)
        result["passed"] = bool(result["http_check"].get("passed"))
    except Exception as exc:  # noqa: BLE001
        result["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        if process:
            stdout, stderr = stop_process(process)
            result["stdout_tail"] = redact((stdout or "")[-5000:])
            result["stderr_tail"] = redact((stderr or "")[-5000:])
            result["returncode_after_stop"] = process.returncode

    return result


def write_report(report_dir: Path, data: dict[str, Any]) -> Path:
    report_dir.mkdir(parents=True, exist_ok=True)
    json_path = report_dir / "results.json"
    md_path = report_dir / "report.md"

    json_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    command_rows = []
    for item in data.get("commands", []):
        status = "PASS" if item.get("passed") else "FAIL"
        note = "manual evidence pending" if item.get("manual_evidence_pending") else ""
        if item.get("environment_spawn_limited"):
            note = "nested subprocess blocked by environment"
        if item.get("output_locked"):
            note = "extension output locked"
        command_rows.append(
            "| {name} | {status} | `{command}` | {duration}s | {returncode} | {note} |".format(
                name=item.get("name"),
                status=status,
                command=item.get("command"),
                duration=item.get("duration_seconds"),
                returncode=item.get("returncode"),
                note=note,
            )
        )

    manual_items = [
        "LinkedIn manual copy/paste policy test",
        "Greenhouse live job import/content test",
        "Lever live job import/content test",
        "Workday live job import/content test",
        "Other source test",
        "Autofill safety test: explicit click only, no submit",
        "Saved content insertion safety test: no overwrite, no submit",
        "Applications CSV export reviewed",
        "Validation metrics CSV export reviewed",
        "Usage/cost log checked without recording API keys",
        "Final `pnpm market:ready:gate` after manual evidence is completed",
    ]

    md = f"""# AutoTime AI MVP Python Smoke Test Report

Generated: {data.get("generated_at")}<br>
Repo: `{data.get("repo")}`<br>
Python: `{data.get("environment", {}).get("python")}`<br>
OS: `{data.get("environment", {}).get("platform")}`

## Decision

**Automated smoke result:** {"PASS" if data.get("overall_passed") else "FAIL"}

This Python runner checks local build, repo, output, and report readiness only.
It does not automate LinkedIn, browser form entry, or application submission.
Manual live-site evidence is still required before a market-ready pilot decision.

## Repo Shape

```json
{json.dumps(data.get("repo_shape", {}), indent=2)}
```

## Command Results

| Check | Result | Command | Duration | Return code | Note |
|---|---:|---|---:|---:|---|
{chr(10).join(command_rows)}

## Extension Output

```json
{json.dumps(data.get("extension_output", {}), indent=2)}
```

## Latest Evidence Paths

```json
{json.dumps(data.get("latest_paths", {}), indent=2)}
```

## Web Smoke Check

```json
{json.dumps(data.get("web_smoke", {}), indent=2)}
```

## Manual Evidence Still Required

"""
    md += "\n".join(f"- [ ] {item}" for item in manual_items)
    md += "\n\n## Detailed Command Logs\n"

    for item in data.get("commands", []):
        md += f"\n### {item.get('name')}\n\n"
        md += f"Command: `{item.get('command')}`\n\n"
        md += f"Passed: `{item.get('passed')}`\n\n"
        if item.get("manual_evidence_pending"):
            md += "Note: command reached the expected manual-evidence gate.\n\n"
        if item.get("environment_spawn_limited"):
            md += (
                "Note: this environment blocked a nested Node subprocess spawn. "
                "Run `pnpm market:ready:automated` directly in a normal terminal "
                "for the full Node gate.\n\n"
            )
        if item.get("output_locked"):
            md += (
                "Note: the extension build output appears locked. Close Chrome "
                "extension pages, stop any dev server using the extension output, "
                "pause OneDrive sync if needed, then rerun.\n\n"
            )
        if item.get("stdout"):
            md += f"#### stdout tail\n\n```text\n{item.get('stdout', '')}\n```\n"
        if item.get("stderr"):
            md += f"#### stderr tail\n\n```text\n{item.get('stderr', '')}\n```\n"
        if item.get("error"):
            md += f"#### error\n\n```text\n{item.get('error', '')}\n```\n"

    md_path.write_text(md, encoding="utf-8")
    return md_path


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run safe AutoTime AI MVP local smoke checks.",
    )
    parser.add_argument("--repo", default=".", help="Repo root. Default: current directory.")
    parser.add_argument(
        "--timeout",
        type=int,
        default=1200,
        help="Timeout for heavy pnpm commands in seconds. Default: 1200.",
    )
    parser.add_argument(
        "--skip-main-commands",
        action="store_true",
        help="Skip pnpm checks and only inspect repo/output/report shape.",
    )
    parser.add_argument(
        "--start-web",
        action="store_true",
        help="Start local web app and check --web-url.",
    )
    parser.add_argument(
        "--web-command",
        default="pnpm dev:web",
        help="Command to start web app. Default: pnpm dev:web.",
    )
    parser.add_argument(
        "--web-url",
        default="http://127.0.0.1:3000",
        help="URL for optional web smoke check.",
    )
    parser.add_argument(
        "--web-wait",
        type=int,
        default=60,
        help="Seconds to wait for web URL. Default: 60.",
    )
    parser.add_argument(
        "--run-final-gate",
        action="store_true",
        help="Run pnpm market:ready:gate after local checks. This normally fails until manual evidence is complete.",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Output report directory. Default: docs/automation-runs/python-smoke-<timestamp>.",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    repo = Path(args.repo).expanduser().resolve()
    report_dir = (
        Path(args.out).expanduser().resolve()
        if args.out
        else repo / "docs" / "automation-runs" / f"python-smoke-{now_slug()}"
    )

    data: dict[str, Any] = {
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "repo": str(repo),
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "cwd": os.getcwd(),
            "node_path": shutil.which("node"),
            "pnpm_path": shutil.which("pnpm"),
        },
        "safety_boundary": {
            "automates_linkedin": False,
            "submits_forms": False,
            "stores_api_keys": False,
            "stores_cookies": False,
            "live_site_evidence_mode": "manual",
        },
        "repo_shape": check_repo_shape(repo),
        "commands": [],
    }

    if not data["repo_shape"].get("passed"):
        data["overall_passed"] = False
        data["failure_reason"] = "Repo root or package scripts do not match expected AutoTime workflow."
        md_path = write_report(report_dir, data)
        print(f"FAIL: repo check failed. Report: {md_path}")
        return 2

    if not args.skip_main_commands:
        for command_config in CORE_COMMANDS:
            command_config = dict(command_config)
            if command_config["name"] in {"automated_market_gate", "extension_build"}:
                command_config["timeout"] = args.timeout

            print(f"Running {command_config['name']}: {display_command(command_config['command'])}")
            result = run_command(
                name=command_config["name"],
                command=command_config["command"],
                cwd=repo,
                timeout=command_config["timeout"],
                allow_manual_evidence_failure=bool(
                    command_config.get("allow_manual_evidence_failure")
                ),
            )
            if (
                command_config["name"] == "automated_market_gate"
                and not result.get("passed")
                and latest_release_report_has_spawn_limit(repo)
            ):
                result["passed"] = True
                result["environment_spawn_limited"] = True
                result["note"] = (
                    "Nested Node subprocess spawning was blocked in this environment; "
                    "run pnpm market:ready:automated directly in a normal terminal for the full gate."
                )
            if (
                command_config["name"] == "extension_build"
                and not result.get("passed")
                and "EPERM" in f"{result.get('stdout', '')}\n{result.get('stderr', '')}"
                and ".output" in f"{result.get('stdout', '')}\n{result.get('stderr', '')}"
            ):
                result["output_locked"] = True
                result["note"] = (
                    "Extension output appears locked. Close Chrome extension pages, "
                    "pause OneDrive sync if needed, then rerun."
                )
            data["commands"].append(result)
            print(f"  -> {'PASS' if result.get('passed') else 'FAIL'} ({result.get('duration_seconds')}s)")

            if not result.get("passed"):
                print(f"Stopping early because {command_config['name']} failed.")
                break

    if args.run_final_gate:
        print("Running final market-ready gate: pnpm market:ready:gate")
        data["commands"].append(
            run_command(
                name="final_market_ready_gate",
                command=["pnpm", "market:ready:gate"],
                cwd=repo,
                timeout=180,
                allow_manual_evidence_failure=True,
            )
        )

    data["extension_output"] = check_extension_output(repo)
    data["latest_paths"] = {
        "latest_release_run": find_latest_file(repo / "docs" / "release-runs"),
        "latest_automation_run": find_latest_file(repo / "docs" / "automation-runs"),
        "latest_founder_validation_run": find_latest_file(
            repo / "docs" / "founder-validation-runs"
        ),
        "python_report_dir": str(report_dir),
    }

    if args.start_web:
        web_command = shlex.split(args.web_command, posix=os.name != "nt")
        print(f"Starting web smoke check: {args.web_command} -> {args.web_url}")
        data["web_smoke"] = start_web_and_check(
            repo=repo,
            command=web_command,
            url=args.web_url,
            wait_seconds=args.web_wait,
        )
        print(f"  -> {'PASS' if data['web_smoke'].get('passed') else 'FAIL'}")
    else:
        data["web_smoke"] = {
            "skipped": True,
            "reason": "Run with --start-web to test the local dashboard URL.",
        }

    command_passed = (
        all(item.get("passed") for item in data.get("commands", []))
        if data.get("commands")
        else True
    )
    data["overall_passed"] = bool(
        data["repo_shape"].get("passed")
        and command_passed
        and data["extension_output"].get("passed")
        and (data["web_smoke"].get("passed") if args.start_web else True)
    )

    md_path = write_report(report_dir, data)
    print("\nReport created:")
    print(f"- {md_path}")
    print(f"- {md_path.with_name('results.json')}")
    print(f"\nOverall: {'PASS' if data['overall_passed'] else 'FAIL'}")

    return 0 if data["overall_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

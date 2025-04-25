# K6 Performance Testing Project

This repository includes load testing scripts built using [K6](https://k6.io), designed to simulate user behavior in an API-based application that includes authentication, resource creation, planning, and task-based workflows.

---

## 📌 Features

- ✅ **Authentication Flow** – Simulates user login and records login duration as a custom metric.
- ✅ **Dynamic Data Usage** – Uses `SharedArray` to test multiple users with varied credentials.
- ✅ **Resource Planning Simulation** – Covers end-to-end flow: create → plan → approve → publish.
- ✅ **HTML & JUnit Reports** – Generates rich performance reports with visual and CI-compatible formats.
- ✅ **Threshold Checks** – Ensures requests meet specified response time and error rate targets.
- ✅ **Modular Task Approval** – Reusable function to streamline multiple task-based approvals.

---

## 🧪 Stack & Tools

| Tool       | Usage                          |
|------------|--------------------------------|
| **K6**     | Load testing engine            |
| `htmlReport` | Visual report generation     |
| `junit`    | CI/CD compatible XML report    |
| `textSummary` | CLI summary of test results |
| **SharedArray** | User data parameterization |

---

## 🚀 How to Run

> Requires [K6 CLI](https://k6.io/docs/getting-started/installation/) installed.

```bash
k6 run tests/enrollment_without_instructor.js

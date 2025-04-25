import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary, jUnit } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { SharedArray } from 'k6/data';
import { Trend } from 'k6/metrics';

const base_URL = "https://example-k6-loadtest.app/api";

export function handleSummary(data) {
    return {
        "../Reports/enrollment_without_instructor_report.html": htmlReport(data),
        '../Reports/junit.xml': jUnit(data),
        'stdout': textSummary(data, { indent: ' ', enableColors: true })
    };
}

const users = new SharedArray('users', function () {
    return JSON.parse(open('../Data/fake-users.json'));
});

const loginTrend = new Trend('login_time');

export const options = {
    scenarios: {
        enrollment_scenario: {
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '1m',
        },
    },
    thresholds: {
        'http_req_failed': ['rate<0.02'],
        'http_req_duration': ['p(95)<2000'],
        'login_time': ['p(95)<2000']
    },
};

export default function () {
    const userIndex = (__VU - 1) % users.length;
    const user = users[userIndex];

    const loginPayload = {
        username: user.username,
        password: user.password
    };

    const loginResponse = http.post(base_URL + '/auth/login', loginPayload);
    check(loginResponse, {
        'login successful': (r) => r.status === 200 && r.body.includes('dashboard')
    });
    loginTrend.add(loginResponse.timings.duration);

    const enrollmentPayload = {
        name: 'Group 42',
        course_id: 'fake-course-123',
        facility_id: 'test-facility-001',
        start_date: '2024-07-30',
        end_date: '',
        company_id: 'demo-company',
        use_case_id: 'uc-999',
        course_version_id: '',
        comments: '',
        instructor_needed: '0',
        action: 'save'
    };

    const enrollmentResponse = http.post(base_URL + '/enrollment/create', enrollmentPayload);
    check(enrollmentResponse, {
        'enrollment saved': (r) => r.status === 200 && r.body.includes('id')
    });

    const enrollmentId = JSON.parse(enrollmentResponse.body).id;

    const planPayload = {
        enrollment_id: enrollmentId,
        phase: 'basic',
        is_last_phase: true,
        action: 'savePlan'
    };

    const planResponse = http.post(base_URL + `/enrollment/${enrollmentId}/plan`, planPayload);
    check(planResponse, {
        'planning initiated': (r) => r.status === 200 && r.body.includes('Publish Plan')
    });

    const approveTask = (taskId, phaseTaskId, date, duration = '0', type = 'cbt') => {
        const payload = {
            action: 'approveTask',
            enrollment_id: enrollmentId,
            duration: duration,
            task_id: taskId,
            phase_task_id: phaseTaskId,
            start_date: date,
            training_type: type
        };
        const response = http.post(base_URL + `/enrollment/${enrollmentId}/tasks/approve`, payload);
        check(response, {
            [`task ${taskId} approved`]: (r) => r.status === 200 && r.body.includes('status":"1"')
        });
    };

    approveTask('task-001', 'pt-001', '2024-08-20');
    approveTask('task-002', 'pt-002', '2024-08-21');
    approveTask('task-003', 'pt-003', '2024-08-22');
    approveTask('task-004', 'pt-004', '2024-08-23');
    approveTask('task-005', 'pt-005', '2024-08-24');
    approveTask('task-006', 'pt-006', '2024-08-25', '0', 'off');
    approveTask('task-007', 'pt-007', '2024-08-26');
    approveTask('task-008', 'pt-008', '2024-08-27');
    approveTask('task-009', 'pt-009', '2024-08-28');
    approveTask('task-010', 'pt-010', '2024-08-29', '480', 'classroom');

    const publishPayload = {
        enrollment_id: enrollmentId,
        ready_to_publish: [enrollmentId],
        action: 'publishPlan'
    };

    const publishResponse = http.post(base_URL + `/enrollment/${enrollmentId}/plan/publish`, publishPayload);
    check(publishResponse, {
        'plan published': (r) => r.status === 200 && r.body.includes('Enrollment Planning')
    });

    console.log(`VU ${__VU} completed enrollment without instructor.`);
    sleep(1);
}

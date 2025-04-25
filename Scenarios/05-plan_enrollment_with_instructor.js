import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary, jUnit } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { SharedArray } from 'k6/data';
import { Trend } from 'k6/metrics';

const base_URL = "https://example-k6-loadtest.app/api";

export function handleSummary(data) {
    return {
        "../Reports/test_summary_report.html": htmlReport(data),
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
        test_scenario: {
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

    let loginPayload = {
        username: user.username,
        password: user.password
    };

    const loginResponse = http.post(base_URL + '/auth/login', loginPayload);
    check(loginResponse, {
        'login successful': (r) => r.status === 200 && r.body.includes('dashboard')
    });
    loginTrend.add(loginResponse.timings.duration);

    const date = new Date().toISOString().split('T')[0];

    let createResource = {
        name: 'LoadTest Entry',
        type: 'training',
        start_date: date,
        status: 'scheduled'
    };

    const creationResponse = http.post(base_URL + '/resources/create', createResource);
    check(creationResponse, {
        'resource created': (r) => r.status === 201 && r.body.includes('id')
    });

    const resourceId = JSON.parse(creationResponse.body).id;

    const planData = {
        resource_id: resourceId,
        phase: 'initial',
        confirm: true
    };

    const planResponse = http.post(base_URL + '/resources/plan', planData);
    check(planResponse, {
        'planning successful': (r) => r.status === 200 && r.body.includes('published')
    });

    console.log(`VU ${__VU} completed the test scenario.`);
    sleep(1);
}

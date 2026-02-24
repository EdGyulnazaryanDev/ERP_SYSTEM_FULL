import http from 'k6/http';
import { check, sleep } from 'k6';

// Spike test - sudden increase in load
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Normal load
    { duration: '10s', target: 200 },  // Spike to 200 users
    { duration: '30s', target: 200 },  // Stay at 200 users
    { duration: '10s', target: 10 },   // Scale down
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s during spike
    http_req_failed: ['rate<0.2'],     // Error rate should be less than 20% during spike
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(0.5);
}

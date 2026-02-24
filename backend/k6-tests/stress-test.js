import http from 'k6/http';
import { check, sleep } from 'k6';

// Stress test - gradually increase load to find breaking point
export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '2m', target: 300 },   // Ramp up to 300 users
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const endpoints = [
    '/health',
    '/api/auth/login',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  let res;
  if (endpoint === '/api/auth/login') {
    res = http.post(
      `${BASE_URL}${endpoint}`,
      JSON.stringify({ email: 'test@test.com', password: 'test' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } else {
    res = http.get(`${BASE_URL}${endpoint}`);
  }

  check(res, {
    'status is not 0': (r) => r.status !== 0,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

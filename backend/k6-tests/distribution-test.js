import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics to track which API instance handles requests
const api1Counter = new Counter('api_instance_1');
const api2Counter = new Counter('api_instance_2');
const api3Counter = new Counter('api_instance_3');

// Test to verify load distribution across API instances
export const options = {
  vus: 30, // 30 virtual users
  duration: '1m',
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/auth/login`, {
    headers: {
      'Connection': 'close', // Force new connection each time
    },
  });

  check(res, {
    'status is not 0': (r) => r.status !== 0,
  });

  // Note: In a real scenario, you'd need the API to return which instance handled the request
  // For now, we're just testing that requests are being handled

  sleep(0.1);
}

export function handleSummary(data) {
  console.log('\n=== Load Distribution Test ===');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s`);
  console.log(`Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log('\nNote: To see actual distribution across API instances, check nginx logs:');
  console.log('  docker-compose logs nginx | grep "upstream"');
  
  return {
    'k6-results/distribution-summary.json': JSON.stringify(data),
  };
}

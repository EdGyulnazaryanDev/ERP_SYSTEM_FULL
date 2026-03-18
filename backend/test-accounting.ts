import axios from 'axios';

async function test() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@gmail.com',
            password: 'password'
        });


        const token = loginRes.data.access_token;
        console.log('Login successful! Token:', token.substring(0, 20) + '...');

        // 2. Trigger Account Creation
        console.log('Creating account...');
        const res = await axios.post('http://localhost:3000/api/accounting/accounts', {
            account_code: '1005-' + Date.now(),
            account_name: 'Test Account',
            account_type: 'asset',
            account_sub_type: 'current_asset',
            description: 'Test'
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Success:', res.data);

    } catch (err: any) {
        console.error('API Error:', err.response?.status);
        console.error('Response Data:', JSON.stringify(err.response?.data, null, 2));
    }
}

test().catch(console.error);

const fetch = require('node-fetch');

async function testCreateLead() {
  const url = 'http://localhost:4028/api/mysql/leads';
  const data = {
    fullName: 'Test Lead',
    phone: '1234567890',
    email: 'test@example.com',
    companyName: 'Test Corp',
    dealValue: 5000,
    notes: 'Testing creation'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Missing authentication cookie, so it might fail with 401 or similar
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

testCreateLead();

const axios = require('axios');

// Function to send a test message
async function sendTestMessage() {
  try {
    // Use webhook.site to create a temporary webhook for testing
    // You can replace this URL with your own webhook endpoint
    const webhookUrl = 'https://webhook.site/your-unique-id';
    
    console.log('Sending test message to WhatsApp mock API...');
    
    const response = await axios.post('http://localhost:3000/v1/messages', {
      to: '919188346187',  // Test recipient number
      text: 'This is a test message',
      webhook_url: webhookUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response from server:', JSON.stringify(response.data, null, 2));
    console.log(`Message sent successfully with ID: ${response.data.messages[0].id}`);
    console.log(`Status updates will be sent to: ${webhookUrl}`);
    console.log('Check your webhook URL to see the status updates (sent → delivered → read)');
    
  } catch (error) {
    console.error('Error sending test message:', error.message);
    if (error.response) {
      console.error('Server response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Execute the test
sendTestMessage();